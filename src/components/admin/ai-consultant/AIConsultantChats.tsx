"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageCircle,
  Loader2,
  Bot,
  ArrowUpRight,
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  Play,
  Wrench,
  ChevronDown,
  ChevronUp,
  User,
  Clock as ClockIcon,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ChatSession {
  id: string;
  visitor_id: string | null;
  user_id: string | null;
  status: string;
  message_count: number;
  detected_intents: string[] | null;
  satisfaction_rating: number | null;
  satisfaction_comment: string | null;
  cost_usd: number | null;
  manager_id: string | null;
  escalation_reason: string | null;
  created_at: string;
  closed_at: string | null;
  ai_chat_managers: { name: string; telegram_username: string | null } | null;
}

interface ChatMessage {
  id: string;
  session_id: string;
  role: string;
  content: string;
  model: string | null;
  tokens_input: number | null;
  tokens_output: number | null;
  latency_ms: number | null;
  tool_calls: unknown[] | null;
  created_at: string;
}

type StatusFilter = "" | "ai" | "waiting_manager" | "manager" | "closed";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_CFG: Record<string, { label: string; bg: string; color: string }> = {
  ai:              { label: "AI",        bg: "var(--a-accent-bg)", color: "var(--a-accent)" },
  waiting_manager: { label: "Очікує",    bg: "#f59e0b18",         color: "#f59e0b" },
  manager:         { label: "Менеджер",  bg: "#22c55e18",         color: "#22c55e" },
  closed:          { label: "Закрито",   bg: "var(--a-bg-hover)",  color: "var(--a-text-4)" },
};

const STATUS_ICON: Record<string, string> = {
  ai: "\u{1F916}",
  waiting_manager: "\u231B",
  manager: "\u{1F464}",
  closed: "\u2713",
};

const LIMIT = 20;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const months = ["січ", "лют", "бер", "кві", "тра", "чер", "лип", "сер", "вер", "жов", "лис", "гру"];
  return `${d.getDate()} ${months[d.getMonth()]}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function timeDiffMin(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 60000;
}

function fmtCost(usd: number | null): string {
  if (usd === null || usd === undefined) return "—";
  return `$${usd.toFixed(4)}`;
}

function fmtDuration(startIso: string, endIso: string | null): string {
  if (!endIso) return "—";
  const sec = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
  if (sec < 60) return `${sec} сек`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `${m} хв ${s} сек` : `${m} хв`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AIConsultantChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  /* Replay modal */
  const [replaySession, setReplaySession] = useState<ChatSession | null>(null);
  const [replayMessages, setReplayMessages] = useState<ChatMessage[]>([]);
  const [replayLoading, setReplayLoading] = useState(false);

  /* ── Load sessions ───────────────────────────────── */

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(LIMIT));
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/admin/ai-consultant/chats?${params}`);
      const json = await res.json();
      if (json.success) {
        setSessions(json.data || []);
        setTotal(json.total || 0);
      }
    } catch (err) {
      console.error("[Chats] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  /* ── Open replay ─────────────────────────────────── */

  const openReplay = async (session: ChatSession) => {
    setReplaySession(session);
    setReplayMessages([]);
    setReplayLoading(true);

    try {
      const res = await fetch(`/api/admin/ai-consultant/chats/${session.id}`);
      const json = await res.json();
      if (json.success) {
        setReplayMessages(json.messages || []);
        if (json.session) setReplaySession(json.session);
      }
    } catch (err) {
      console.error("[Chats] Replay load error:", err);
    } finally {
      setReplayLoading(false);
    }
  };

  /* ── Stats from current data ─────────────────────── */

  const statsAi = sessions.filter((s) => s.status === "ai" || s.status === "closed").length;
  const statsEscalated = sessions.filter((s) => s.manager_id).length;
  const ratingArr = sessions.filter((s) => s.satisfaction_rating !== null).map((s) => s.satisfaction_rating!);
  const avgRating = ratingArr.length > 0 ? ratingArr.reduce((a, b) => a + b, 0) / ratingArr.length : 0;

  const totalPages = Math.ceil(total / LIMIT);

  /* ── Filter change resets page ───────────────────── */

  const changeStatus = (s: StatusFilter) => {
    setStatusFilter(s);
    setPage(1);
  };

  /* ── Render ──────────────────────────────────────── */

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg, var(--a-accent), #ec4899)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MessageCircle className="w-6 h-6" style={{ color: "#fff" }} />
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--a-text)", margin: 0 }}>Логи чатів</h1>
          <p style={{ fontSize: 13, color: "var(--a-text-4)", margin: "2px 0 0" }}>
            Переглядайте та аналізуйте всі розмови з клієнтами
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3" style={{ marginBottom: 16 }}>
        {/* Status pills */}
        {([
          { value: "" as StatusFilter, label: "Всі" },
          { value: "ai" as StatusFilter, label: "AI \u{1F916}" },
          { value: "waiting_manager" as StatusFilter, label: "Очікує \u231B" },
          { value: "manager" as StatusFilter, label: "Менеджер \u{1F464}" },
          { value: "closed" as StatusFilter, label: "Закрито \u2713" },
        ]).map((f) => (
          <button
            key={f.value}
            onClick={() => changeStatus(f.value)}
            style={{
              padding: "6px 14px", borderRadius: 10, border: "none",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              background: statusFilter === f.value ? "var(--a-accent)" : "var(--a-bg-hover)",
              color: statusFilter === f.value ? "#fff" : "var(--a-text-3)",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}

        {/* Date range */}
        <div className="flex items-center gap-2 ml-auto">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            style={{
              background: "var(--a-bg-input)", border: "1px solid var(--a-border)",
              borderRadius: 10, padding: "6px 10px", color: "var(--a-text)", fontSize: 12, outline: "none",
            }}
          />
          <span style={{ color: "var(--a-text-5)", fontSize: 12 }}>—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            style={{
              background: "var(--a-bg-input)", border: "1px solid var(--a-border)",
              borderRadius: 10, padding: "6px 10px", color: "var(--a-text)", fontSize: 12, outline: "none",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ marginBottom: 20 }}>
        <MiniStat label="Всього сесій" value={String(total)} icon={<MessageCircle className="w-3.5 h-3.5" />} color="var(--a-text-3)" />
        <MiniStat label="AI відповів" value={String(statsAi)} icon={<Bot className="w-3.5 h-3.5" />} color="var(--a-accent)" />
        <MiniStat label="Ескалацій" value={String(statsEscalated)} icon={<ArrowUpRight className="w-3.5 h-3.5" />} color="#f59e0b" />
        <MiniStat label="Середній рейтинг" value={avgRating > 0 ? avgRating.toFixed(1) : "—"} icon={<Star className="w-3.5 h-3.5" />} color="#f59e0b" />
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: "var(--a-text-4)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span style={{ marginLeft: 8, fontSize: 13 }}>Завантаження...</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && sessions.length === 0 && (
        <div style={{
          background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
          borderRadius: 16, padding: 60, textAlign: "center", color: "var(--a-text-4)",
        }}>
          <MessageCircle className="w-12 h-12 mx-auto mb-4" style={{ opacity: 0.3 }} />
          <p style={{ fontSize: 14, marginBottom: 4 }}>Чатів поки немає</p>
          <p style={{ fontSize: 12 }}>Вони з'являться коли клієнти почнуть спілкуватися з AI.</p>
        </div>
      )}

      {/* Desktop table */}
      {!loading && sessions.length > 0 && (
        <div className="hidden md:block" style={{
          background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
          borderRadius: 16, overflow: "hidden", marginBottom: 16,
        }}>
          {/* Header */}
          <div
            className="grid items-center"
            style={{
              gridTemplateColumns: "70px 95px 100px 100px 65px 120px 55px 65px 80px",
              padding: "10px 16px",
              borderBottom: "1px solid var(--a-border)",
              fontSize: 10, fontWeight: 600, color: "var(--a-text-5)",
              textTransform: "uppercase", letterSpacing: "0.05em",
            }}
          >
            <span>ID</span>
            <span>Час</span>
            <span>Відвідувач</span>
            <span>Статус</span>
            <span>Msg</span>
            <span>Інтенти</span>
            <span>Рейтинг</span>
            <span>Вартість</span>
            <span>Дія</span>
          </div>

          {/* Rows */}
          {sessions.map((s) => {
            const sc = STATUS_CFG[s.status] || STATUS_CFG.closed;
            const si = STATUS_ICON[s.status] || "";
            const intents = s.detected_intents || [];
            return (
              <div
                key={s.id}
                className="grid items-center"
                style={{
                  gridTemplateColumns: "70px 95px 100px 100px 65px 120px 55px 65px 80px",
                  padding: "10px 16px",
                  borderBottom: "1px solid var(--a-border)",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--a-bg-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => openReplay(s)}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--a-text-4)" }}>
                  {s.id.slice(0, 8)}
                </span>
                <span style={{ fontSize: 11, color: "var(--a-text-3)" }}>{fmtDate(s.created_at)}</span>
                <span style={{ fontSize: 11, color: "var(--a-text-3)" }}>
                  {s.user_id ? "\u{1F464} Залогін." : (s.visitor_id?.slice(0, 8) || "—")}
                </span>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: sc.bg, color: sc.color, width: "fit-content",
                }}>
                  {si} {sc.label}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--a-text-3)" }}>
                  {s.message_count}
                </span>
                <div className="flex flex-wrap gap-1">
                  {intents.slice(0, 2).map((t) => (
                    <span key={t} style={{
                      fontSize: 10, padding: "1px 6px", borderRadius: 5,
                      background: "var(--a-accent-bg)", color: "var(--a-accent)",
                    }}>{t}</span>
                  ))}
                  {intents.length > 2 && (
                    <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>+{intents.length - 2}</span>
                  )}
                </div>
                <span style={{ color: "#f59e0b", fontSize: 11 }}>
                  {s.satisfaction_rating !== null ? `\u2B50 ${s.satisfaction_rating}` : "—"}
                </span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--a-text-4)" }}>
                  {fmtCost(s.cost_usd)}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); openReplay(s); }}
                  className="flex items-center gap-1"
                  style={{
                    padding: "4px 10px", borderRadius: 8, border: "none",
                    background: "var(--a-accent-bg)", color: "var(--a-accent)",
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  <Play className="w-3 h-3" /> Replay
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Mobile cards */}
      {!loading && sessions.length > 0 && (
        <div className="md:hidden flex flex-col gap-3" style={{ marginBottom: 16 }}>
          {sessions.map((s) => {
            const sc = STATUS_CFG[s.status] || STATUS_CFG.closed;
            const si = STATUS_ICON[s.status] || "";
            return (
              <div
                key={s.id}
                onClick={() => openReplay(s)}
                style={{
                  background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
                  borderRadius: 14, padding: 14, cursor: "pointer",
                }}
              >
                <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600,
                    background: sc.bg, color: sc.color,
                  }}>
                    {si} {sc.label}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--a-text-4)" }}>{fmtDate(s.created_at)}</span>
                </div>
                <div className="flex items-center gap-4" style={{ fontSize: 12, color: "var(--a-text-3)" }}>
                  <span>{s.message_count} повід.</span>
                  <span>{fmtCost(s.cost_usd)}</span>
                  {s.satisfaction_rating !== null && <span>\u2B50 {s.satisfaction_rating}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between" style={{ padding: "8px 0" }}>
          <span style={{ fontSize: 12, color: "var(--a-text-4)" }}>
            Сторінка {page} з {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid var(--a-border)",
                background: "var(--a-bg-card)", color: "var(--a-text-3)", cursor: page > 1 ? "pointer" : "default",
                opacity: page <= 1 ? 0.4 : 1, fontSize: 12,
              }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                padding: "6px 10px", borderRadius: 8, border: "1px solid var(--a-border)",
                background: "var(--a-bg-card)", color: "var(--a-text-3)", cursor: page < totalPages ? "pointer" : "default",
                opacity: page >= totalPages ? 0.4 : 1, fontSize: 12,
              }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Replay Modal */}
      {replaySession && (
        <ReplayModal
          session={replaySession}
          messages={replayMessages}
          loading={replayLoading}
          onClose={() => setReplaySession(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mini Stat                                                          */
/* ------------------------------------------------------------------ */

function MiniStat({ label, value, icon, color }: { label: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div style={{
      background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
      borderRadius: 12, padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ color }}>{icon}</span>
      <div>
        <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
        <div style={{ fontSize: 10, color: "var(--a-text-5)" }}>{label}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Replay Modal                                                       */
/* ------------------------------------------------------------------ */

function ReplayModal({
  session,
  messages,
  loading,
  onClose,
}: {
  session: ChatSession;
  messages: ChatMessage[];
  loading: boolean;
  onClose: () => void;
}) {
  const sc = STATUS_CFG[session.status] || STATUS_CFG.closed;
  const si = STATUS_ICON[session.status] || "";

  const totalTokens = messages.reduce((s, m) => s + (m.tokens_output || 0) + (m.tokens_input || 0), 0);

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "var(--a-bg-card)", border: "1px solid var(--a-border)",
        borderRadius: 20, width: "100%", maxWidth: 640,
        maxHeight: "80vh", display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "16px 20px",
          borderBottom: "1px solid var(--a-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div className="flex items-center gap-3">
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: sc.bg, color: sc.color,
            }}>
              {si} {sc.label}
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "var(--a-text-4)" }}>
              {session.visitor_id?.slice(0, 12) || session.id.slice(0, 8)}
            </span>
            <span style={{ fontSize: 11, color: "var(--a-text-5)" }}>{fmtDate(session.created_at)}</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--a-text-4)", padding: 4 }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Escalation reason */}
        {session.escalation_reason && (
          <div style={{
            padding: "8px 20px", background: "#f59e0b10",
            borderBottom: "1px solid var(--a-border)",
            fontSize: 12, color: "#f59e0b",
          }}>
            <ArrowUpRight className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
            Ескалація: {session.escalation_reason}
          </div>
        )}

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
          {loading ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40, color: "var(--a-text-4)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span style={{ marginLeft: 8, fontSize: 13 }}>Завантаження повідомлень...</span>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--a-text-5)", fontSize: 13 }}>
              Повідомлень немає
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {messages.map((msg, idx) => {
                const prevMsg = idx > 0 ? messages[idx - 1] : null;
                const showTimeSep = prevMsg && timeDiffMin(prevMsg.created_at, msg.created_at) > 1;

                return (
                  <div key={msg.id}>
                    {showTimeSep && (
                      <div style={{ textAlign: "center", padding: "8px 0", fontSize: 10, color: "var(--a-text-5)" }}>
                        <ClockIcon className="w-3 h-3 inline mr-1" style={{ verticalAlign: "middle" }} />
                        {fmtTime(msg.created_at)}
                      </div>
                    )}
                    <MessageBubble msg={msg} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer stats */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--a-border)",
          flexShrink: 0,
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16,
          fontSize: 11, color: "var(--a-text-4)",
        }}>
          <span>{messages.length} повідомлень</span>
          <span>{totalTokens.toLocaleString()} токенів</span>
          <span>{fmtCost(session.cost_usd)}</span>
          <span>{fmtDuration(session.created_at, session.closed_at)}</span>
          {session.satisfaction_rating !== null && (
            <span style={{ color: "#f59e0b", fontWeight: 600 }}>
              \u2B50 {session.satisfaction_rating}
              {session.satisfaction_comment && ` — "${session.satisfaction_comment}"`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [toolsOpen, setToolsOpen] = useState(false);

  if (msg.role === "system") {
    return (
      <div style={{ textAlign: "center", padding: "6px 0", fontSize: 11, color: "var(--a-text-4)", fontStyle: "italic" }}>
        {msg.content}
      </div>
    );
  }

  const isUser = msg.role === "user";
  const isManager = msg.role === "manager";

  const bubbleStyle: React.CSSProperties = {
    maxWidth: "85%",
    padding: "10px 14px",
    borderRadius: 16,
    fontSize: 13,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    ...(isUser
      ? {
          marginLeft: "auto",
          background: "var(--a-bg-input)",
          color: "var(--a-text)",
          borderBottomRightRadius: 4,
        }
      : isManager
        ? {
            marginRight: "auto",
            background: "#22c55e15",
            border: "1px solid #22c55e30",
            color: "var(--a-text)",
            borderBottomLeftRadius: 4,
          }
        : {
            marginRight: "auto",
            background: "var(--a-accent-bg)",
            color: "var(--a-text)",
            borderBottomLeftRadius: 4,
          }),
  };

  const tools = msg.tool_calls as unknown[] | null;
  const hasTools = tools && Array.isArray(tools) && tools.length > 0;

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={bubbleStyle}>
        {msg.content}
      </div>

      {/* Meta under AI / manager bubble */}
      {!isUser && (
        <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: 2, paddingLeft: 4 }}>
          {msg.model && (
            <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>{msg.model}</span>
          )}
          {msg.latency_ms !== null && (
            <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>{msg.latency_ms}ms</span>
          )}
          {msg.tokens_output !== null && (
            <span style={{ fontSize: 10, color: "var(--a-text-5)" }}>{msg.tokens_output} tok</span>
          )}
          {isManager && (
            <span style={{ fontSize: 10, color: "#22c55e" }}>
              <User className="w-2.5 h-2.5 inline mr-0.5" style={{ verticalAlign: "middle" }} />
              менеджер
            </span>
          )}
        </div>
      )}

      {/* Tool calls */}
      {hasTools && (
        <div style={{ marginTop: 6, maxWidth: "85%" }}>
          <button
            onClick={() => setToolsOpen(!toolsOpen)}
            className="flex items-center gap-1"
            style={{
              fontSize: 10, fontWeight: 600, color: "var(--a-text-4)",
              background: "none", border: "none", cursor: "pointer", padding: "2px 0",
            }}
          >
            <Wrench className="w-3 h-3" />
            Tools ({(tools as unknown[]).length})
            {toolsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {toolsOpen && (
            <div style={{
              background: "var(--a-bg-input)", border: "1px solid var(--a-border)",
              borderRadius: 10, padding: 10, marginTop: 4, fontSize: 11,
              fontFamily: "'JetBrains Mono', monospace",
              maxHeight: 200, overflowY: "auto",
              color: "var(--a-text-3)",
            }}>
              {(tools as Record<string, unknown>[]).map((tool, i) => (
                <div key={i} style={{ marginBottom: i < (tools as unknown[]).length - 1 ? 8 : 0 }}>
                  <div style={{ fontWeight: 600, color: "var(--a-accent)", marginBottom: 2 }}>
                    {(tool.name as string) || `tool_${i}`}
                  </div>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 10, color: "var(--a-text-4)" }}>
                    {JSON.stringify(tool.input || tool.arguments || tool, null, 2).slice(0, 500)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
