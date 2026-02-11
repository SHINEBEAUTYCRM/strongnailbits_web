"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Package, Loader2, X, Search } from "lucide-react";

interface Warehouse {
  ref: string;
  number: string;
  name: string;
  shortAddress: string;
  maxWeight: number;
  category: string;
}

interface Props {
  cityRef: string;
  type: "warehouse" | "parcel";
  value: string;
  warehouseRef: string;
  onSelect: (wh: { ref: string; name: string; number: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPWarehouseSelect({
  cityRef,
  type,
  value,
  warehouseRef,
  onSelect,
  onClear,
  error,
}: Props) {
  const [query, setQuery] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load warehouses when city changes
  useEffect(() => {
    if (!cityRef) {
      setWarehouses([]);
      return;
    }
    loadWarehouses("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityRef, type]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadWarehouses = useCallback(
    async (search: string) => {
      if (!cityRef) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          cityRef,
          type,
          limit: "50",
        });
        if (search) params.set("q", search);

        const res = await fetch(`/api/nova-poshta/warehouses?${params}`);
        const data = await res.json();
        setWarehouses(data.warehouses || []);
      } catch {
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    },
    [cityRef, type],
  );

  function handleSearch(val: string) {
    setQuery(val);
    if (warehouseRef) onClear();

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadWarehouses(val), 300);
  }

  function handleSelect(wh: Warehouse) {
    onSelect({ ref: wh.ref, name: wh.name, number: wh.number });
    setQuery("");
    setOpen(false);
  }

  function handleClearSelection() {
    onClear();
    setQuery("");
  }

  const label = type === "parcel" ? "Поштомат" : "Відділення";
  const placeholder = type === "parcel"
    ? "Пошук поштомату (номер або адреса)..."
    : "Пошук відділення (номер або адреса)...";

  if (!cityRef) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          {label} <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-sand/50 px-3 text-sm text-[var(--t3)]">
          Спочатку оберіть місто
        </div>
      </div>
    );
  }

  // Selected state
  if (warehouseRef && value) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          {label} <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-[10px] border border-green-400/60 bg-green-50/30 px-3 py-2.5">
          <Package size={14} className="shrink-0 text-green-600" />
          <span className="flex-1 text-sm text-dark">{value}</span>
          <button
            onClick={handleClearSelection}
            className="shrink-0 text-[var(--t3)] hover:text-dark"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
        {label} <span className="ml-0.5 text-red">*</span>
      </label>

      {/* Search input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`h-10 w-full rounded-[10px] border bg-white pl-9 pr-8 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-colors focus:border-coral/50 ${
            error ? "border-red/50" : "border-[var(--border)]"
          }`}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red">{error}</p>
      )}

      {/* Dropdown */}
      {open && warehouses.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[10px] border border-[var(--border)] bg-white shadow-lg">
          {warehouses.map((wh) => (
            <button
              key={wh.ref}
              onClick={() => handleSelect(wh)}
              className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral-light"
            >
              <span className="text-sm font-medium text-dark">{wh.name}</span>
              <span className="text-[11px] text-[var(--t3)]">{wh.shortAddress}</span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && !loading && warehouses.length === 0 && query.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-3 text-center text-sm text-[var(--t3)] shadow-lg">
          {type === "parcel" ? "Поштоматів не знайдено" : "Відділень не знайдено"}
        </div>
      )}
    </div>
  );
}
