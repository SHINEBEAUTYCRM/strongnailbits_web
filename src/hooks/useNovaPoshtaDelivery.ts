"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ────── Types ──────

export interface NPCityOption {
  ref: string;
  name: string;
  nameRu?: string;
  area?: string;
  type?: string;
  label?: string;
}

export interface NPWarehouseOption {
  ref: string;
  number: string;
  name: string;
  nameRu?: string;
  shortAddress?: string;
  phone?: string;
  maxWeight?: number;
  category?: string;
}

export type DeliveryMethod = "warehouse" | "postomat" | "address";

export interface DeliverySelection {
  method: DeliveryMethod;
  cityRef: string;
  cityName: string;
  warehouseRef?: string;
  warehouseName?: string;
  address?: string;
  estimatedCost?: number;
  estimatedDate?: string;
}

interface CostInfo {
  cost: number;
  estimatedDate: string;
  redeliveryCost?: number;
}

// ────── Hook ──────

export function useNovaPoshtaDelivery(opts?: {
  onChange?: (selection: DeliverySelection | null) => void;
  orderCost?: number;
  orderWeight?: number;
}) {
  // City state
  const [cities, setCities] = useState<NPCityOption[]>([]);
  const [popularCities, setPopularCities] = useState<NPCityOption[]>([]);
  const [selectedCity, setSelectedCity] = useState<NPCityOption | null>(null);
  const [cityQuery, setCityQuery] = useState("");
  const [cityLoading, setCityLoading] = useState(false);

  // Warehouse state
  const [warehouses, setWarehouses] = useState<NPWarehouseOption[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<NPWarehouseOption | null>(null);
  const [warehouseQuery, setWarehouseQuery] = useState("");
  const [warehouseLoading, setWarehouseLoading] = useState(false);

  // Delivery state
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("warehouse");
  const [address, setAddress] = useState("");
  const [costInfo, setCostInfo] = useState<CostInfo | null>(null);
  const [costLoading, setCostLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for abort controllers
  const cityAbort = useRef<AbortController | null>(null);
  const warehouseAbort = useRef<AbortController | null>(null);
  const costAbort = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load popular cities on mount
  useEffect(() => {
    fetch("/api/nova-poshta/cities?popular=1")
      .then((r) => r.json())
      .then((d) => setPopularCities(d.cities || []))
      .catch(() => {});
  }, []);

  // Auto-detect city via IP
  useEffect(() => {
    if (selectedCity) return;

    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then(async (geo) => {
        if (geo?.city) {
          const res = await fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(geo.city)}&limit=1`);
          const data = await res.json();
          if (data.cities?.[0]) {
            selectCity(data.cities[0]);
          }
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────── City Search ──────

  const searchCity = useCallback((q: string) => {
    setCityQuery(q);
    setError(null);

    if (q.length < 1) {
      setCities([]);
      return;
    }

    // Cancel previous
    cityAbort.current?.abort();
    cityAbort.current = new AbortController();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCityLoading(true);
      try {
        const res = await fetch(
          `/api/nova-poshta/cities?q=${encodeURIComponent(q)}`,
          { signal: cityAbort.current!.signal },
        );
        const data = await res.json();
        setCities(data.cities || []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setCities([]);
      } finally {
        setCityLoading(false);
      }
    }, 250);
  }, []);

  // ────── Select City ──────

  const selectCity = useCallback((city: NPCityOption) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setCities([]);
    setSelectedWarehouse(null);
    setWarehouses([]);
    setCostInfo(null);
    setError(null);

    // Auto-load warehouses
    loadWarehouses(city.ref, deliveryMethod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliveryMethod]);

  // ────── Clear City ──────

  const clearCity = useCallback(() => {
    setSelectedCity(null);
    setCityQuery("");
    setCities([]);
    setSelectedWarehouse(null);
    setWarehouses([]);
    setCostInfo(null);
    opts?.onChange?.(null);
  }, [opts]);

  // ────── Load Warehouses ──────

  const loadWarehouses = useCallback(async (cityRef: string, method: DeliveryMethod) => {
    if (!cityRef || method === "address") return;

    warehouseAbort.current?.abort();
    warehouseAbort.current = new AbortController();

    setWarehouseLoading(true);
    try {
      const type = method === "postomat" ? "postomat" : "branch";
      const res = await fetch(
        `/api/nova-poshta/warehouses?cityRef=${cityRef}&type=${type}`,
        { signal: warehouseAbort.current.signal },
      );
      const data = await res.json();
      setWarehouses(data.warehouses || []);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setWarehouses([]);
    } finally {
      setWarehouseLoading(false);
    }
  }, []);

  // ────── Change Delivery Method ──────

  const changeMethod = useCallback((method: DeliveryMethod) => {
    setDeliveryMethod(method);
    setSelectedWarehouse(null);
    setWarehouseQuery("");
    setCostInfo(null);

    if (selectedCity) {
      loadWarehouses(selectedCity.ref, method);
    }
  }, [selectedCity, loadWarehouses]);

  // ────── Select Warehouse ──────

  const selectWarehouse = useCallback((wh: NPWarehouseOption) => {
    setSelectedWarehouse(wh);
    setWarehouseQuery("");

    // Calculate cost
    if (selectedCity) {
      loadCost(selectedCity.ref, "WarehouseWarehouse");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity]);

  // ────── Clear Warehouse ──────

  const clearWarehouse = useCallback(() => {
    setSelectedWarehouse(null);
    setWarehouseQuery("");
    setCostInfo(null);
  }, []);

  // ────── Load Cost ──────

  const loadCost = useCallback(async (cityRef: string, serviceType: string) => {
    costAbort.current?.abort();
    costAbort.current = new AbortController();

    setCostLoading(true);
    try {
      const params = new URLSearchParams({
        cityRef,
        weight: String(opts?.orderWeight || 1),
        cost: String(opts?.orderCost || 300),
        serviceType,
      });
      const res = await fetch(`/api/nova-poshta/calculate?${params}`, {
        signal: costAbort.current.signal,
      });
      const data = await res.json();
      if (data.cost) {
        setCostInfo({
          cost: data.cost,
          estimatedDate: data.estimatedDate || "",
          redeliveryCost: data.redeliveryCost,
        });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") setCostInfo(null);
    } finally {
      setCostLoading(false);
    }
  }, [opts?.orderWeight, opts?.orderCost]);

  // ────── Set Address (for address delivery) ──────

  const setDeliveryAddress = useCallback((addr: string) => {
    setAddress(addr);

    if (selectedCity && addr.length > 3) {
      loadCost(selectedCity.ref, "WarehouseDoors");
    }
  }, [selectedCity, loadCost]);

  // ────── Filtered warehouses (client-side) ──────

  const filteredWarehouses = warehouseQuery
    ? warehouses.filter((w) => {
        const q = warehouseQuery.toLowerCase();
        const num = parseInt(warehouseQuery, 10);
        if (!isNaN(num) && String(num) === warehouseQuery.trim()) {
          return w.number === String(num);
        }
        return w.name.toLowerCase().includes(q) || w.shortAddress?.toLowerCase().includes(q);
      })
    : warehouses;

  // ────── Build selection & call onChange ──────

  useEffect(() => {
    if (!selectedCity) {
      opts?.onChange?.(null);
      return;
    }

    const selection: DeliverySelection = {
      method: deliveryMethod,
      cityRef: selectedCity.ref,
      cityName: selectedCity.name,
      estimatedCost: costInfo?.cost,
      estimatedDate: costInfo?.estimatedDate,
    };

    if (deliveryMethod === "address") {
      if (address) selection.address = address;
    } else if (selectedWarehouse) {
      selection.warehouseRef = selectedWarehouse.ref;
      selection.warehouseName = selectedWarehouse.name;
    }

    opts?.onChange?.(selection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedWarehouse, deliveryMethod, address, costInfo]);

  return {
    // City
    cities,
    popularCities,
    selectedCity,
    cityQuery,
    cityLoading,
    searchCity,
    selectCity,
    clearCity,

    // Warehouse
    warehouses: filteredWarehouses,
    allWarehouses: warehouses,
    selectedWarehouse,
    warehouseQuery,
    setWarehouseQuery,
    warehouseLoading,
    selectWarehouse,
    clearWarehouse,

    // Delivery
    deliveryMethod,
    changeMethod,
    address,
    setDeliveryAddress,

    // Cost
    costInfo,
    costLoading,

    // Error
    error,
    setError,
  };
}
