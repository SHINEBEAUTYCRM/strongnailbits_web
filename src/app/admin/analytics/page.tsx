import { BarChart3 } from "lucide-react";
import Link from "next/link";

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Аналітика</h1>
          <p className="text-sm text-zinc-400">GA4 + Clarity + Looker Studio + PostHog</p>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <AnalyticsCard
          title="Google Analytics 4"
          status="pending"
          description="Воронка, когорти, LTV, джерела"
        />
        <AnalyticsCard
          title="Microsoft Clarity"
          status="pending"
          description="Хітмепи, записи, rage clicks"
        />
        <AnalyticsCard
          title="Looker Studio"
          status="pending"
          description="CEO-дашборд: GA4+Ads+GSC"
        />
        <AnalyticsCard
          title="PostHog A/B"
          status="pending"
          description="Тести кнопок, checkout, цін"
        />
      </div>

      {/* CTA */}
      <div className="p-6 rounded-xl bg-[#111116] border border-[#1e1e2a] text-center">
        <p className="text-zinc-400 mb-4">
          Для активації аналітики — налаштуйте API-ключі в розділі Інтеграції
        </p>
        <Link
          href="/admin/settings/integrations"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
        >
          Налаштувати інтеграції
        </Link>
      </div>
    </div>
  );
}

function AnalyticsCard({
  title,
  status,
  description,
}: {
  title: string;
  status: "active" | "pending" | "error";
  description: string;
}) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    error: "bg-red-500/10 text-red-400 border-red-500/30",
  };

  const statusLabels = {
    active: "Активний",
    pending: "Не налаштовано",
    error: "Помилка",
  };

  return (
    <div className="p-4 rounded-xl bg-[#111116] border border-[#1e1e2a]">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${statusColors[status]}`}
        >
          {statusLabels[status]}
        </span>
      </div>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}
