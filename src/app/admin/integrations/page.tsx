"use client";

// ================================================================
//  /admin/integrations — Дашборд інтеграцій
//  Health Overview + Операційні + Всі сервіси
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { Plug, RefreshCw, Search, Activity } from "lucide-react";
import { SERVICE_REGISTRY } from "@/lib/integrations/registry";
import {
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_ORDER,
  type ServiceCategory,
  type IntegrationStatusItem,
} from "@/lib/integrations/types";
import { IntegrationCard } from "@/components/admin/integrations/IntegrationCard";
import { IntegrationModal } from "@/components/admin/integrations/IntegrationModal";
import { CategoryFilter } from "@/components/admin/integrations/CategoryFilter";
import { OperationalIntegrations } from "@/components/admin/integrations/OperationalIntegrations";
import Link from "next/link";

interface HealthItem {
  service_slug: string;
  status: string;
  response_time_ms: number | null;
  last_check_at: string | null;
  consecutive_failures: number;
}

interface EventStats {
  outbox: { pending: number; failed: number; sent: number; dead: number };
  inbox: { received: number; processed: number; failed: number };
  deliveries: { total: number; success: number; failed: number; avgDurationMs: number };
}

export default function IntegrationsDashboard() {
  const [statuses, setStatuses] = useState<IntegrationStatusItem[]>([]);
  const [health, setHealth] = useState<HealthItem[]>([]);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0, withErrors: 0 });

  // Fetch all data
  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, healthRes, eventStatsRes] = await Promise.all([
        fetch("/api/integrations/status"),
        fetch("/api/integrations/health"),
        fetch("/api/integrations/events/stats"),
      ]);

      const statusJson = await statusRes.json();
      if (statusJson.data) {
        setStatuses(statusJson.data);
        setStats(statusJson.stats);
      }

      const healthJson = await healthRes.json();
      setHealth(healthJson.data || []);

      const eventStatsJson = await eventStatsRes.json();
      setEventStats(eventStatsJson);
    } catch (err) {
      console.error("[Integrations] Fetch failed:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Filter services
  const filteredServices = SERVICE_REGISTRY.filter(service => {
    if (selectedCategory !== "all" && service.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        service.name.toLowerCase().includes(q) ||
        service.slug.toLowerCase().includes(q) ||
        service.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Category counts
  const categoryCounts: Record<string, number> = {};
  for (const service of SERVICE_REGISTRY) {
    categoryCounts[service.category] = (categoryCounts[service.category] || 0) + 1;
  }

  // Grouped services
  const groupedServices: { category: ServiceCategory; label: string; services: typeof filteredServices }[] = [];
  if (selectedCategory === "all") {
    for (const cat of SERVICE_CATEGORY_ORDER) {
      const services = filteredServices.filter(s => s.category === cat);
      if (services.length > 0) {
        groupedServices.push({ category: cat, label: SERVICE_CATEGORY_LABELS[cat], services });
      }
    }
  } else {
    groupedServices.push({
      category: selectedCategory,
      label: SERVICE_CATEGORY_LABELS[selectedCategory],
      services: filteredServices,
    });
  }

  const getStatus = (slug: string) => statuses.find(s => s.slug === slug);

  const selectedServiceDef = selectedService
    ? SERVICE_REGISTRY.find(s => s.slug === selectedService)
    : null;

  // Health overview counts
  const healthyCount = health.filter(h => h.status === "healthy").length;
  const problemsCount = health.filter(h => h.status === "degraded" || h.status === "down").length;
  const sentEvents = eventStats?.outbox.sent ?? 0;
  const failedEvents = (eventStats?.outbox.failed ?? 0) + (eventStats?.outbox.dead ?? 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Plug className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--a-text)" }}>Інтеграції</h1>
            <p className="text-sm" style={{ color: "var(--a-text-2)" }}>
              {SERVICE_REGISTRY.length} сервісів — дашборд здоров&apos;я та налаштування
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/integrations/events"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
          >
            <Activity className="w-3.5 h-3.5" />
            Журнал подій
          </Link>
          <button
            onClick={() => { setLoading(true); fetchAll(); }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Оновити
          </button>
        </div>
      </div>

      {/* Health Overview — 4 metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard label="Підключено" value={`${stats.active} з ${stats.total}`} color="emerald" />
        <MetricCard label="Здорові" value={String(healthyCount)} color="emerald" />
        <MetricCard label="Проблеми" value={String(problemsCount)} color={problemsCount > 0 ? "red" : "emerald"} />
        <MetricCard
          label="Події 24г"
          value={`${sentEvents} sent / ${failedEvents} failed`}
          color={failedEvents > 0 ? "yellow" : "emerald"}
        />
      </div>

      {/* Operational Integrations */}
      <OperationalIntegrations
        statuses={statuses}
        health={health}
        onCardClick={(slug) => setSelectedService(slug)}
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--a-text-3)" }} />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Пошук сервісу..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder:text-zinc-600 focus:border-purple-500 focus:outline-none transition-colors"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
        />
      </div>

      {/* Category Filter */}
      <CategoryFilter
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        counts={categoryCounts}
      />

      {/* Services Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: "var(--a-text-3)" }}>
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3" style={{ color: "var(--a-text-4)" }} />
          Завантаження статусів...
        </div>
      ) : (
        <div className="space-y-8">
          {groupedServices.map(group => (
            <div key={group.category}>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--a-text-3)" }}>
                {group.label}
                <span className="ml-2" style={{ color: "var(--a-text-4)" }}>{group.services.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {group.services.map(service => (
                  <IntegrationCard
                    key={service.slug}
                    service={service}
                    status={getStatus(service.slug)}
                    onClick={() => setSelectedService(service.slug)}
                  />
                ))}
              </div>
            </div>
          ))}

          {filteredServices.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: "var(--a-text-3)" }}>
              Сервісів не знайдено
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedServiceDef && (
        <IntegrationModal
          service={selectedServiceDef}
          status={getStatus(selectedServiceDef.slug)}
          isOpen={!!selectedService}
          onClose={() => setSelectedService(null)}
          onSaved={() => fetchAll()}
        />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: "emerald" | "purple" | "red" | "yellow";
}) {
  const valueColor = color
    ? { emerald: "text-emerald-400", purple: "text-purple-400", red: "text-red-400", yellow: "text-yellow-400" }[color]
    : "text-[var(--a-text)]";

  return (
    <div className="p-3 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  );
}
