"use client";

// ================================================================
//  Settings > Integrations — Головна сторінка інтеграцій
//  47 сервісів, згруповані по категоріях
// ================================================================

import { useState, useEffect, useCallback } from "react";
import { Plug, RefreshCw, Search } from "lucide-react";
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

export function IntegrationsPageClient() {
  const [statuses, setStatuses] = useState<IntegrationStatusItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, verified: 0, withErrors: 0 });

  // Завантажити статуси
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations/status");
      const json = await res.json();
      if (json.data) {
        setStatuses(json.data);
        setStats(json.stats);
      }
    } catch (err) {
      console.error('[Integrations] Stats fetch failed:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  // Фільтрувати сервіси
  const filteredServices = SERVICE_REGISTRY.filter(service => {
    if (selectedCategory !== "all" && service.category !== selectedCategory) {
      return false;
    }
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

  // Кількість по категоріях
  const categoryCounts: Record<string, number> = {};
  for (const service of SERVICE_REGISTRY) {
    categoryCounts[service.category] = (categoryCounts[service.category] || 0) + 1;
  }

  // Групувати по категоріях
  const groupedServices: { category: ServiceCategory; label: string; services: typeof filteredServices }[] = [];

  if (selectedCategory === "all") {
    for (const cat of SERVICE_CATEGORY_ORDER) {
      const services = filteredServices.filter(s => s.category === cat);
      if (services.length > 0) {
        groupedServices.push({
          category: cat,
          label: SERVICE_CATEGORY_LABELS[cat],
          services,
        });
      }
    }
  } else {
    groupedServices.push({
      category: selectedCategory,
      label: SERVICE_CATEGORY_LABELS[selectedCategory],
      services: filteredServices,
    });
  }

  // Знайти статус по slug
  const getStatus = (slug: string) => statuses.find(s => s.slug === slug);

  // Знайти обраний сервіс
  const selectedServiceDef = selectedService
    ? SERVICE_REGISTRY.find(s => s.slug === selectedService)
    : null;

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
              {SERVICE_REGISTRY.length} сервісів — налаштуйте API-ключі
            </p>
          </div>
        </div>

        <button
          onClick={() => { setLoading(true); fetchStatuses(); }}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors disabled:opacity-50"
          style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Оновити
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MiniStat label="Всього" value={stats.total} />
        <MiniStat label="Активних" value={stats.active} color="emerald" />
        <MiniStat label="Верифіковано" value={stats.verified} color="purple" />
        <MiniStat label="З помилками" value={stats.withErrors} color="red" />
      </div>

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
          onSaved={() => fetchStatuses()}
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "emerald" | "purple" | "red";
}) {
  const valueColor = color
    ? { emerald: "text-emerald-400", purple: "text-purple-400", red: "text-red-400" }[color]
    : "text-[var(--a-text)]";

  return (
    <div className="p-3 rounded-xl" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--a-text-3)" }}>{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${valueColor}`}>{value}</p>
    </div>
  );
}
