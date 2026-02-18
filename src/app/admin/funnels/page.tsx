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
  MessageSquare,
  Send,
  Smartphone,
  Clock,
  CheckCircle,
  XCircle,
  BarChart3,
  Bot,
  Brain,
  Sparkles,
  Zap,
} from "lucide-react";

// ────── Markdown renderer (simple, no deps) ──────

function renderMarkdown(text: string): string {
  return text
    // Code blocks ```...```
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre style="background:var(--a-bg-input);padding:12px;border-radius:8px;overflow-x:auto;font-size:13px;margin:8px 0"><code>$2</code></pre>')
    // Headers
    .replace(/^### \*\*(.*?)\*\*/gm, '<h4 style="font-weight:600;margin:12px 0 4px">$1</h4>')
    .replace(/^### (.*)/gm, '<h4 style="font-weight:600;margin:12px 0 4px">$1</h4>')
    .replace(/^## (.*)/gm, '<h3 style="font-weight:600;font-size:15px;margin:14px 0 6px">$1</h3>')
    .replace(/^# (.*)/gm, '<h2 style="font-weight:700;font-size:17px;margin:16px 0 8px">$1</h2>')
    // Bold & italic
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code style="background:var(--a-bg-input);padding:1px 5px;border-radius:4px;font-size:12px">$1</code>')
    // Unordered list items (- or •)
    .replace(/^[-•] (.*)/gm, '<li style="margin-left:16px;list-style:disc;margin-bottom:2px">$1</li>')
    // Ordered list items
    .replace(/^\d+\. (.*)/gm, '<li style="margin-left:16px;list-style:decimal;margin-bottom:2px">$1</li>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid var(--a-border);margin:12px 0" />')
    // Line breaks (preserve paragraph spacing)
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ────── Types ──────

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

interface MessagingStats {
  totalMessages: number;
  telegramMessages: number;
  smsMessages: number;
  sentCount: number;
  failedCount: number;
  successRate: string;
  telegramClients: number;
  totalClients: number;
  telegramCoverage: string;
  pendingScheduled: number;
  totalSmsCost: string;
  recentMessages: RecentMessage[];
}

interface RecentMessage {
  id: string;
  channel: string;
  phone: string | null;
  rendered_text: string;
  status: string;
  error: string | null;
  cost: number;
  sent_at: string;
  profiles: { first_name: string; last_name: string; phone: string } | null;
}

type Tab = "funnels" | "messaging" | "stats" | "ai";

export default function FunnelsPage() {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [msgStats, setMsgStats] = useState<MessagingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("funnels");

  const fetchFunnels = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/funnels");
      const json = await res.json();
      if (json.data) setFunnels(json.data);
    } catch (err) {
      console.error('[Funnels] Funnels fetch failed:', err);
    }
    setLoading(false);
  }, []);

  const fetchMsgStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/messaging/stats");
      const json = await res.json();
      if (json.data) setMsgStats(json.data);
    } catch (err) {
      console.error('[Funnels] Messaging stats fetch failed:', err);
    }
  }, []);

  useEffect(() => {
    fetchFunnels();
    fetchMsgStats();
  }, [fetchFunnels, fetchMsgStats]);

  // Total stats
  const totalContacts = funnels.reduce((s, f) => s + f.totalContacts, 0);
  const totalConverted = funnels.reduce((s, f) => s + f.convertedContacts, 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "funnels", label: "Воронки", icon: <Filter size={14} /> },
    { id: "messaging", label: "Повідомлення", icon: <MessageSquare size={14} /> },
    { id: "stats", label: "Статистика", icon: <BarChart3 size={14} /> },
    { id: "ai", label: "AI Advisor", icon: <Brain size={14} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "var(--a-accent-bg)" }}>
            <Filter size={20} style={{ color: "var(--a-accent)" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>SmartЛійки</h1>
            <p className="text-sm" style={{ color: "var(--a-text-2)" }}>
              Воронки, повідомлення та аналітика конверсій
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchFunnels();
              fetchMsgStats();
            }}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors"
            style={{ border: "1px solid var(--a-border)", color: "var(--a-text-2)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--a-bg-hover)"; e.currentTarget.style.color = "var(--a-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--a-text-2)"; }}
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl p-1" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)" }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: activeTab === tab.id ? "var(--a-bg-hover)" : "transparent",
              color: activeTab === tab.id ? "var(--a-text)" : "var(--a-text-3)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<Filter size={18} />}
          label="Активних лійок"
          value={funnels.filter((f) => f.is_active).length.toString()}
          color="#6366f1"
        />
        <StatCard
          icon={<Users size={18} />}
          label="Контактів"
          value={totalContacts.toString()}
          color="#3b82f6"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          label="Конвертовано"
          value={totalConverted.toString()}
          color="#10b981"
        />
        <StatCard
          icon={<Bot size={18} />}
          label="Telegram клієнтів"
          value={msgStats ? `${msgStats.telegramClients}/${msgStats.totalClients}` : "—"}
          color="#0088cc"
          sub={msgStats ? `${msgStats.telegramCoverage}%` : undefined}
        />
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-gray-500" />
        </div>
      ) : activeTab === "funnels" ? (
        <FunnelsTab funnels={funnels} />
      ) : activeTab === "messaging" ? (
        <MessagingTab stats={msgStats} />
      ) : activeTab === "stats" ? (
        <StatsTab stats={msgStats} />
      ) : (
        <AITab funnels={funnels} />
      )}
    </div>
  );
}

// ────── Funnels Tab ──────

function FunnelsTab({ funnels }: { funnels: Funnel[] }) {
  if (funnels.length === 0) {
    return (
      <div className="rounded-2xl p-12 text-center" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
        <Filter size={40} className="mx-auto mb-3" style={{ color: "var(--a-text-4)" }} />
        <p style={{ color: "var(--a-text-2)" }}>
          Лійки ще не створені. Виконайте SQL-схему для створення шаблонних воронок.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {funnels.map((funnel) => (
        <FunnelCard key={funnel.id} funnel={funnel} />
      ))}
    </div>
  );
}

function FunnelCard({ funnel }: { funnel: Funnel }) {
  const maxCount = Math.max(
    ...funnel.stages.map((s) => funnel.stageCounts[s.id] || 0),
    1,
  );

  return (
    <div className="rounded-2xl p-5 transition-all" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
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
            <h3 className="font-semibold" style={{ color: "var(--a-text)" }}>{funnel.name}</h3>
            {funnel.description && (
              <p className="text-xs" style={{ color: "var(--a-text-3)" }}>{funnel.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: "var(--a-text)" }}>
              {funnel.conversionRate}%
            </p>
            <p className="text-[10px] uppercase" style={{ color: "var(--a-text-3)" }}>Конверсія</p>
          </div>
          <Link
            href={`/admin/funnels/${funnel.id}`}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ border: "1px solid var(--a-border)", color: "var(--a-text-3)" }}
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      {/* Visual funnel stages */}
      <div className="flex items-center gap-1">
        {funnel.stages.map((stage, i) => {
          const count = funnel.stageCounts[stage.id] || 0;
          const isLast = i === funnel.stages.length - 1;

          return (
            <div key={stage.id} className="flex items-center" style={{ flex: 1 }}>
              <div className="w-full">
                <div
                  className="relative mb-1 overflow-hidden rounded-md"
                  style={{ height: 32 }}
                >
                  <div
                    className="flex h-full items-center justify-center rounded-md px-2 transition-all"
                    style={{
                      backgroundColor: stage.color
                        ? `${stage.color}25`
                        : "var(--a-bg-input)",
                      minWidth: "100%",
                      borderLeft: `3px solid ${stage.color || "#6366f1"}`,
                    }}
                  >
                    <span className="truncate text-xs font-medium" style={{ color: "var(--a-text)" }}>
                      {stage.name}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span
                    className="text-sm font-bold"
                    style={{ color: stage.color || "#94a3b8" }}
                  >
                    {count}
                  </span>
                  {i > 0 && count > 0 && (
                    <span className="text-[10px]" style={{ color: "var(--a-text-3)" }}>
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
      <div className="mt-3 flex items-center gap-4 pt-3 text-xs" style={{ borderTop: "1px solid var(--a-border)", color: "var(--a-text-3)" }}>
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
          <span className="rounded px-1.5 py-0.5" style={{ background: "var(--a-st-cancelled-bg)", color: "var(--a-st-cancelled-c)" }}>
            Неактивна
          </span>
        )}
      </div>
    </div>
  );
}

// ────── Messaging Tab ──────

function MessagingTab({ stats }: { stats: MessagingStats | null }) {
  return (
    <div className="space-y-4">
      {/* Channel distribution */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat
          icon={<Send size={16} />}
          label="Всього відправлено"
          value={stats?.totalMessages.toString() || "0"}
          color="#6366f1"
        />
        <MiniStat
          icon={<Bot size={16} />}
          label="Через Telegram"
          value={stats?.telegramMessages.toString() || "0"}
          color="#0088cc"
        />
        <MiniStat
          icon={<Smartphone size={16} />}
          label="Через SMS"
          value={stats?.smsMessages.toString() || "0"}
          color="#f59e0b"
        />
        <MiniStat
          icon={<Clock size={16} />}
          label="В черзі"
          value={stats?.pendingScheduled.toString() || "0"}
          color="#8b5cf6"
        />
      </div>

      {/* Recent messages */}
      <div className="rounded-2xl" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>
            Останні повідомлення
          </h3>
          <span className="text-xs" style={{ color: "var(--a-text-3)" }}>
            Витрати SMS: {stats?.totalSmsCost || "0.00"} грн
          </span>
        </div>

        {!stats?.recentMessages?.length ? (
          <div className="p-8 text-center text-sm" style={{ color: "var(--a-text-3)" }}>
            Повідомлення ще не відправлялись
          </div>
        ) : (
          <div style={{ borderColor: "var(--a-border)" }} className="divide-y">
            {stats.recentMessages.map((msg) => (
              <MessageRow key={msg.id} message={msg} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: RecentMessage }) {
  const channelIcon =
    message.channel === "telegram" ? (
      <Bot size={14} className="text-sky-400" />
    ) : (
      <Smartphone size={14} className="text-amber-400" />
    );

  const statusIcon =
    message.status === "sent" ? (
      <CheckCircle size={14} className="text-green-400" />
    ) : (
      <XCircle size={14} className="text-red-400" />
    );

  const name = message.profiles
    ? `${message.profiles.first_name || ""} ${message.profiles.last_name || ""}`.trim()
    : message.phone || "—";

  const time = new Date(message.sent_at).toLocaleString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="flex items-center gap-1.5">
        {channelIcon}
        {statusIcon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--a-text)" }}>{name}</span>
          <span className="text-xs" style={{ color: "var(--a-text-4)" }}>{time}</span>
        </div>
        <p className="truncate text-xs" style={{ color: "var(--a-text-3)" }}>
          {message.rendered_text?.slice(0, 80) || "—"}
        </p>
      </div>
      {message.cost > 0 && (
        <span className="text-xs text-amber-500">
          {message.cost.toFixed(2)} грн
        </span>
      )}
      {message.error && (
        <span className="max-w-[120px] truncate text-xs text-red-400">
          {message.error}
        </span>
      )}
    </div>
  );
}

// ────── Stats Tab ──────

function StatsTab({ stats }: { stats: MessagingStats | null }) {
  if (!stats) {
    return (
      <div className="py-12 text-center" style={{ color: "var(--a-text-3)" }}>
        <Loader2 size={24} className="mx-auto mb-2 animate-spin" />
        Завантаження...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Delivery rates */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <BigStat
          label="Успішність доставки"
          value={`${stats.successRate}%`}
          sub={`${stats.sentCount} з ${stats.totalMessages}`}
          color={Number(stats.successRate) > 90 ? "#10b981" : "#f59e0b"}
        />
        <BigStat
          label="Telegram покриття"
          value={`${stats.telegramCoverage}%`}
          sub={`${stats.telegramClients} з ${stats.totalClients} клієнтів`}
          color="#0088cc"
        />
        <BigStat
          label="Витрати на SMS"
          value={`${stats.totalSmsCost} ₴`}
          sub={`${stats.smsMessages} SMS відправлено`}
          color="#f59e0b"
        />
      </div>

      {/* Channel breakdown */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
        <h3 className="mb-4 text-sm font-semibold" style={{ color: "var(--a-text)" }}>
          Розподіл каналів
        </h3>
        <div className="space-y-3">
          <ChannelBar
            label="Telegram"
            icon={<Bot size={14} className="text-sky-400" />}
            count={stats.telegramMessages}
            total={stats.totalMessages}
            color="#0088cc"
          />
          <ChannelBar
            label="SMS"
            icon={<Smartphone size={14} className="text-amber-400" />}
            count={stats.smsMessages}
            total={stats.totalMessages}
            color="#f59e0b"
          />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MiniStat
          icon={<CheckCircle size={16} />}
          label="Доставлено"
          value={stats.sentCount.toString()}
          color="#10b981"
        />
        <MiniStat
          icon={<XCircle size={16} />}
          label="Помилок"
          value={stats.failedCount.toString()}
          color="#ef4444"
        />
        <MiniStat
          icon={<Clock size={16} />}
          label="Заплановано"
          value={stats.pendingScheduled.toString()}
          color="#8b5cf6"
        />
        <MiniStat
          icon={<Smartphone size={16} />}
          label="Вартість SMS"
          value={`${stats.totalSmsCost} ₴`}
          color="#f59e0b"
        />
      </div>
    </div>
  );
}

function ChannelBar({
  label,
  icon,
  count,
  total,
  color,
}: {
  label: string;
  icon: React.ReactNode;
  count: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? (count / total) * 100 : 0;

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5" style={{ color: "var(--a-text-2)" }}>
          {icon} {label}
        </span>
        <span style={{ color: "var(--a-text-3)" }}>
          {count} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--a-bg-hover)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ────── AI Tab ──────

interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

function AITab({ funnels }: { funnels: Funnel[] }) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  const quickActions = [
    {
      label: "Аналіз воронок",
      icon: <BarChart3 size={14} />,
      prompt: "Проаналізуй всі воронки та дай рекомендації для покращення конверсії",
    },
    {
      label: "Вузькі місця",
      icon: <Target size={14} />,
      prompt: "Де найбільше втрачаються контакти? Знайди вузькі місця у воронках",
    },
    {
      label: "Ідеї повідомлень",
      icon: <MessageSquare size={14} />,
      prompt: "Запропонуй 5 ідей для повідомлень які збільшать конверсію на етапі реєстрації",
    },
    {
      label: "Стратегія реактивації",
      icon: <Zap size={14} />,
      prompt: "Яка найкраща стратегія реактивації неактивних B2B клієнтів у нігтьовій косметиці?",
    },
    {
      label: "Оптимізація Telegram",
      icon: <Bot size={14} />,
      prompt: "Як збільшити кількість клієнтів підключених до Telegram бота? Дай конкретний план",
    },
    {
      label: "A/B тест ідеї",
      icon: <Sparkles size={14} />,
      prompt: "Запропонуй A/B тести для повідомлень у воронці продажів. Які варіації тестувати?",
    },
  ];

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: AIMessage = { role: "user", content: text.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/funnels/ai?action=chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text.trim(),
          previousMessages: messages.slice(-6), // Last 3 turns
        }),
      });

      const json = await res.json();

      if (json.data?.reply) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: json.data.reply },
        ]);
      } else {
        setMessages([
          ...newMessages,
          {
            role: "assistant",
            content: json.error || "Помилка отримання відповіді",
          },
        ]);
      }
    } catch (err) {
      console.error('[Funnels] AI chat failed:', err);
      setMessages([
        ...newMessages,
        { role: "assistant", content: "❌ Помилка з'єднання з AI" },
      ]);
    }

    setLoading(false);
  };

  const runAnalysis = async () => {
    setAnalysisLoading(true);
    try {
      const res = await fetch("/api/admin/funnels/ai?action=analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const json = await res.json();

      if (json.data?.analysis) {
        setMessages([
          ...messages,
          { role: "user", content: "🔍 Повний аналіз воронок" },
          { role: "assistant", content: json.data.analysis },
        ]);
      }
    } catch (err) {
      console.error('[Funnels] AI analysis failed:', err);
    }
    setAnalysisLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* AI Header */}
      <div className="rounded-2xl p-5" style={{ border: "1px solid var(--a-border)", background: "var(--a-accent-bg)", boxShadow: "var(--a-card-shadow)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: "rgba(168,85,247,0.12)" }}>
            <Brain size={20} style={{ color: "var(--a-accent)" }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: "var(--a-text)" }}>
              AI Advisor — Claude
            </h3>
            <p className="text-xs" style={{ color: "var(--a-text-2)" }}>
              Аналіз воронок, рекомендації, генерація повідомлень, скоринг
              контактів
            </p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={analysisLoading}
            className="flex h-9 items-center gap-1.5 rounded-lg bg-purple-600/80 px-4 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
          >
            {analysisLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            Повний аналіз
          </button>
        </div>

        {/* Quick stats for AI context */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-md px-2 py-1 text-xs" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
            {funnels.length} воронок
          </span>
          <span className="rounded-md px-2 py-1 text-xs" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
            {funnels.reduce((s, f) => s + f.totalContacts, 0)} контактів
          </span>
          <span className="rounded-md px-2 py-1 text-xs" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-2)" }}>
            {funnels.reduce((s, f) => s + f.convertedContacts, 0)} конверсій
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={() => sendMessage(action.prompt)}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl p-3 text-left text-xs transition-all disabled:opacity-50"
            style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", color: "var(--a-text-2)", boxShadow: "var(--a-card-shadow)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--a-accent)"; e.currentTarget.style.color = "var(--a-text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--a-border)"; e.currentTarget.style.color = "var(--a-text-2)"; }}
          >
            <span style={{ color: "var(--a-accent)" }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div className="rounded-2xl" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
        {/* Messages */}
        <div className="max-h-[500px] min-h-[200px] space-y-3 overflow-y-auto p-4">
          {messages.length === 0 ? (
            <div className="py-12 text-center">
              <Brain size={32} className="mx-auto mb-2" style={{ color: "var(--a-text-5)" }} />
              <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
                Задайте питання або оберіть швидку дію вище
              </p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm"
                  style={{
                    background: msg.role === "user" ? "var(--a-accent-bg)" : "var(--a-bg-hover)",
                    color: msg.role === "user" ? "var(--a-accent)" : "var(--a-text-body)",
                  }}
                >
                  {msg.role === "assistant" && (
                    <div className="mb-1 flex items-center gap-1 text-[10px]" style={{ color: "var(--a-accent)" }}>
                      <Brain size={10} /> Claude AI
                    </div>
                  )}
                  <div
                    className="prose-ai"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                  />
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl px-4 py-3 text-sm" style={{ background: "var(--a-bg-hover)", color: "var(--a-text-3)" }}>
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--a-accent)" }} />
                AI думає...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="p-3" style={{ borderTop: "1px solid var(--a-border)" }}>
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Запитайте AI про воронки, повідомлення, стратегії..."
              className="flex-1 rounded-xl px-4 py-2.5 text-sm focus:outline-none"
              style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border)", color: "var(--a-text)" }}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white transition-colors hover:bg-purple-500 disabled:opacity-30"
              style={{ background: "var(--a-accent)" }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────── Shared Components ──────

function StatCard({
  icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl p-4" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)", borderLeft: `3px solid ${color}` }}>
      <div className="mb-2 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-xs" style={{ color: "var(--a-text-3)" }}>{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: "var(--a-text)", fontFamily: "'JetBrains Mono', monospace" }}>{value}</p>
      {sub && <p className="mt-0.5 text-xs" style={{ color: "var(--a-text-3)" }}>{sub}</p>}
    </div>
  );
}

function MiniStat({
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
    <div className="rounded-xl p-3" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
      <div className="mb-1.5 flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-[11px]" style={{ color: "var(--a-text-3)" }}>{label}</span>
      </div>
      <p className="text-lg font-bold" style={{ color: "var(--a-text)" }}>{value}</p>
    </div>
  );
}

function BigStat({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="rounded-xl p-5 text-center" style={{ border: "1px solid var(--a-border)", background: "var(--a-bg-card)", boxShadow: "var(--a-card-shadow)" }}>
      <p className="mb-1 text-xs" style={{ color: "var(--a-text-3)" }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--a-text-3)" }}>{sub}</p>
    </div>
  );
}
