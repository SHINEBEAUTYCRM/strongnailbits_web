"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Package, Loader2, X, Search, ChevronDown, Building2, MailboxIcon } from "lucide-react";

interface Warehouse {
  id: number;
  number: string;
  name: string;
  shortName: string;
  address: string;
  category: string;
}

type TabType = "branch" | "postomat";

interface Props {
  cityName: string;
  cityRef: string;
  value: string;
  warehouseRef: string;
  onSelect: (wh: { id: number; name: string; number: string; category: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPWarehouseSelect({
  cityName,
  value,
  warehouseRef,
  onSelect,
  onClear,
  error,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabType>("branch");
  const [query, setQuery] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [branchCount, setBranchCount] = useState(0);
  const [postomatCount, setPostomatCount] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load warehouses when city or tab changes
  useEffect(() => {
    if (!cityName) {
      setWarehouses([]);
      setBranchCount(0);
      setPostomatCount(0);
      return;
    }
    loadWarehouses("").then(() => {
      if (!warehouseRef) setOpen(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityName, activeTab]);

  // Load counts for both tabs when city changes
  useEffect(() => {
    if (!cityName) return;
    fetchCount("branch").then(setBranchCount);
    fetchCount("postomat").then(setPostomatCount);
  }, [cityName]);

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

  async function fetchCount(type: TabType): Promise<number> {
    try {
      const params = new URLSearchParams({ city: cityName, type, limit: "1" });
      const res = await fetch(`/api/nova-poshta/warehouses?${params}`);
      const data = await res.json();
      return data.totalInCity ?? data.total ?? 0;
    } catch (err) {
      console.error('[NPWarehouse] Count fetch failed:', err);
      return 0;
    }
  }

  const loadWarehouses = useCallback(
    async (search: string) => {
      if (!cityName) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ city: cityName, type: activeTab, limit: "500" });
        if (search) params.set("q", search);
        const res = await fetch(`/api/nova-poshta/warehouses?${params}`);
        const data = await res.json();
        setWarehouses(data.warehouses || []);
        // Update count for active tab
        const count = data.totalInCity ?? data.total ?? 0;
        if (activeTab === "branch") setBranchCount(count);
        else setPostomatCount(count);
      } catch (err) {
        console.error('[NPWarehouse] Search failed:', err);
        setWarehouses([]);
      } finally {
        setLoading(false);
      }
    },
    [cityName, activeTab],
  );

  function handleTabChange(tab: TabType) {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setQuery("");
    setWarehouses([]);
    if (warehouseRef) onClear();
    setOpen(true);
  }

  function handleSearch(val: string) {
    setQuery(val);
    if (warehouseRef) onClear();
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadWarehouses(val), 250);
  }

  function handleSelect(wh: Warehouse) {
    onSelect({ id: wh.id, name: wh.name, number: wh.number, category: wh.category || activeTab });
    setQuery("");
    setOpen(false);
  }

  function handleClearSelection() {
    onClear();
    setQuery("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  const placeholder = activeTab === "postomat"
    ? "Пошук поштомату (номер або адреса)"
    : "Пошук відділення (номер або адреса)";

  if (!cityName) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          Відділення / Поштомат <span className="ml-0.5 text-red">*</span>
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
          Відділення / Поштомат <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-[10px] border border-green-400/60 bg-green-50/30 px-3 py-2.5">
          <Package size={14} className="shrink-0 text-green-600" />
          <span className="flex-1 text-sm font-medium text-dark leading-snug">{value}</span>
          <button
            type="button"
            onClick={handleClearSelection}
            className="shrink-0 rounded-full p-0.5 text-[var(--t3)] transition-colors hover:bg-black/5 hover:text-dark"
            aria-label="Змінити"
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
        Відділення / Поштомат <span className="ml-0.5 text-red">*</span>
      </label>

      {/* Tabs */}
      <div className="mb-2 flex gap-1 rounded-[10px] border border-[var(--border)] bg-sand/40 p-0.5">
        <button
          type="button"
          onClick={() => handleTabChange("branch")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-medium transition-all ${
            activeTab === "branch"
              ? "bg-white text-dark shadow-sm"
              : "text-[var(--t3)] hover:text-[var(--t2)]"
          }`}
        >
          <Building2 size={13} />
          <span>Відділення</span>
          {branchCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
              activeTab === "branch" ? "bg-coral/10 text-coral" : "bg-black/5 text-[var(--t3)]"
            }`}>
              {branchCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("postomat")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-medium transition-all ${
            activeTab === "postomat"
              ? "bg-white text-dark shadow-sm"
              : "text-[var(--t3)] hover:text-[var(--t2)]"
          }`}
        >
          <MailboxIcon size={13} />
          <span>Поштомат</span>
          {postomatCount > 0 && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
              activeTab === "postomat" ? "bg-coral/10 text-coral" : "bg-black/5 text-[var(--t3)]"
            }`}>
              {postomatCount}
            </span>
          )}
        </button>
      </div>

      {/* Search input */}
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
              {activeTab === "postomat" ? (
                <MailboxIcon size={12} className="mt-0.5 shrink-0 text-purple-400" />
              ) : (
                <Building2 size={12} className="mt-0.5 shrink-0 text-coral/50" />
              )}
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
          <p className="mt-1.5 text-xs text-[var(--t3)]">
            {activeTab === "postomat" ? "Завантажуємо поштомати..." : "Завантажуємо відділення..."}
          </p>
        </div>
      )}

      {/* No results */}
      {open && !loading && warehouses.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-xl">
          <p className="text-sm text-[var(--t3)]">
            {query
              ? (activeTab === "postomat" ? "Поштоматів не знайдено" : "Відділень не знайдено")
              : (activeTab === "postomat" ? "Немає поштоматів у цьому місті" : "Немає відділень у цьому місті")
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
