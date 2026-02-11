"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, Square, Eye, EyeOff, Trash2, X, Loader2 } from "lucide-react";

interface ProductBulkBarProps {
  productIds: string[];
}

export function ProductBulkBar({ productIds }: ProductBulkBarProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) =>
      prev.size === productIds.length ? new Set() : new Set(productIds),
    );
  }, [productIds]);

  const runBulk = useCallback(
    async (action: "enable" | "disable" | "delete") => {
      if (action === "delete" && !confirm(`Видалити ${selected.size} товарів?`)) return;
      setLoading(true);
      try {
        const res = await fetch("/api/admin/products/bulk", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: Array.from(selected), action }),
        });
        if (res.ok) {
          setSelected(new Set());
          router.refresh();
        }
      } catch {
        // silent
      }
      setLoading(false);
    },
    [selected, router],
  );

  return (
    <>
      {/* Checkbox column injector — render checkboxes via portal-like approach */}
      <div className="hidden" data-bulk-bar>
        {/* Master checkbox state */}
        <span data-checked={selected.size === productIds.length && productIds.length > 0 ? "all" : selected.size > 0 ? "some" : "none"} />
      </div>

      {/* Inline checkboxes for each row */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={toggleAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
          style={{
            background: selected.size > 0 ? "#1e1030" : "#111116",
            color: selected.size > 0 ? "#c084fc" : "#71717a",
            border: selected.size > 0 ? "1px solid #581c87" : "1px solid #1e1e2a",
          }}
        >
          {selected.size === productIds.length && productIds.length > 0 ? (
            <CheckSquare className="w-3.5 h-3.5" />
          ) : (
            <Square className="w-3.5 h-3.5" />
          )}
          {selected.size > 0
            ? `Обрано ${selected.size}`
            : "Виділити все"}
        </button>

        {selected.size > 0 && (
          <>
            <button
              onClick={() => runBulk("enable")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#052e16", color: "#4ade80", border: "1px solid #16a34a40" }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
              Увімкнути
            </button>
            <button
              onClick={() => runBulk("disable")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#18181b", color: "#71717a", border: "1px solid #27272a" }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <EyeOff className="w-3 h-3" />}
              Вимкнути
            </button>
            <button
              onClick={() => runBulk("delete")}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: "#450a0a", color: "#f87171", border: "1px solid #dc262640" }}
            >
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
              Видалити
            </button>
            <button
              onClick={() => setSelected(new Set())}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
              style={{ color: "#52525b" }}
            >
              <X className="w-3 h-3" />
            </button>
          </>
        )}
      </div>

      {/* Render checkboxes next to each row */}
      {productIds.map((id) => (
        <input
          key={id}
          type="checkbox"
          data-product-check={id}
          checked={selected.has(id)}
          onChange={() => toggle(id)}
          className="hidden"
        />
      ))}
    </>
  );
}

/** Small checkbox to put inline in each table row */
export function ProductCheckbox({
  id,
  checked,
  onChange,
}: {
  id: string;
  checked: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(id);
      }}
      className="flex h-5 w-5 items-center justify-center rounded transition-colors"
      style={
        checked
          ? { background: "#7c3aed", border: "1px solid #7c3aed" }
          : { background: "#111116", border: "1px solid #27272a" }
      }
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}
