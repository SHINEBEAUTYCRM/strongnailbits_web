import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminUser } from "@/lib/admin/auth";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST() {
  const user = await getAdminUser();
  if (!user || !["owner", "admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = createAdminClient();

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("handle", "header")
    .single();
  if (!menu) return NextResponse.json({ error: "Header menu not found" }, { status: 404 });

  const { count } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_id", menu.id);
  if (count && count > 0) {
    return NextResponse.json({ error: "Menu already has items. Clear first." }, { status: 409 });
  }

  const { data: roots } = await supabase
    .from("categories")
    .select("id, name_uk, name_ru, cs_cart_id, product_count, position")
    .is("parent_cs_cart_id", null)
    .eq("status", "active")
    .is("deleted_at", null)
    .gt("product_count", 0)
    .order("position", { ascending: true });

  if (!roots?.length) return NextResponse.json({ error: "No root categories" }, { status: 404 });

  const filtered = roots.some((r: any) => r.position > 0)
    ? roots.filter((r: any) => r.position > 0)
    : roots;

  const items = [
    {
      menu_id: menu.id,
      label_uk: "Sale",
      label_ru: "Sale",
      url: "/catalog?in_stock=true&sort=discount",
      item_type: "custom_link",
      badge_text: "🔥",
      badge_color: "#EF4444",
      position: 0,
      is_visible: true,
    },
    {
      menu_id: menu.id,
      label_uk: "Бренди",
      label_ru: "Бренды",
      url: "/brands",
      item_type: "custom_link",
      position: 1,
      is_visible: true,
    },
    ...filtered.map((cat: any, i: number) => ({
      menu_id: menu.id,
      category_id: cat.id,
      label_uk: cat.name_uk,
      label_ru: cat.name_ru || cat.name_uk,
      item_type: "category",
      position: i + 2,
      is_visible: true,
    })),
  ];

  const { error } = await supabase.from("menu_items").insert(items);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, count: items.length });
}
