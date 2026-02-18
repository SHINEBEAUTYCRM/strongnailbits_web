import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — active deal, single by id, or list all */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const id = request.nextUrl.searchParams.get('id');
  const active = request.nextUrl.searchParams.get('active');

  // Active deal only
  if (active === 'true') {
    const { data, error } = await supabase
      .from('deal_of_day')
      .select('*')
      .eq('is_enabled', true)
      .gt('end_at', new Date().toISOString())
      .limit(1)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  // Single by id
  if (id) {
    const { data, error } = await supabase
      .from('deal_of_day')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  // List all
  const { data, error } = await supabase
    .from('deal_of_day')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create deal */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.title_uk || !body.end_at) {
      return NextResponse.json({ error: 'title_uk and end_at are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('deal_of_day')
      .insert({
        title_uk: body.title_uk,
        title_ru: body.title_ru || null,
        subtitle_uk: body.subtitle_uk || null,
        subtitle_ru: body.subtitle_ru || null,
        end_at: body.end_at,
        product_ids: body.product_ids || null,
        category_id: body.category_id || null,
        cta_text_uk: body.cta_text_uk || null,
        cta_url: body.cta_url || null,
        bg_color: body.bg_color || null,
        is_enabled: body.is_enabled ?? true,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deal: data });
  } catch (err) {
    console.error('[API:DealOfDay] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — update deal by body.id */
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
      'title_uk', 'title_ru', 'subtitle_uk', 'subtitle_ru',
      'end_at', 'product_ids', 'category_id',
      'cta_text_uk', 'cta_url', 'bg_color', 'is_enabled',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('deal_of_day')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, deal: data });
  } catch (err) {
    console.error('[API:DealOfDay] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete deal by body.id */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('deal_of_day')
      .delete()
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:DealOfDay] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
