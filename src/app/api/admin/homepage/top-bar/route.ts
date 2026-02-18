import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — list all top bar links sorted by sort_order */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('top_bar_links')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create top bar link */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.label_uk || !body.url) {
      return NextResponse.json({ error: 'label_uk and url are required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('top_bar_links')
      .insert({
        label_uk: body.label_uk,
        label_ru: body.label_ru || null,
        url: body.url,
        position: body.position || 'left',
        icon: body.icon || null,
        sort_order: body.sort_order ?? 0,
        is_enabled: body.is_enabled ?? true,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, link: data });
  } catch (err) {
    console.error('[API:TopBar] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — update single or bulk (array → sort_order + is_enabled per item) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const supabase = createAdminClient();

    // Bulk update: array of { id, sort_order?, is_enabled? }
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        if (!item.id) continue;
        const updates: Record<string, unknown> = {};
        if (item.sort_order !== undefined) updates.sort_order = item.sort_order;
        if (item.is_enabled !== undefined) updates.is_enabled = item.is_enabled;
        updates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
          .from('top_bar_links')
          .update(updates)
          .eq('id', item.id)
          .select('*')
          .single();

        if (error) {
          results.push({ id: item.id, error: error.message });
        } else {
          results.push({ id: item.id, ok: true, link: data });
        }
      }
      return NextResponse.json({ ok: true, results });
    }

    // Single update
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    const allowed = ['label_uk', 'label_ru', 'url', 'position', 'icon', 'sort_order', 'is_enabled'];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('top_bar_links')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, link: data });
  } catch (err) {
    console.error('[API:TopBar] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete top bar link by id */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase.from('top_bar_links').delete().eq('id', body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:TopBar] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
