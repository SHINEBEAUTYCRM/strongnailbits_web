import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

/* POST — Create product */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.name_uk || !body.price) {
      return NextResponse.json({ error: "name_uk and price are required" }, { status: 400 });
    }

    const slug = body.slug || generateSlug(body.name_uk) + "-" + Date.now().toString(36);

    const { data, error } = await supabase
      .from("products")
      .insert({
        name_uk: body.name_uk,
        name_ru: body.name_ru || null,
        slug,
        sku: body.sku || null,
        description_uk: body.description_uk || null,
        description_ru: body.description_ru || null,
        price: Number(body.price),
        old_price: body.old_price ? Number(body.old_price) : null,
        wholesale_price: body.wholesale_price ? Number(body.wholesale_price) : null,
        cost_price: body.cost_price ? Number(body.cost_price) : null,
        quantity: Number(body.quantity ?? 0),
        status: body.status || "active",
        main_image_url: body.main_image_url || null,
        images: body.images || [],
        weight: body.weight ? Number(body.weight) : null,
        properties: body.properties || {},
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
        is_featured: Boolean(body.is_featured),
        is_new: Boolean(body.is_new),
        position: Number(body.position ?? 0),
        category_id: body.category_id || null,
        brand_id: body.brand_id || null,
        cs_cart_id: body.cs_cart_id || Math.floor(Math.random() * 900000) + 100000,
      })
      .select("id, slug")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, product: data });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/* PUT — Update product */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fields = [
      "name_uk", "name_ru", "slug", "sku", "description_uk", "description_ru",
      "status", "main_image_url", "images", "properties",
      "meta_title", "meta_description", "category_id", "brand_id",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    const numFields = ["price", "old_price", "wholesale_price", "cost_price", "quantity", "weight", "position"];
    for (const f of numFields) {
      if (body[f] !== undefined) update[f] = body[f] === "" || body[f] === null ? null : Number(body[f]);
    }

    const boolFields = ["is_featured", "is_new"];
    for (const f of boolFields) {
      if (body[f] !== undefined) update[f] = Boolean(body[f]);
    }

    const { error } = await supabase.from("products").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

/* DELETE — Delete product */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const supabase = createAdminClient();
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
