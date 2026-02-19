import { SlidersHorizontal } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { FeaturesClient } from "./FeaturesClient";

export default async function FeaturesPage() {
  const supabase = createAdminClient();

  const { data: features } = await supabase
    .from("features")
    .select("*")
    .order("filter_position", { ascending: true })
    .order("name_uk", { ascending: true });

  const list = features || [];
  const ids = list.map((f) => f.id);

  const [{ data: variantRows }, { data: productRows }, { count: totalLinks }] = await Promise.all([
    supabase.from("feature_variants").select("feature_id").in("feature_id", ids),
    supabase.from("product_features").select("feature_id").in("feature_id", ids),
    supabase.from("product_features").select("id", { count: "exact", head: true }),
  ]);

  const vMap = new Map<string, number>();
  const pMap = new Map<string, number>();
  let totalVariants = 0;

  for (const r of variantRows || []) {
    vMap.set(r.feature_id, (vMap.get(r.feature_id) || 0) + 1);
    totalVariants++;
  }
  for (const r of productRows || []) {
    pMap.set(r.feature_id, (pMap.get(r.feature_id) || 0) + 1);
  }

  const enriched = list.map((f) => ({
    ...f,
    variants_count: vMap.get(f.id) || 0,
    products_count: pMap.get(f.id) || 0,
  }));

  const activeFilters = list.filter((f) => f.is_filter).length;

  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold mb-1 flex items-center gap-3"
          style={{ color: "var(--a-text)" }}
        >
          <SlidersHorizontal className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
          Характеристики та фільтри
        </h1>
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
          {list.length} характеристик · {totalVariants.toLocaleString("uk")} варіантів · {(totalLinks ?? 0).toLocaleString("uk")} зв&apos;язків
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Характеристик", value: list.length },
          { label: "Активних фільтрів", value: activeFilters },
          { label: "Варіантів", value: totalVariants },
          { label: "Зв'язків", value: totalLinks ?? 0 },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl px-4 py-3"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            <p className="text-[11px] mb-0.5" style={{ color: "var(--a-text-5)" }}>{s.label}</p>
            <p className="text-lg font-semibold font-mono tabular-nums" style={{ color: "var(--a-text)" }}>
              {s.value.toLocaleString("uk")}
            </p>
          </div>
        ))}
      </div>

      <FeaturesClient features={enriched} />
    </div>
  );
}
