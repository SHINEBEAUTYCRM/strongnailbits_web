import { Award } from "lucide-react";
import { getBrands } from "@/lib/admin/data";

export default async function BrandsPage() {
  const brands = await getBrands();
  return (
    <div>
      <div className="mb-6"><h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}><Award className="w-6 h-6" style={{ color: "var(--a-accent)" }} />Бренди</h1><p className="text-sm" style={{ color: "var(--a-text-4)" }}>{brands.length} брендів</p></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {brands.map((b) => (
          <div key={b.id} className="rounded-xl p-4 transition-colors" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="flex items-center gap-3">
              {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-10 h-10 rounded-lg object-contain shrink-0" style={{ background: "var(--a-bg-input)" }} /> : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "var(--a-bg-input)", color: "var(--a-text-5)" }}>{b.name[0]}</div>}
              <div className="min-w-0"><p className="text-sm font-medium truncate" style={{ color: "var(--a-text-name)" }}>{b.name}</p><p className="text-[11px]" style={{ color: "var(--a-text-5)" }}>{b.slug}</p></div>
            </div>
            {(b.is_featured || b.country) && <div className="flex gap-2 mt-3">
              {b.is_featured && <span className="px-2 py-0.5 rounded-full text-[10px] font-medium" style={{ color: "#a78bfa", background: "#2e1065" }}>Featured</span>}
              {b.country && <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ color: "var(--a-text-4)", background: "var(--a-bg-input)" }}>{b.country}</span>}
            </div>}
          </div>
        ))}
      </div>
    </div>
  );
}
