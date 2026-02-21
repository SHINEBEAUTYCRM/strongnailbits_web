import { createAdminClient } from "@/lib/supabase/admin";

export async function getMenus() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("menus").select("*").order("handle");
  return data ?? [];
}

export async function getMenuItems(menuHandle: string) {
  const supabase = createAdminClient();

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("handle", menuHandle)
    .single();

  if (!menu) return { menu_id: null, items: [] };

  const { data: items } = await supabase
    .from("menu_items")
    .select("*, categories(id, slug, name_uk, name_ru, product_count)")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });

  return { menu_id: menu.id, items: items ?? [] };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function saveMenuItems(menuId: string, items: any[]) {
  const supabase = createAdminClient();

  await supabase.from("menu_items").delete().eq("menu_id", menuId);

  if (!items.length) return { ok: true };

  const flat = flattenTree(items, menuId, null);
  const { error } = await supabase.from("menu_items").insert(flat);

  if (error) throw new Error(error.message);
  return { ok: true };
}

function flattenTree(
  items: any[],
  menuId: string,
  parentId: string | null,
  result: any[] = [],
  counter = { val: 0 },
): any[] {
  for (const item of items) {
    const id = item.id || crypto.randomUUID();
    result.push({
      id,
      menu_id: menuId,
      parent_id: parentId,
      category_id: item.category_id || null,
      page_id: item.page_id || null,
      label_uk: item.label_uk,
      label_ru: item.label_ru || null,
      url: item.url || null,
      item_type: item.item_type || "category",
      target: item.target || "_self",
      icon: item.icon || null,
      badge_text: item.badge_text || null,
      badge_color: item.badge_color || "#EF4444",
      is_visible: item.is_visible ?? true,
      position: counter.val++,
    });
    if (item.children?.length) {
      flattenTree(item.children, menuId, id, result, counter);
    }
  }
  return result;
}
