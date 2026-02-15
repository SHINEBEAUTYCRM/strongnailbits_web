import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — list all or single by ?id= */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const id = request.nextUrl.searchParams.get('id');

  if (id) {
    const { data, error } = await supabase
      .from('product_showcases')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('product_showcases')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create showcase */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.code || !body.title_uk) {
      return NextResponse.json({ error: 'code and title_uk are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('product_showcases')
      .insert({
        code: body.code,
        title_uk: body.title_uk,
        title_ru: body.title_ru || null,
        subtitle_uk: body.subtitle_uk || null,
        subtitle_ru: body.subtitle_ru || null,
        source_type: body.source_type || 'rule',
        rule: body.rule || null,
        sku_list: body.sku_list || null,
        product_limit: body.product_limit ?? 14,
        cta_text_uk: body.cta_text_uk || null,
        cta_text_ru: body.cta_text_ru || null,
        cta_url: body.cta_url || null,
        sort_order: body.sort_order ?? 0,
        is_enabled: body.is_enabled ?? true,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, showcase: data });
  } catch (err) {
    console.error('[API:ProductShowcases] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — update showcase by body.id */
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
    const allowed = [
      'code', 'title_uk', 'title_ru', 'subtitle_uk', 'subtitle_ru',
      'source_type', 'rule', 'sku_list', 'product_limit',
      'cta_text_uk', 'cta_text_ru', 'cta_url',
      'sort_order', 'is_enabled',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('product_showcases')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, showcase: data });
  } catch (err) {
    console.error('[API:ProductShowcases] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete showcase by body.id (check references first) */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Get the showcase code first
    const { data: showcase, error: fetchErr } = await supabase
      .from('product_showcases')
      .select('code')
      .eq('id', body.id)
      .single();

    if (fetchErr || !showcase) {
      return NextResponse.json({ error: 'Showcase not found' }, { status: 404 });
    }

    // Check if showcase code is referenced in any homepage section config
    const { data: refs } = await supabase
      .from('homepage_sections')
      .select('id, title')
      .filter('config->>showcase_code', 'eq', showcase.code);

    if (refs && refs.length > 0) {
      const sectionNames = refs.map((r) => r.title || r.id).join(', ');
      return NextResponse.json(
        { error: `Вітрина використовується в секціях: ${sectionNames}. Спочатку змініть секції.` },
        { status: 400 },
      );
    }

    const { error } = await supabase
      .from('product_showcases')
      .delete()
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:ProductShowcases] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
