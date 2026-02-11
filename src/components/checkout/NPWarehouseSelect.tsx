"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Package, Loader2, X, Search, ChevronDown } from "lucide-react";

interface Warehouse {
  id: number;
  number: string;
  name: string;
  shortName: string;
  address: string;
  category: string;
}

interface Props {
  cityName: string;
  cityRef: string; // kept for backwards compat, not used for warehouse search
  type: "warehouse" | "parcel";
  value: string;
  warehouseRef: string;
  onSelect: (wh: { id: number; name: string; number: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPWarehouseSelect({
  cityName,
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
  const [totalCount, setTotalCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load warehouses when city changes — auto-open dropdown
  useEffect(() => {
    if (!cityName) {
      setWarehouses([]);
      setTotalCount(0);
      return;
    }
    loadWarehouses("").then(() => {
      if (!warehouseRef) {
        setOpen(true);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName, type]);

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
      if (!cityName) return;
      setLoading(true);
      try {
        const npType = type === "parcel" ? "postomat" : "branch";
        const params = new URLSearchParams({ city: cityName, type: npType, limit: "200" });
        if (search) params.set("q", search);
        const res = await fetch(`/api/nova-poshta/warehouses?${params}`);
        const data = await res.json();
        setWarehouses(data.warehouses || []);
        setTotalCount(data.total || 0);
      } catch {
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    },
    [cityName, type],
  );

  function handleSearch(val: string) {
    setQuery(val);
    if (warehouseRef) onClear();
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadWarehouses(val), 250);
  }

  function handleSelect(wh: Warehouse) {
    onSelect({ id: wh.id, name: wh.name, number: wh.number });
    setQuery("");
    setOpen(false);
  }

  function handleClearSelection() {
    onClear();
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const label = type === "parcel" ? "Поштомат" : "Відділення";
  const placeholder = type === "parcel"
    ? "Пошук поштомату (номер або адреса)"
    : "Пошук відділення (номер або адреса)";

  if (!cityName) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          {label} <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex h-11 items-center gap-2 rounded-[10px] border border-dashed border-[var(--border)] bg-sand/30 px-3 text-sm text-[var(--t3)]">
          Спочатку оберіть місто
        </div>
      </div>
    );
  }

  // Selected state — show as badge
  if (warehouseRef && value) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          {label} <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-[10px] border border-green-400/60 bg-green-50/30 px-3 py-2.5">
          <Package size={14} className="shrink-0 text-green-600" />
          <span className="flex-1 text-sm font-medium text-dark leading-snug">{value}</span>
          <button
            type="button"
            onClick={handleClearSelection}
            className="shrink-0 rounded-full p-0.5 text-[var(--t3)] transition-colors hover:bg-black/5 hover:text-dark"
            aria-label="Змінити відділення"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 flex items-baseline justify-between text-xs font-medium text-[var(--t2)]">
        <span>{label} <span className="ml-0.5 text-red">*</span></span>
        {totalCount > 0 && (
          <span className="text-[10px] font-normal text-[var(--t3)]">
            {totalCount} {type === "parcel" ? "поштоматів" : "відділень"}
          </span>
        )}
      </label>

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`h-11 w-full rounded-[10px] border bg-white pl-9 pr-9 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-all focus:border-coral/50 focus:ring-2 focus:ring-coral/10 ${
            error ? "border-red/50" : "border-[var(--border)]"
          }`}
        />
        {loading ? (
          <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        ) : (
          <ChevronDown
            size={14}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}

      {/* Dropdown */}
      {open && !loading && warehouses.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-xl">
          {warehouses.map((wh) => (
            <button
              key={wh.id}
              type="button"
              onClick={() => handleSelect(wh)}
              className="flex w-full items-start gap-2.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral/5 active:bg-coral/10"
            >
              <Package size={12} className="mt-0.5 shrink-0 text-coral/50" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug text-dark">{wh.name}</p>
                <p className="mt-0.5 text-[11px] text-[var(--t3)]">{wh.address}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {open && loading && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-xl">
          <Loader2 size={16} className="mx-auto animate-spin text-coral" />
          <p className="mt-1.5 text-xs text-[var(--t3)]">Завантажуємо відділення...</p>
        </div>
      )}

      {/* No results */}
      {open && !loading && warehouses.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-xl">
          <p className="text-sm text-[var(--t3)]">
            {query
              ? (type === "parcel" ? "Поштоматів не знайдено" : "Відділень не знайдено")
              : "Немає відділень у цьому місті"
            }
          </p>
          {query && (
            <p className="mt-1 text-[11px] text-[var(--t3)]/60">Спробуйте інший номер або адресу</p>
          )}
        </div>
      )}
    </div>
  );
}
