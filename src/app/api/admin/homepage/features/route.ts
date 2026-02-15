import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — list all service features sorted by sort_order */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('service_features')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create service feature */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.title_uk) {
      return NextResponse.json({ error: 'title_uk is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('service_features')
      .insert({
        title_uk: body.title_uk,
        title_ru: body.title_ru || null,
        description_uk: body.description_uk || null,
        description_ru: body.description_ru || null,
        icon: body.icon || null,
        link_url: body.link_url || null,
        color: body.color || '#D6264A',
        sort_order: body.sort_order ?? 0,
        is_enabled: body.is_enabled ?? true,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, feature: data });
  } catch (err) {
    console.error('[API:HomepageFeatures] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — update service feature by id */
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
    const allowed = ['title_uk', 'title_ru', 'description_uk', 'description_ru', 'icon', 'link_url', 'color', 'sort_order', 'is_enabled'];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('service_features')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, feature: data });
  } catch (err) {
    console.error('[API:HomepageFeatures] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete service feature by id */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from('service_features').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:HomepageFeatures] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
