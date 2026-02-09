"use client";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

export function ExportButton({ entity, label = "Експорт CSV" }: { entity: string; label?: string }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/export?entity=${entity}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] || `${entity}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50"
      style={{ background: "#111116", color: "#a1a1aa", border: "1px solid #1e1e2a" }}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
      {label}
    </button>
  );
}
