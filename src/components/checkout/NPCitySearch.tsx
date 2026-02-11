"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X } from "lucide-react";

interface City {
  ref: string;
  name: string;
  area: string;
  region: string;
  type: string;
}

interface Props {
  value: string;
  cityRef: string;
  onSelect: (city: { ref: string; name: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPCitySearch({ value, cityRef, onSelect, onClear, error }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

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

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.cities || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(val: string) {
    setQuery(val);
    if (cityRef) {
      onClear();
    }
    setOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  }

  function handleSelect(city: City) {
    setQuery(city.name);
    onSelect({ ref: city.ref, name: city.name });
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    onClear();
    setResults([]);
  }

  return (
    <div ref={wrapperRef} className="relative">
      <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
        Місто <span className="ml-0.5 text-red">*</span>
      </label>
      <div className="relative">
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Почніть вводити назву міста..."
          className={`h-10 w-full rounded-[10px] border bg-white pl-9 pr-8 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-colors focus:border-coral/50 ${
            error ? "border-red/50" : cityRef ? "border-green-400/60 bg-green-50/30" : "border-[var(--border)]"
          }`}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        )}
        {cityRef && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-dark"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red">{error}</p>
      )}

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[10px] border border-[var(--border)] bg-white shadow-lg">
          {results.map((city) => (
            <button
              key={city.ref}
              onClick={() => handleSelect(city)}
              className="flex w-full flex-col gap-0.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral-light"
            >
              <span className="text-sm font-medium text-dark">{city.name}</span>
              <span className="text-[11px] text-[var(--t3)]">
                {[city.type, city.area, city.region].filter(Boolean).join(", ")}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
