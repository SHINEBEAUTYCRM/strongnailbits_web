"use client";

import { Truck, CreditCard, Receipt, Send, MessageSquare, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { IntegrationStatusItem } from "@/lib/integrations/types";

interface HealthItem {
  service_slug: string;
  status: string;
  response_time_ms: number | null;
  last_check_at: string | null;
  consecutive_failures: number;
}

interface Props {
  statuses: IntegrationStatusItem[];
  health: HealthItem[];
  onCardClick: (slug: string) => void;
}

const OPERATIONAL_SERVICES: { slug: string; name: string; icon: LucideIcon }[] = [
  { slug: 'nova-poshta', name: 'Нова Пошта', icon: Truck },
  { slug: 'liqpay', name: 'LiqPay', icon: CreditCard },
  { slug: 'checkbox', name: 'Checkbox ПРРО', icon: Receipt },
  { slug: 'telegram-bot', name: 'Telegram Bot', icon: Send },
  { slug: 'turbosms', name: 'TurboSMS', icon: MessageSquare },
  { slug: 'google-analytics', name: 'Google Analytics', icon: BarChart3 },
];

export function OperationalIntegrations({ statuses, health, onCardClick }: Props) {
  const getStatus = (slug: string) => statuses.find(s => s.slug === slug);
  const getHealth = (slug: string) => health.find(h => h.service_slug === slug);

  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--a-text-3)" }}>
        Операційні інтеграції
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {OPERATIONAL_SERVICES.map(svc => {
          const st = getStatus(svc.slug);
          const h = getHealth(svc.slug);
          const isConnected = st?.isActive && st?.hasConfig;
          const healthStatus = h?.status || (isConnected ? 'unknown' : 'none');

          // Determine dot color and label
          let dotColor = '#6b7280'; // gray
          let statusLabel = 'Не підключено';
          if (isConnected) {
            if (healthStatus === 'healthy') { dotColor = '#22c55e'; statusLabel = 'Здоровий'; }
            else if (healthStatus === 'degraded') { dotColor = '#f59e0b'; statusLabel = 'Проблеми'; }
            else if (healthStatus === 'down') { dotColor = '#ef4444'; statusLabel = 'Не відповідає'; }
            else { dotColor = '#22c55e'; statusLabel = 'Підключено'; }
          }

          const Icon = svc.icon;

          return (
            <button
              key={svc.slug}
              onClick={() => onCardClick(svc.slug)}
              className="flex items-center gap-4 p-4 rounded-xl text-left transition-all hover:border-purple-500/40"
              style={{
                background: "var(--a-bg-card)",
                border: "1px solid var(--a-border)",
              }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: isConnected ? `${dotColor}15` : "var(--a-bg-hover)",
                }}
              >
                <Icon className="w-5 h-5" style={{ color: isConnected ? dotColor : "var(--a-text-3)" }} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "var(--a-text)" }}>{svc.name}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotColor }} />
                  <span className="text-[11px]" style={{ color: "var(--a-text-3)" }}>{statusLabel}</span>
                  {h?.response_time_ms && (
                    <span className="text-[10px] ml-auto" style={{ color: "var(--a-text-4)" }}>
                      {h.response_time_ms}ms
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
