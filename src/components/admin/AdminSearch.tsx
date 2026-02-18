"use client";
import { useState, useTransition, useRef, useCallback } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AdminSearch({ placeholder = "Пошук..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const pushSearch = useCallback((val: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) { params.set("search", val); } else { params.delete("search"); }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [searchParams, pathname, router]);

  const update = (val: string) => {
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushSearch(val), 300);
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--a-accent-btn)" }} /> : <Search className="w-4 h-4" style={{ color: "var(--a-text-4)" }} />}
      </div>
      <input type="text" value={query} onChange={(e) => update(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-xl text-sm outline-none transition-colors"
        style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
      />
      {query && (
        <button onClick={() => update("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--a-text-4)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
