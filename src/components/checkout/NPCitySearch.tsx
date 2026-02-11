"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X, ChevronDown, Navigation } from "lucide-react";

interface City {
  ref: string;
  deliveryCityRef?: string;
  name: string;
  area: string;
  region: string;
  type: string;
  warehouses?: string;
}

interface Props {
  value: string;
  cityRef: string;
  onSelect: (city: { ref: string; name: string; deliveryCityRef?: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPCitySearch({ value, cityRef, onSelect, onClear, error }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [popular, setPopular] = useState<City[]>([]);
  const [loading, setLoading] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync external value
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Load popular cities on mount
  useEffect(() => {
    fetch("/api/nova-poshta/cities?popular=1")
      .then((r) => r.json())
      .then((d) => setPopular(d.cities || []))
      .catch(() => {});
  }, []);

  // Auto-detect city on mount (via IP geolocation)
  useEffect(() => {
    if (cityRef) return; // already selected

    setDetecting(true);
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) })
      .then((r) => r.json())
      .then(async (geo) => {
        if (geo?.city) {
          const res = await fetch(`/api/nova-poshta/cities?q=${encodeURIComponent(geo.city)}&limit=1`);
          const data = await res.json();
          if (data.cities?.[0]) {
            const c = data.cities[0];
            onSelect({ ref: c.ref, name: c.name, deliveryCityRef: c.deliveryCityRef });
          }
        }
      })
      .catch(() => {})
      .finally(() => setDetecting(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (q.length < 1) {
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
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(city: City) {
    setQuery(city.name);
    onSelect({ ref: city.ref, name: city.name, deliveryCityRef: city.deliveryCityRef });
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    onClear();
    setResults([]);
    inputRef.current?.focus();
  }

  function handleFocus() {
    if (!cityRef) {
      setOpen(true);
    }
  }

  const showPopular = open && !loading && results.length === 0 && query.length === 0 && popular.length > 0;
  const showResults = open && results.length > 0;
  const showNoResults = open && !loading && results.length === 0 && query.length >= 1;

  // Selected state — show as a badge
  if (cityRef && value) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          Місто <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-[10px] border border-green-400/60 bg-green-50/30 px-3 py-2.5">
          <MapPin size={14} className="shrink-0 text-green-600" />
          <span className="flex-1 text-sm font-medium text-dark">{value}</span>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-full p-0.5 text-[var(--t3)] transition-colors hover:bg-black/5 hover:text-dark"
            aria-label="Змінити місто"
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
        Місто <span className="ml-0.5 text-red">*</span>
      </label>
      <div className="relative">
        <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={handleFocus}
          placeholder={detecting ? "Визначаємо місто..." : "Введіть назву міста"}
          autoComplete="off"
          className={`h-11 w-full rounded-[10px] border bg-white pl-9 pr-9 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-all focus:border-coral/50 focus:ring-2 focus:ring-coral/10 ${
            error ? "border-red/50" : "border-[var(--border)]"
          }`}
        />
        {(loading || detecting) && (
          <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        )}
        {!loading && !detecting && !cityRef && (
          <ChevronDown
            size={14}
            className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </div>

      {error && (
        <p className="mt-1 text-[11px] text-red">{error}</p>
      )}

      {/* Dropdown */}
      {(showPopular || showResults || showNoResults) && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto overflow-x-hidden rounded-xl border border-[var(--border)] bg-white shadow-xl">
          {/* Popular cities header */}
          {showPopular && (
            <>
              <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-[var(--border)] bg-sand/60 px-3 py-2">
                <Navigation size={11} className="text-coral" />
                <span className="text-[11px] font-medium text-[var(--t2)]">Популярні міста</span>
              </div>
              {popular.map((city) => (
                <button
                  key={city.ref}
                  type="button"
                  onClick={() => handleSelect(city)}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-coral/5 active:bg-coral/10"
                >
                  <MapPin size={12} className="shrink-0 text-coral/60" />
                  <span className="text-sm font-medium text-dark">{city.name}</span>
                  <span className="ml-auto text-[11px] text-[var(--t3)]">{city.area}</span>
                </button>
              ))}
            </>
          )}

          {/* Search results */}
          {showResults && results.map((city) => (
            <button
              key={city.ref}
              type="button"
              onClick={() => handleSelect(city)}
              className="flex w-full items-start gap-2.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral/5 active:bg-coral/10"
            >
              <MapPin size={12} className="mt-0.5 shrink-0 text-coral/60" />
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-dark">{city.name}</span>
                {(city.area || city.type) && (
                  <span className="ml-1.5 text-[11px] text-[var(--t3)]">
                    {[city.type, city.area, city.region].filter(Boolean).join(", ")}
                  </span>
                )}
              </div>
            </button>
          ))}

          {/* No results */}
          {showNoResults && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-[var(--t3)]">Місто не знайдено</p>
              <p className="mt-1 text-[11px] text-[var(--t3)]/60">Спробуйте інший варіант написання</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
