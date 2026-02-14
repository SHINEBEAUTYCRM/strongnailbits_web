import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

function generateSlug(name: string): string {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh',
    з: 'z', и: 'y', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
    о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts',
    ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'yu', я: 'ya',
  };
  return name
    .toLowerCase()
    .split('')
    .map((c) => map[c] || c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

const BRAND_FIELDS = 'id, cs_cart_id, name, slug, logo_url, banner_url, description_uk, description_ru, country, website_url, is_featured, position, status, meta_title, meta_description, photo_source_url, info_source_url, parse_config, created_at, updated_at';

/* GET — list or single by ?id= */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const { data, error } = await supabase.from('brands').select(BRAND_FIELDS).eq('id', id).single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase.from('brands').select(BRAND_FIELDS).order('position', { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create brand */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const slug = body.slug || generateSlug(body.name) + '-' + Date.now().toString(36);

    const { data, error } = await supabase
      .from('brands')
      .insert({
        name: body.name,
        slug,
        description_uk: body.description_uk || null,
        description_ru: body.description_ru || null,
        logo_url: body.logo_url || null,
        banner_url: body.banner_url || null,
        country: body.country || null,
        website_url: body.website_url || null,
        is_featured: body.is_featured ?? false,
        position: Number(body.position ?? 0),
        status: body.status || 'active',
        meta_title: body.meta_title || null,
        meta_description: body.meta_description || null,
      })
      .select(BRAND_FIELDS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, brand: data });
  } catch (err) {
    console.error('[API:Brands] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — update brand */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updates: Record<string, unknown> = {};
    const allowed = ['name', 'slug', 'description_uk', 'description_ru', 'logo_url', 'banner_url', 'country', 'website_url', 'is_featured', 'position', 'status', 'meta_title', 'meta_description', 'photo_source_url', 'info_source_url', 'parse_config'];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    if ('position' in updates) updates.position = Number(updates.position);
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', body.id)
      .select(BRAND_FIELDS)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, brand: data });
  } catch (err) {
    console.error('[API:Brands] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete brand */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if brand has products
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('brand_id', body.id);

    if (count && count > 0) {
      return NextResponse.json({ error: `Бренд має ${count} товарів. Спочатку змініть бренд у цих товарах.` }, { status: 400 });
    }

    const { error } = await supabase.from('brands').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:Brands] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
