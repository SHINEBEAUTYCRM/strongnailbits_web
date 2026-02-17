import { NextRequest, NextResponse } from "next/server";
import { csCart } from "@/lib/cs-cart";
import type { CSCartCategory } from "@/types/cs-cart";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  /* ---- Auth ---- */
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    (serviceRoleKey && token === serviceRoleKey) ||
    (cronSecret && token === cronSecret);

  if (!isAuthorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  /* ---- Fetch ALL active categories from CS-Cart ---- */
  const all: CSCartCategory[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await csCart.getCategories(page, 500, { status: "A" });
    const cats = res.categories ?? [];
    all.push(...cats);
    const totalItems = Number(res.params?.total_items ?? 0);
    hasMore = cats.length === 500 && page * 500 < totalItems;
    page++;
  }

  /* ---- Analyze parent_id distribution ---- */
  const parentIdCount = new Map<number, number>();
  const parentIdNames = new Map<number, string[]>();

  for (const cat of all) {
    const pid = cat.parent_id;
    parentIdCount.set(pid, (parentIdCount.get(pid) ?? 0) + 1);

    if (!parentIdNames.has(pid)) parentIdNames.set(pid, []);
    parentIdNames.get(pid)!.push(`${cat.category} (id:${cat.category_id}, pos:${cat.position})`);
  }

  // Sort by count descending
  const distribution = Array.from(parentIdCount.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([pid, count]) => ({
      parent_id: pid,
      count,
      children_names: parentIdNames.get(pid)!.slice(0, 30), // limit for readability
    }));

  /* ---- Find candidates for "root" parent_id ---- */
  // The "root" parent_id is the one whose children are the main categories
  // (Ногти, Гель-лаки, Базы, Топы, etc.)
  const expectedRoots = [
    "Ногти", "Гель-лаки", "Базы", "Топы", "Депиляция", "Техника",
    "Мебель/оборудование", "Брови и ресницы", "Для лица и тела",
    "Одноразовая продукция", "Sale", "Бренды",
  ];

  // Find which parent_id contains the expected root categories
  let detectedRootParentId: number | null = null;
  let maxMatches = 0;
  for (const [pid, names] of parentIdNames.entries()) {
    const catNames = names.map((n) => n.split(" (id:")[0]);
    const matches = expectedRoots.filter((r) =>
      catNames.some((cn) => cn.toLowerCase().includes(r.toLowerCase())),
    ).length;
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedRootParentId = pid;
    }
  }

  /* ---- Show first 10 raw categories for inspection ---- */
  const sample = all.slice(0, 10).map((c) => ({
    category_id: c.category_id,
    parent_id: c.parent_id,
    category: c.category,
    status: c.status,
    position: c.position,
    product_count: c.product_count,
  }));

  /* ---- Show the root-level categories (children of detected root parent) ---- */
  const rootCategories = detectedRootParentId !== null
    ? all
        .filter((c) => c.parent_id === detectedRootParentId)
        .sort((a, b) => a.position - b.position)
        .map((c) => ({
          category_id: c.category_id,
          parent_id: c.parent_id,
          name: c.category,
          position: c.position,
          product_count: c.product_count,
        }))
    : [];

  return NextResponse.json({
    total_categories: all.length,
    unique_parent_ids: parentIdCount.size,
    detected_root_parent_id: detectedRootParentId,
    detected_root_matches: maxMatches,
    root_categories: rootCategories,
    parent_id_distribution: distribution,
    sample_raw: sample,
  });
}
