import { Megaphone } from "lucide-react";
import { SERVICE_REGISTRY } from "@/lib/integrations/registry";
import { SERVICE_CATEGORY_LABELS, SERVICE_CATEGORY_ORDER } from "@/lib/integrations/types";
import Link from "next/link";

export default function MarketingHubPage() {
  // Статистика по категоріях
  const categoryStats = SERVICE_CATEGORY_ORDER.map(cat => ({
    category: cat,
    label: SERVICE_CATEGORY_LABELS[cat],
    count: SERVICE_REGISTRY.filter(s => s.category === cat).length,
    free: SERVICE_REGISTRY.filter(s => s.category === cat && s.price.includes('FREE')).length,
  }));

  const totalServices = SERVICE_REGISTRY.length;
  const freeServices = SERVICE_REGISTRY.filter(s => s.price.includes('FREE') || s.price === 'Вбудовано').length;
  const requiredServices = SERVICE_REGISTRY.filter(s => s.isRequired).length;

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Marketing Hub</h1>
            <p className="text-sm text-zinc-400">ShineShop OS — Маркетингова екосистема</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Всього сервісів" value={totalServices} />
        <StatCard label="Безкоштовних" value={freeServices} />
        <StatCard label="Рекомендованих" value={requiredServices} />
        <StatCard label="Категорій" value={categoryStats.length} />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <QuickLink
          href="/admin/settings/integrations"
          title="Інтеграції"
          description="Налаштувати API-ключі для всіх 47 сервісів"
          highlight
        />
        <QuickLink
          href="/admin/analytics"
          title="Аналітика"
          description="GA4, Clarity, Looker Studio, PostHog"
        />
        <QuickLink
          href="/admin/marketing/ads"
          title="Реклама"
          description="Google Ads, Facebook/IG, TikTok"
          soon
        />
        <QuickLink
          href="/admin/marketing/comms"
          title="Комунікації"
          description="eSputnik, TurboSMS, OneSignal, Telegram"
          soon
        />
        <QuickLink
          href="/admin/marketing/competitors"
          title="Конкуренти"
          description="Моніторинг цін, реклами, SEO конкурентів"
          soon
        />
        <QuickLink
          href="/admin/seo"
          title="SEO"
          description="GSC, Serpstat, Auto-meta, GBP"
          soon
        />
      </div>

      {/* Category Breakdown */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Сервіси по категоріях</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categoryStats.map(stat => (
            <div
              key={stat.category}
              className="flex items-center justify-between p-4 rounded-xl bg-[#111116] border border-[#1e1e2a]"
            >
              <div>
                <p className="text-sm font-medium text-white">{stat.label}</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {stat.count} сервісів{stat.free > 0 ? ` (${stat.free} FREE)` : ''}
                </p>
              </div>
              <div className="text-2xl font-bold text-purple-400">{stat.count}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-4 rounded-xl bg-[#111116] border border-[#1e1e2a]">
      <p className="text-xs text-zinc-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  description,
  soon,
  highlight,
}: {
  href: string;
  title: string;
  description: string;
  soon?: boolean;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block p-4 rounded-xl border transition-colors ${
        highlight
          ? 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50'
          : 'bg-[#111116] border-[#1e1e2a] hover:border-[#27272a]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        {soon && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 uppercase">
            soon
          </span>
        )}
      </div>
      <p className="text-xs text-zinc-500">{description}</p>
    </Link>
  );
}
