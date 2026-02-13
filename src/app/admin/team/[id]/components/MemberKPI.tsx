"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, X } from "lucide-react";
import type { TeamKPI } from "@/types/team";
import { KPI_PRESETS } from "@/lib/admin/team-config";

interface MemberKPIProps {
  memberId: string;
  memberRole: string;
  isCeo: boolean;
}

export function MemberKPI({ memberId, memberRole, isCeo }: MemberKPIProps) {
  const [kpis, setKpis] = useState<TeamKPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newMetric, setNewMetric] = useState("");
  const [newTarget, setNewTarget] = useState("");

  const currentPeriod = new Date().toISOString().slice(0, 7); // "2026-02"
  const presets = KPI_PRESETS[memberRole] || [];

  useEffect(() => {
    loadKPI();
  }, [memberId]);

  const loadKPI = async () => {
    try {
      const res = await fetch(`/api/admin/team/${memberId}/kpi`);
      if (res.ok) {
        const data = await res.json();
        setKpis(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newMetric.trim()) return;
    try {
      const res = await fetch(`/api/admin/team/${memberId}/kpi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: currentPeriod,
          metric: newMetric.trim(),
          target: newTarget ? Number(newTarget) : null,
          actual: 0,
        }),
      });
      if (res.ok) {
        const item = await res.json();
        setKpis((prev) => [item, ...prev]);
        setNewMetric("");
        setNewTarget("");
        setShowAdd(false);
      }
    } catch { /* ignore */ }
  };

  const handleUpdateActual = async (kpi: TeamKPI, actual: number) => {
    try {
      await fetch(`/api/admin/team/${memberId}/kpi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kpi_id: kpi.id, actual }),
      });
      setKpis((prev) => prev.map((k) => (k.id === kpi.id ? { ...k, actual } : k)));
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#52525b" }} />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-medium" style={{ color: "#71717a" }}>
          Період: <span style={{ color: "#d4d4d8", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>{currentPeriod}</span>
        </span>
        {isCeo && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg transition-colors"
            style={{ color: "#a855f7", background: "rgba(168,85,247,0.08)" }}
          >
            {showAdd ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showAdd ? "Скасувати" : "Додати KPI"}
          </button>
        )}
      </div>

      {/* Add form */}
      {showAdd && (
        <div
          className="rounded-lg p-3 mb-4"
          style={{ background: "rgba(168,85,247,0.05)", border: "1px solid rgba(168,85,247,0.15)" }}
        >
          {/* Presets */}
          {presets.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setNewMetric(p)}
                  className="text-[10px] px-2 py-0.5 rounded transition-colors"
                  style={{
                    background: newMetric === p ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.03)",
                    color: newMetric === p ? "#a855f7" : "#71717a",
                    border: `1px solid ${newMetric === p ? "rgba(168,85,247,0.3)" : "transparent"}`,
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newMetric}
              onChange={(e) => setNewMetric(e.target.value)}
              placeholder="Назва метрики"
              className="flex-1 px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: "#111116", border: "1px solid rgba(255,255,255,0.06)", color: "#d4d4d8" }}
            />
            <input
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="План"
              type="number"
              className="w-20 px-2 py-1.5 rounded text-xs outline-none"
              style={{ background: "#111116", border: "1px solid rgba(255,255,255,0.06)", color: "#d4d4d8" }}
            />
            <button
              onClick={handleAdd}
              disabled={!newMetric.trim()}
              className="px-3 py-1.5 rounded text-xs font-medium text-white disabled:opacity-40"
              style={{ background: "#7c3aed" }}
            >
              Додати
            </button>
          </div>
        </div>
      )}

      {/* KPI table */}
      {kpis.length === 0 ? (
        <p className="text-xs text-center py-8" style={{ color: "#52525b" }}>
          KPI ще не додано
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {kpis.map((kpi) => {
            const pct = kpi.target ? Math.min(100, ((kpi.actual || 0) / kpi.target) * 100) : 0;
            const completed = pct >= 100;

            return (
              <div
                key={kpi.id}
                className="rounded-lg px-3 py-2.5"
                style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "#d4d4d8" }}>
                    {kpi.metric}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                    {kpi.period}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: completed ? "#22c55e" : "#a855f7",
                        opacity: 0.7,
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-mono shrink-0" style={{ fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                    {isCeo ? (
                      <input
                        type="number"
                        defaultValue={kpi.actual ?? ""}
                        onBlur={(e) => handleUpdateActual(kpi, Number(e.target.value) || 0)}
                        className="w-12 text-right bg-transparent border-none outline-none"
                        style={{ color: completed ? "#22c55e" : "#d4d4d8" }}
                      />
                    ) : (
                      <span style={{ color: completed ? "#22c55e" : "#d4d4d8" }}>
                        {kpi.actual ?? 0}
                      </span>
                    )}
                    <span style={{ color: "#52525b" }}>/</span>
                    <span style={{ color: "#71717a" }}>{kpi.target ?? "—"}</span>
                    <span
                      className="ml-1 text-[10px]"
                      style={{ color: completed ? "#22c55e" : pct > 70 ? "#f59e0b" : "#71717a" }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
