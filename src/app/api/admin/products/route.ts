import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

/* GET — List products with enrichment data */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const supabase = createAdminClient();
    const sp = request.nextUrl.searchParams;

    const offset = parseInt(sp.get('offset') || '0');
    const limit = Math.min(parseInt(sp.get('limit') || '50'), 100);
    const status = sp.get('enrichment_status');
    const fields = sp.get('fields') || 'id,name_uk,sku,slug,brand_id,enrichment_status,ai_metadata,photo_sources,main_image_url,description_uk';

    // Build query
    let query = supabase
      .from('products')
      .select(fields, { count: 'exact' });

    // Filters
    const brandId = sp.get('brand_id');
    const categoryId = sp.get('category_id');
    const search = sp.get('search');
    const productId = sp.get('id');
    const noDesc = sp.get('no_description');
    const noPhoto = sp.get('no_photo');

    if (productId) query = query.eq('id', productId);
    if (brandId) query = query.eq('brand_id', brandId);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (noDesc === '1') query = query.is('description_uk', null);
    if (noPhoto === '1') query = query.is('main_image_url', null);

    if (status === 'enriched') {
      query = query.in('enrichment_status', ['enriched', 'approved']);
    } else if (status === 'error') {
      query = query.eq('enrichment_status', 'error');
    } else if (status === 'approved') {
      query = query.eq('enrichment_status', 'approved');
    }

    if (search) {
      query = query.or(`name_uk.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Join brand names
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (data || []) as any[];
    const brandIds = [...new Set(rows.map((p) => p.brand_id).filter(Boolean))] as string[];
    let brandMap: Record<string, string> = {};
    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from('brands')
        .select('id, name')
        .in('id', brandIds);
      brandMap = Object.fromEntries((brands || []).map((b: { id: string; name: string }) => [b.id, b.name]));
    }

    const products = rows.map((p) => ({
      ...p,
      brand_name: brandMap[p.brand_id as string] || null,
    }));

    return NextResponse.json({ products, total: count || 0 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

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
    const auth = await requireAdmin(); if (auth.error) return auth.error;
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
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    const fields = [
      "name_uk", "name_ru", "slug", "sku", "description_uk", "description_ru",
      "status", "main_image_url", "images", "properties",
      "meta_title", "meta_description",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }

    // FK fields: convert empty string to null (Postgres requires UUID or null)
    const fkFields = ["category_id", "brand_id"];
    for (const f of fkFields) {
      if (body[f] !== undefined) update[f] = body[f] || null;
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
    const auth = await requireAdmin(); if (auth.error) return auth.error;
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
