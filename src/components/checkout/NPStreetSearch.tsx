"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, X } from "lucide-react";

interface Street {
  ref: string;
  name: string;
  type: string;
}

interface Props {
  cityRef: string;
  value: string;
  onSelect: (street: { ref: string; name: string }) => void;
  onClear: () => void;
  error?: string;
}

export function NPStreetSearch({ cityRef, value, onSelect, onClear, error }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Street[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(!!value);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setQuery(value);
    setSelected(!!value);
  }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const search = useCallback(
    async (q: string) => {
      if (!cityRef || q.length < 1) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/nova-poshta/streets?cityRef=${cityRef}&q=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        setResults(data.streets || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [cityRef],
  );

  function handleInput(val: string) {
    setQuery(val);
    setSelected(false);
    if (value) onClear();
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 250);
  }

  function handleSelect(street: Street) {
    const fullName = street.type ? `${street.type} ${street.name}` : street.name;
    setQuery(fullName);
    setSelected(true);
    onSelect({ ref: street.ref, name: fullName });
    setOpen(false);
    setResults([]);
  }

  function handleClear() {
    setQuery("");
    setSelected(false);
    onClear();
    setResults([]);
    inputRef.current?.focus();
  }

  if (!cityRef) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          Вулиця <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex h-11 items-center gap-2 rounded-[10px] border border-dashed border-[var(--border)] bg-sand/30 px-3 text-sm text-[var(--t3)]">
          Спочатку оберіть місто
        </div>
      </div>
    );
  }

  // Selected state — show as badge
  if (selected && value) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          Вулиця <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex items-center gap-2 rounded-[10px] border border-green-400/60 bg-green-50/30 px-3 py-2.5">
          <MapPin size={14} className="shrink-0 text-green-600" />
          <span className="flex-1 text-sm font-medium text-dark">{value}</span>
          <button
            type="button"
            onClick={handleClear}
            className="shrink-0 rounded-full p-0.5 text-[var(--t3)] transition-colors hover:bg-black/5 hover:text-dark"
            aria-label="Змінити вулицю"
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
        Вулиця <span className="ml-0.5 text-red">*</span>
      </label>
      <div className="relative">
        <MapPin size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Введіть назву вулиці"
          autoComplete="off"
          className={`h-11 w-full rounded-[10px] border bg-white pl-9 pr-9 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-all focus:border-coral/50 focus:ring-2 focus:ring-coral/10 ${
            error ? "border-red/50" : "border-[var(--border)]"
          }`}
        />
        {loading && (
          <Loader2 size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        )}
      </div>

      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white shadow-xl">
          {results.map((s) => (
            <button
              key={s.ref}
              type="button"
              onClick={() => handleSelect(s)}
              className="flex w-full items-center gap-2.5 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral/5 active:bg-coral/10"
            >
              <MapPin size={12} className="shrink-0 text-coral/50" />
              <span className="text-sm text-dark">
                {s.type ? `${s.type} ${s.name}` : s.name}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {open && !loading && results.length === 0 && query.length >= 1 && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-4 text-center shadow-xl">
          <p className="text-sm text-[var(--t3)]">Вулицю не знайдено</p>
          <p className="mt-1 text-[11px] text-[var(--t3)]/60">Спробуйте інший варіант написання</p>
        </div>
      )}
    </div>
  );
}
