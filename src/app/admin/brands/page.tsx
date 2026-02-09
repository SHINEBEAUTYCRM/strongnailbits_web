import { Award } from "lucide-react";
import { getBrands } from "@/lib/admin/data";

export default async function BrandsPage() {
  const brands = await getBrands();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-white mb-1 flex items-center gap-3">
          <Award className="w-6 h-6 text-purple-400" />
          Бренди
        </h1>
        <p className="text-sm text-white/40">{brands.length} брендів</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {brands.map((b) => (
          <div
            key={b.id}
            className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-all duration-150"
          >
            <div className="flex items-center gap-3">
              {b.logo_url ? (
                <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-lg object-contain bg-white/5 shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center text-white/20 text-xs font-bold shrink-0">
                  {b.name[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{b.name}</p>
                <p className="text-[11px] text-white/30">{b.slug}</p>
              </div>
            </div>
            {(b.is_featured || b.country) && (
              <div className="flex gap-2 mt-3">
                {b.is_featured && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400">Featured</span>
                )}
                {b.country && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] text-white/30 bg-white/[0.04]">{b.country}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
