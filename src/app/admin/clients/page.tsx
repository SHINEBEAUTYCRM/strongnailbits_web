import Link from "next/link";
import { Users } from "lucide-react";
import { getClients } from "@/lib/admin/data";

function formatPrice(v: number) {
  return v.toLocaleString("uk-UA");
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const { clients, total } = await getClients({
    page,
    type: params.type,
    search: params.search,
  });
  const totalPages = Math.ceil(total / 25);

  const types = [
    { key: "all", label: "Всі" },
    { key: "retail", label: "Роздріб" },
    { key: "wholesale", label: "Опт" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
          <Users className="w-6 h-6 text-purple-400" />
          Клієнти
        </h1>
        <p className="text-sm text-white/40">{total} клієнтів</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {types.map((t) => {
          const active = (params.type || "all") === t.key;
          return (
            <Link
              key={t.key}
              href={`/admin/clients?type=${t.key}`}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white border border-purple-500/30"
                  : "text-white/40 hover:text-white/60 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Клієнт</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Телефон</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Тип</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Замовлень</th>
                <th className="text-right px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Витрачено</th>
                <th className="text-left px-4 py-3 text-[11px] font-medium text-white/30 uppercase tracking-wider">Дата</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => {
                const name = [c.first_name, c.last_name].filter(Boolean).join(" ") || "—";
                const typeColor = c.type === "wholesale" ? "bg-purple-500/20 text-purple-400" : "bg-white/10 text-white/40";
                return (
                  <tr key={c.id} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white/80">{name}</p>
                      <p className="text-[11px] text-white/30">{c.email}</p>
                      {c.company && <p className="text-[11px] text-white/20">{c.company}</p>}
                    </td>
                    <td className="px-4 py-3 text-white/50 text-xs">{c.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${typeColor}`}>
                        {c.type === "wholesale" ? "Опт" : "Роздріб"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white/50 tabular-nums font-mono text-xs">{c.total_orders}</td>
                    <td className="px-4 py-3 text-right text-white/70 tabular-nums font-mono text-xs">{formatPrice(Number(c.total_spent))} ₴</td>
                    <td className="px-4 py-3 text-white/40 text-xs">{formatDate(c.created_at)}</td>
                  </tr>
                );
              })}
              {clients.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-white/20">Клієнтів не знайдено</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-xs text-white/30">Сторінка {page} з {totalPages}</p>
            <div className="flex gap-1">
              {page > 1 && (
                <Link href={`/admin/clients?page=${page - 1}&type=${params.type || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">←</Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/clients?page=${page + 1}&type=${params.type || "all"}`} className="px-3 py-1 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] transition-colors">→</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
