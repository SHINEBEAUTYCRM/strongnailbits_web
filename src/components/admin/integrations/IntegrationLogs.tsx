"use client";

// ================================================================
//  IntegrationLogs — Таблиця логів інтеграції
// ================================================================

import { useState, useEffect } from "react";
import type { IntegrationLogRow } from "@/lib/integrations/types";

interface IntegrationLogsProps {
  slug: string;
}

export function IntegrationLogs({ slug }: IntegrationLogsProps) {
  const [logs, setLogs] = useState<IntegrationLogRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      try {
        const res = await fetch(`/api/integrations/logs?slug=${slug}&limit=20`);
        const json = await res.json();
        setLogs(json.data || []);
      } catch {
        setLogs([]);
      }
      setLoading(false);
    }
    fetchLogs();
  }, [slug]);

  if (loading) {
    return (
      <div className="py-8 text-center text-[var(--a-text-3)] text-sm">
        Завантаження логів...
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--a-text-4)] text-sm">
        Логів ще немає
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {logs.map(log => (
        <div
          key={log.id}
          className="flex items-start gap-3 p-3 rounded-lg bg-[var(--a-bg)] border border-[var(--a-border)]"
        >
          {/* Status dot */}
          <div className="mt-1.5 flex-shrink-0">
            <div
              className={`w-2 h-2 rounded-full ${
                log.status === "success"
                  ? "bg-emerald-400"
                  : log.status === "error"
                  ? "bg-red-400"
                  : log.status === "warning"
                  ? "bg-amber-400"
                  : "bg-zinc-500"
              }`}
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-[var(--a-text-body)]">{log.action}</span>
              {log.duration_ms && (
                <span className="text-[10px] text-[var(--a-text-4)]">{log.duration_ms}ms</span>
              )}
            </div>
            {log.message && (
              <p className="text-[11px] text-[var(--a-text-3)] mt-0.5 truncate">{log.message}</p>
            )}
          </div>

          {/* Time */}
          <span className="text-[10px] text-[var(--a-text-4)] flex-shrink-0">
            {formatTime(log.created_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return "щойно";
    if (diff < 3600000) return `${Math.floor(diff / 60000)} хв тому`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} год тому`;

    return date.toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}
