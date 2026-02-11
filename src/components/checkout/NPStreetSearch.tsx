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
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

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
      if (!cityRef || q.length < 2) {
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
    debounceRef.current = setTimeout(() => search(val), 300);
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
  }

  if (!cityRef) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
          Вулиця <span className="ml-0.5 text-red">*</span>
        </label>
        <div className="flex h-10 items-center rounded-[10px] border border-[var(--border)] bg-sand/50 px-3 text-sm text-[var(--t3)]">
          Спочатку оберіть місто
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
        <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Почніть вводити назву вулиці..."
          className={`h-10 w-full rounded-[10px] border bg-white pl-9 pr-8 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-colors focus:border-coral/50 ${
            error ? "border-red/50" : selected ? "border-green-400/60 bg-green-50/30" : "border-[var(--border)]"
          }`}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-coral" />
        )}
        {selected && !loading && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-dark">
            <X size={14} />
          </button>
        )}
      </div>

      {error && <p className="mt-1 text-[11px] text-red">{error}</p>}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-[10px] border border-[var(--border)] bg-white shadow-lg">
          {results.map((s) => (
            <button
              key={s.ref}
              onClick={() => handleSelect(s)}
              className="flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left transition-colors last:border-0 hover:bg-coral-light"
            >
              <span className="text-sm text-dark">
                {s.type ? `${s.type} ${s.name}` : s.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
