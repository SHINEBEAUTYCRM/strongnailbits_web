"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, RefreshCw, ChevronDown, RotateCcw } from "lucide-react";

interface EventRow {
  id: string;
  topic: string;
  status: string;
  payload: Record<string, unknown>;
  attempts?: number;
  target_slug?: string;
  provider_slug?: string;
  created_at?: string;
  received_at?: string;
  last_error?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: "#6b728020", text: "#9ca3af" },
  processing: { bg: "#3b82f620", text: "#60a5fa" },
  sent:       { bg: "#22c55e20", text: "#4ade80" },
  processed:  { bg: "#22c55e20", text: "#4ade80" },
  received:   { bg: "#3b82f620", text: "#60a5fa" },
  failed:     { bg: "#f59e0b20", text: "#fbbf24" },
  dead:       { bg: "#ef444420", text: "#f87171" },
};

export default function EventLogPage() {
  const [direction, setDirection] = useState<"outbox" | "inbox">("outbox");
  const [statusFilter, setStatusFilter] = useState("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchEvents = useCallback(async (reset = false) => {
    setLoading(true);
    const offset = reset ? 0 : events.length;
    const params = new URLSearchParams({
      direction,
      limit: "50",
      offset: String(offset),
    });
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/integrations/events?${params}`);
      const json = await res.json();
      if (reset) {
        setEvents(json.data || []);
      } else {
        setEvents(prev => [...prev, ...(json.data || [])]);
      }
      setTotal(json.total || 0);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [direction, statusFilter, events.length]);

  useEffect(() => {
    fetchEvents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction, statusFilter]);

  const handleRetry = async (eventId: string) => {
    setRetrying(eventId);
    try {
      await fetch("/api/integrations/events/retry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      fetchEvents(true);
    } catch {
      // ignore
    }
    setRetrying(null);
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("uk-UA", {
      day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  };

  const outboxStatuses = ["", "pending", "processing", "sent", "failed", "dead"];
  const inboxStatuses = ["", "received", "processing", "processed", "failed"];
  const filterStatuses = direction === "outbox" ? outboxStatuses : inboxStatuses;
  const filterLabels: Record<string, string> = {
    "": "Всі", pending: "Pending", processing: "Processing",
    sent: "Sent", processed: "Processed", received: "Received",
    failed: "Failed", dead: "Dead",
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <Activity className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>Журнал подій</h1>
          <p className="text-xs" style={{ color: "var(--a-text-3)" }}>Event Bus — вхідні та вихідні події інтеграцій</p>
        </div>
      </div>

      {/* Direction tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        {(["outbox", "inbox"] as const).map(d => (
          <button
            key={d}
            onClick={() => { setDirection(d); setStatusFilter(""); }}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${
              direction === d ? "bg-purple-500/20 text-purple-400" : "text-[var(--a-text-3)] hover:text-[var(--a-text-2)]"
            }`}
          >
            {d === "outbox" ? "Вихідні (outbox)" : "Вхідні (inbox)"}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-1.5">
        {filterStatuses.map(s => {
          const colors = s ? STATUS_COLORS[s] : null;
          const isActive = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
              style={{
                background: isActive ? (colors?.bg || "var(--a-accent-btn)") : "var(--a-bg-card)",
                color: isActive ? (colors?.text || "#fff") : "var(--a-text-3)",
                border: `1px solid ${isActive ? "transparent" : "var(--a-border)"}`,
              }}
            >
              {filterLabels[s] || s}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--a-border)" }}>
        {/* Head */}
        <div
          className="grid gap-3 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            background: "var(--a-bg-card)",
            color: "var(--a-text-4)",
            gridTemplateColumns: direction === "outbox" ? "100px 1fr 120px 80px 60px 60px" : "100px 1fr 120px 80px",
          }}
        >
          <span>Час</span>
          <span>Топік</span>
          <span>{direction === "outbox" ? "Сервіс" : "Провайдер"}</span>
          <span>Статус</span>
          {direction === "outbox" && <span>Спроби</span>}
          {direction === "outbox" && <span></span>}
        </div>

        {/* Rows */}
        {events.length === 0 && !loading ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--a-text-3)" }}>
            Подій не знайдено
          </div>
        ) : (
          events.map(ev => {
            const colors = STATUS_COLORS[ev.status] || { bg: "#6b728020", text: "#9ca3af" };
            const isExpanded = expandedId === ev.id;
            const time = direction === "outbox" ? ev.created_at : ev.received_at;
            const slug = direction === "outbox" ? ev.target_slug : ev.provider_slug;
            const canRetry = direction === "outbox" && (ev.status === "failed" || ev.status === "dead");

            return (
              <div key={ev.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                  className="w-full grid gap-3 px-4 py-2.5 text-left text-xs transition-colors hover:bg-[var(--a-bg-hover)]"
                  style={{
                    borderTop: "1px solid var(--a-border)",
                    color: "var(--a-text-2)",
                    gridTemplateColumns: direction === "outbox" ? "100px 1fr 120px 80px 60px 60px" : "100px 1fr 120px 80px",
                  }}
                >
                  <span className="text-[11px]" style={{ color: "var(--a-text-4)" }}>{formatTime(time)}</span>
                  <span className="truncate font-medium" style={{ color: "var(--a-text)" }}>{ev.topic}</span>
                  <span className="truncate">{slug || "—"}</span>
                  <span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ background: colors.bg, color: colors.text }}>
                      {ev.status}
                    </span>
                  </span>
                  {direction === "outbox" && <span>{ev.attempts ?? 0}</span>}
                  {direction === "outbox" && (
                    <span>
                      {canRetry && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRetry(ev.id); }}
                          disabled={retrying === ev.id}
                          className="p-1 rounded hover:bg-[var(--a-bg-hover)] text-yellow-400 disabled:opacity-50"
                          title="Retry"
                        >
                          {retrying === ev.id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        </button>
                      )}
                    </span>
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1" style={{ borderTop: "1px solid var(--a-border)" }}>
                    {ev.last_error && (
                      <p className="text-[11px] text-red-400 mb-2">Помилка: {ev.last_error}</p>
                    )}
                    <div className="p-3 rounded-lg text-[11px] font-mono overflow-x-auto" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
                      <pre className="whitespace-pre-wrap break-all">{JSON.stringify(ev.payload, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {loading && (
          <div className="py-8 text-center" style={{ borderTop: "1px solid var(--a-border)" }}>
            <RefreshCw className="w-5 h-5 animate-spin mx-auto" style={{ color: "var(--a-text-4)" }} />
          </div>
        )}
      </div>

      {/* Load more */}
      {events.length < total && !loading && (
        <div className="text-center">
          <button
            onClick={() => fetchEvents(false)}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
            Завантажити ще ({total - events.length} залишилось)
          </button>
        </div>
      )}
    </div>
  );
}
