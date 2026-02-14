import { Award, Plus, Package } from "lucide-react";
import Link from "next/link";
import { getBrands } from "@/lib/admin/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { BrandsClient } from "./BrandsClient";

export default async function BrandsPage() {
  const brands = await getBrands();

  // Get product counts per brand in one query
  const supabase = createAdminClient();
  const { data: countData } = await supabase.rpc("get_brand_product_counts").select("*");

  // Fallback if RPC doesn't exist — count manually
  let countsMap: Record<string, number> = {};
  if (countData && Array.isArray(countData)) {
    for (const row of countData) {
      countsMap[row.brand_id] = row.count;
    }
  } else {
    // Fallback: get all brand_ids with counts
    const { data: products } = await supabase.from("products").select("brand_id");
    if (products) {
      for (const p of products) {
        if (p.brand_id) countsMap[p.brand_id] = (countsMap[p.brand_id] || 0) + 1;
      }
    }
  }

  const brandsWithCounts = brands.map((b) => ({
    ...b,
    product_count: countsMap[b.id] || 0,
  }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "var(--a-text)" }}>
            <Award className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            Бренди
          </h1>
          <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{brands.length} брендів</p>
        </div>
        <Link
          href="/admin/brands/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white"
          style={{ background: "var(--a-accent-btn)" }}
        >
          <Plus className="w-4 h-4" /> Додати
        </Link>
      </div>

      <p className="text-[11px] mb-4" style={{ color: "var(--a-text-5)" }}>
        Логотип: 400×200 px, PNG, прозорий фон · Банер: 1200×300 px
      </p>

      <BrandsClient brands={brandsWithCounts} />
    </div>
  );
}
