import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const supabase = createAdminClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("name_uk, name_ru")
      .eq("status", "active")
      .gt("quantity", 0)
      .or(`name_uk.ilike.%${q}%,name_ru.ilike.%${q}%`)
      .limit(50),
    supabase
      .from("categories")
      .select("name_uk, name_ru")
      .eq("status", "active")
      .or(`name_uk.ilike.%${q}%,name_ru.ilike.%${q}%`)
      .limit(10),
  ]);

  const suggestions = new Set<string>();
  const lowerQ = q.toLowerCase();

  for (const cat of categories ?? []) {
    if (cat.name_uk?.toLowerCase().includes(lowerQ)) suggestions.add(cat.name_uk);
    if (cat.name_ru?.toLowerCase().includes(lowerQ)) suggestions.add(cat.name_ru);
  }

  for (const p of products ?? []) {
    for (const name of [p.name_uk, p.name_ru]) {
      if (!name) continue;
      if (!name.toLowerCase().includes(lowerQ)) continue;
      const words = name.split(/\s+/).slice(0, 4).join(" ");
      suggestions.add(words);
    }
  }

  const sorted = Array.from(suggestions)
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(lowerQ) ? 0 : 1;
      return aStarts - bStarts || a.localeCompare(b, "uk");
    })
    .slice(0, 5);

  return NextResponse.json(sorted);
}
