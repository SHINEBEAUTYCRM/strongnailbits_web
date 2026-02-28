"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Package, Loader2 } from "lucide-react";

interface NpWarehouse {
  name_ua: string;
  short_name: string;
  number: string;
  address: string;
  category: string;
}

interface NpWarehouseSearchProps {
  value: string;
  cityName: string;
  onChange: (warehouseName: string) => void;
  placeholder?: string;
}

export function NpWarehouseSearch({
  value,
  cityName,
  onChange,
  placeholder = "Номер або назва відділення...",
}: NpWarehouseSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NpWarehouse[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    if (!cityName) {
      setResults([]);
      setQuery("");
    }
  }, [cityName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!cityName) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const supabase = createClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let qb: any = supabase
          .from("np_warehouses")
          .select("name_ua, short_name, number, address, category")
          .eq("city_name", cityName)
          .eq("is_active", true);

        if (q.length > 0) {
          const isNum = /^\d+$/.test(q);
          if (isNum) {
            qb = qb.eq("number", q);
          } else {
            qb = qb.or(
              `name_ua.ilike.%${q}%,short_name.ilike.%${q}%,address.ilike.%${q}%`,
            );
          }
        }

        const { data } = await qb.order("number").limit(15);
        setResults(data || []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [cityName],
  );

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleFocus = () => {
    if (results.length > 0) setIsOpen(true);
    else if (cityName) search(query);
  };

  const handleSelect = (wh: NpWarehouse) => {
    const name = wh.short_name || wh.name_ua;
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Package
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          placeholder={!cityName ? "Спочатку оберіть місто" : placeholder}
          disabled={!cityName}
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white pl-10 pr-8 text-sm text-dark outline-none transition-colors focus:border-coral disabled:cursor-not-allowed disabled:bg-[var(--bg-soft)]"
        />
        {loading && (
          <Loader2
            size={16}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-[var(--t3)]"
          />
        )}
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-[var(--t3)]">
              Не знайдено
            </div>
          ) : (
            results.map((wh, i) => (
              <button
                key={`${wh.number}-${i}`}
                type="button"
                onClick={() => handleSelect(wh)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors hover:bg-coral/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-dark">
                      №{wh.number}
                    </span>
                    {wh.category && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          wh.category === "Postomat"
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {wh.category === "Postomat" ? "Поштомат" : "Відділення"}
                      </span>
                    )}
                  </div>
                  {wh.address && (
                    <span className="line-clamp-1 text-xs text-[var(--t3)]">
                      {wh.address}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
