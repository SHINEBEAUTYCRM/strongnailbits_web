"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MapPin, Loader2 } from "lucide-react";

interface NpCity {
  ref: string;
  name_ua: string;
  area_ua: string;
  settlement_type: string;
}

interface NpCitySearchProps {
  value: string;
  onChange: (cityName: string, cityRef: string) => void;
  placeholder?: string;
}

export function NpCitySearch({
  value,
  onChange,
  placeholder = "Почніть вводити місто...",
}: NpCitySearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NpCity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("np_cities")
        .select("ref, name_ua, area_ua, settlement_type")
        .ilike("name_ua", `${q}%`)
        .eq("has_delivery", true)
        .order("name_ua")
        .limit(10);
      setResults(data || []);
      setIsOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (city: NpCity) => {
    setQuery(city.name_ua);
    onChange(city.name_ua, city.ref);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <MapPin
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white pl-10 pr-8 text-sm text-dark outline-none transition-colors focus:border-coral"
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
            results.map((city) => (
              <button
                key={city.ref}
                type="button"
                onClick={() => handleSelect(city)}
                className="flex w-full flex-col px-3 py-2.5 text-left transition-colors hover:bg-coral/5"
              >
                <span className="text-sm font-medium text-dark">{city.name_ua}</span>
                {city.area_ua && (
                  <span className="text-xs text-[var(--t3)]">{city.area_ua} обл.</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
