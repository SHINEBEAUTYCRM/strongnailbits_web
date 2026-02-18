import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

function generateSlug(name: string): string {
  const map: Record<string, string> = {
    а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", є: "ye", ж: "zh",
    з: "z", и: "y", і: "i", ї: "yi", й: "y", к: "k", л: "l", м: "m", н: "n",
    о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
    ч: "ch", ш: "sh", щ: "shch", ь: "", ю: "yu", я: "ya",
  };
  return name
    .toLowerCase()
    .split("")
    .map((c) => map[c] || c)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

/* ─── GET — single category by id ─── */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(); if (auth.error) return auth.error;
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from("categories").select("*").eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

/* ─── POST — create category ─── */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.name_uk) {
      return NextResponse.json({ error: "name_uk is required" }, { status: 400 });
    }

    const slug = body.slug || generateSlug(body.name_uk) + "-" + Date.now().toString(36);

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name_uk: body.name_uk,
        name_ru: body.name_ru || null,
        slug,
        description_uk: body.description_uk || null,
        description_ru: body.description_ru || null,
        image_url: body.image_url || null,
        position: Number(body.position ?? 0),
        status: body.status || "active",
        parent_cs_cart_id: body.parent_cs_cart_id ? Number(body.parent_cs_cart_id) : null,
        cs_cart_id: body.cs_cart_id || Math.floor(Math.random() * 900000) + 100000,
      })
      .select("id, slug")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, category: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/* ─── PUT — update category ─── */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const textFields = ["name_uk", "name_ru", "slug", "description_uk", "description_ru", "image_url", "status"];
    for (const f of textFields) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    if (body.position !== undefined) update.position = Number(body.position);
    if (body.parent_cs_cart_id !== undefined) update.parent_cs_cart_id = body.parent_cs_cart_id ? Number(body.parent_cs_cart_id) : null;

    const { error } = await supabase.from("categories").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/* ─── DELETE — delete category ─── */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const supabase = createAdminClient();

    // Check if category has products
    const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", id);
    if (count && count > 0) {
      return NextResponse.json({ error: `Неможливо видалити: категорія містить ${count} товарів. Спочатку перемістіть або видаліть товари.` }, { status: 400 });
    }

    // Check if category has children
    const cat = await supabase.from("categories").select("cs_cart_id").eq("id", id).single();
    if (cat.data) {
      const { count: childCount } = await supabase.from("categories").select("id", { count: "exact", head: true }).eq("parent_cs_cart_id", cat.data.cs_cart_id);
      if (childCount && childCount > 0) {
        return NextResponse.json({ error: `Неможливо видалити: категорія має ${childCount} підкатегорій. Спочатку видаліть або перемістіть їх.` }, { status: 400 });
      }
    }

    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/* ─── PATCH — bulk & quick actions ─── */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const supabase = createAdminClient();
    const { action } = body;

    // Toggle single category status
    if (action === "toggle") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const { data: cat } = await supabase.from("categories").select("status").eq("id", id).single();
      if (!cat) return NextResponse.json({ error: "not found" }, { status: 404 });
      const newStatus = cat.status === "active" ? "disabled" : "active";
      await supabase.from("categories").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
      return NextResponse.json({ ok: true, status: newStatus });
    }

    // Bulk status change
    if (action === "bulk-status") {
      const { ids, status } = body;
      if (!ids?.length || !status) return NextResponse.json({ error: "ids and status required" }, { status: 400 });
      const { error } = await supabase.from("categories").update({ status, updated_at: new Date().toISOString() }).in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, affected: ids.length });
    }

    // Bulk delete
    if (action === "bulk-delete") {
      const { ids } = body;
      if (!ids?.length) return NextResponse.json({ error: "ids required" }, { status: 400 });
      // Check products
      const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).in("category_id", ids);
      if (count && count > 0) {
        return NextResponse.json({ error: `Неможливо видалити: ${count} товарів прив'язано до обраних категорій.` }, { status: 400 });
      }
      const { error } = await supabase.from("categories").delete().in("id", ids);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true, deleted: ids.length });
    }

    // Update position
    if (action === "reorder") {
      const { items } = body; // [{id, position}]
      if (!items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });
      for (const item of items) {
        await supabase.from("categories").update({ position: item.position }).eq("id", item.id);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
