"use client";
import { useState, useTransition } from "react";
import { Search, Loader2, X } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function AdminSearch({ placeholder = "Пошук..." }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") || "");
  const [isPending, startTransition] = useTransition();

  const update = (val: string) => {
    setQuery(val);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) { params.set("search", val); } else { params.delete("search"); }
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  return (
    <div className="relative w-full max-w-sm">
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#7c3aed" }} /> : <Search className="w-4 h-4" style={{ color: "#52525b" }} />}
      </div>
      <input type="text" value={query} onChange={(e) => update(e.target.value)} placeholder={placeholder}
        className="w-full pl-9 pr-8 py-2 rounded-xl text-sm outline-none transition-colors"
        style={{ background: "#111116", border: "1px solid #1e1e2a", color: "#e4e4e7" }}
      />
      {query && (
        <button onClick={() => update("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "#52525b" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
