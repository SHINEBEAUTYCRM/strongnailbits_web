import {
  DollarSign,
  ShoppingCart,
  Eye,
  Users,
} from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white mb-1">Dashboard</h1>
        <p className="text-sm text-white/40">Огляд магазину Shine Shop</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={DollarSign}
          label="Виручка сьогодні"
          value="—"
          change="+0%"
        />
        <StatCard
          icon={ShoppingCart}
          label="Замовлення сьогодні"
          value="—"
          change="+0%"
        />
        <StatCard
          icon={Eye}
          label="Відвідувачі"
          value="—"
          change="+0%"
        />
        <StatCard
          icon={Users}
          label="Нові клієнти"
          value="—"
          change="+0%"
        />
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <PlaceholderCard title="Останні замовлення" />
        <PlaceholderCard title="Популярні товари" />
        <PlaceholderCard title="Аналітика продажів" />
        <PlaceholderCard title="Активність" />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  change: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
          <Icon className="w-5 h-5 text-white/40" />
        </div>
        <span className="text-xs text-white/20" style={{ fontFamily: "var(--font-jetbrains-admin), var(--font-jetbrains), monospace" }}>
          {change}
        </span>
      </div>
      <p
        className="text-2xl font-semibold text-white tabular-nums"
        style={{ fontFamily: "var(--font-jetbrains-admin), var(--font-jetbrains), monospace" }}
      >
        {value}
      </p>
      <p className="text-xs text-white/40 mt-1">{label}</p>
    </div>
  );
}

function PlaceholderCard({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl p-6 min-h-[200px]">
      <h3 className="text-sm font-medium text-white/60 mb-4">{title}</h3>
      <div className="flex items-center justify-center h-[120px]">
        <p className="text-sm text-white/20">Coming next</p>
      </div>
    </div>
  );
}
