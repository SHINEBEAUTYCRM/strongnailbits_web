import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const SEED_PAGES = [
  { title_uk: "Доставка та оплата", slug: "dostavka-ta-oplata", position: 1 },
  { title_uk: "Про нас", slug: "pro-nas", position: 2 },
  { title_uk: "Гарантії та повернення", slug: "garantii-ta-povernennya", position: 3 },
  { title_uk: "Контакти", slug: "kontakty", position: 4 },
  { title_uk: "Для оптових покупців", slug: "optovym-pokuptsyam", position: 5 },
  { title_uk: "Політика конфіденційності", slug: "polityka-konfidentsiinosti", position: 6 },
  { title_uk: "Договір публічної оферти", slug: "dogovir-publichnoi-oferty", position: 7 },
];

export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  let created = 0;

  for (const seed of SEED_PAGES) {
    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .eq("slug", seed.slug)
      .single();

    if (existing) continue;

    const { error } = await supabase.from("pages").insert({
      title_uk: seed.title_uk,
      slug: seed.slug,
      status: "draft",
      template: "default",
      position: seed.position,
      author_id: auth.user.id,
    });

    if (!error) created++;
  }

  return NextResponse.json({ ok: true, created, total: SEED_PAGES.length });
}
