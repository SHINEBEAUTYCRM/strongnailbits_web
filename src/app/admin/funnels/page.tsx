"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Filter,
  Plus,
  RefreshCw,
  Users,
  TrendingUp,
  Target,
  ChevronRight,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface FunnelStage {
  id: string;
  name: string;
  slug: string;
  position: number;
  color: string | null;
}

interface Funnel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  icon: string;
  is_active: boolean;
  is_default: boolean;
  stages: FunnelStage[];
  stageCounts: Record<string, number>;
  totalContacts: number;
  convertedContacts: number;
  conversionRate: string;
}

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFunnels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/funnels");
      const json = await res.json();
      if (json.data) setFunnels(json.data);
    } catch {
      // silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchFunnels();
  }, [fetchFunnels]);

  // Total stats
  const totalContacts = funnels.reduce((s, f) => s + f.totalContacts, 0);
  const totalConverted = funnels.reduce((s, f) => s + f.convertedContacts, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <Filter size={20} className="text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">SmartЛійки</h1>
            <p className="text-sm text-gray-400">
              Воронки продажів та конверсій
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFunnels}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-sm text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RefreshCw size={14} />
            Оновити
          </button>
          <button className="flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white transition-colors hover:bg-indigo-500">
            <Plus size={14} />
            Нова лійка
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          icon={<Filter size={18} />}
          label="Активних лійок"
          value={funnels.filter((f) => f.is_active).length.toString()}
          color="#6366f1"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Контактів у лійках"
          value={totalContacts.toString()}
          color="#3b82f6"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Конвертовано"
          value={totalConverted.toString()}
          color="#10b981"
        />
      </div>

      {/* Funnels */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      ) : funnels.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#13131a] p-12 text-center">
          <Filter size={40} className="mx-auto mb-3 text-gray-600" />
          <p className="text-gray-400">
            Лійки ще не створені. Виконайте SQL-схему для створення шаблонних
            воронок.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {funnels.map((funnel) => (
            <FunnelCard key={funnel.id} funnel={funnel} />
          ))}
        </div>
      )}
    </div>
  );
}

// ────── Funnel Card ──────

function FunnelCard({ funnel }: { funnel: Funnel }) {
  const maxCount = Math.max(
    ...funnel.stages.map((s) => funnel.stageCounts[s.id] || 0),
    1,
  );

  return (
    <div className="rounded-2xl border border-white/5 bg-[#13131a] p-5 transition-all hover:border-white/10">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${funnel.color}20` }}
          >
            <Target size={18} style={{ color: funnel.color }} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{funnel.name}</h3>
            {funnel.description && (
              <p className="text-xs text-gray-500">{funnel.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold text-white">
              {funnel.conversionRate}%
            </p>
            <p className="text-[10px] uppercase text-gray-500">Конверсія</p>
          </div>
          <Link
            href={`/admin/funnels/${funnel.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Visual funnel stages */}
      <div className="flex items-center gap-1">
        {funnel.stages.map((stage, i) => {
          const count = funnel.stageCounts[stage.id] || 0;
          const width = Math.max(
            ((count / maxCount) * 100),
            15,
          );
          const isLast = i === funnel.stages.length - 1;

          return (
            <div key={stage.id} className="flex items-center" style={{ flex: 1 }}>
              <div className="w-full">
                {/* Stage bar */}
                <div className="relative mb-1 overflow-hidden rounded-md" style={{ height: 32 }}>
                  <div
                    className="flex h-full items-center justify-center rounded-md px-2 transition-all"
                    style={{
                      backgroundColor: stage.color
                        ? `${stage.color}25`
                        : "#1e1e2e",
                      width: `${width}%`,
                      minWidth: "100%",
                      borderLeft: `3px solid ${stage.color || "#6366f1"}`,
                    }}
                  >
                    <span className="truncate text-xs font-medium text-white/80">
                      {stage.name}
                    </span>
                  </div>
                </div>
                {/* Count */}
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: stage.color || "#94a3b8" }}
                  >
                    {count}
                  </span>
                  {i > 0 && count > 0 && (
                    <span className="text-[10px] text-gray-500">
                      {(
                        (count /
                          (funnel.stageCounts[funnel.stages[0].id] || 1)) *
                        100
                      ).toFixed(0)}
                      %
                    </span>
                  )}
                </div>
              </div>
              {!isLast && (
                <ArrowRight
                  size={14}
                  className="mx-0.5 shrink-0 text-gray-600"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom stats */}
      <div className="mt-3 flex items-center gap-4 border-t border-white/5 pt-3 text-xs text-gray-500">
        <span>
          <Users size={12} className="mr-1 inline" />
          {funnel.totalContacts} контактів
        </span>
        <span>
          <TrendingUp size={12} className="mr-1 inline" />
          {funnel.convertedContacts} конвертовано
        </span>
        <span>{funnel.stages.length} етапів</span>
        {!funnel.is_active && (
          <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-red-400">
            Неактивна
          </span>
        )}
      </div>
    </div>
  );
}

// ────── Stat Card ──────

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#13131a] p-4">
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
