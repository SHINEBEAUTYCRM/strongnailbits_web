import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — list all homepage sections sorted by sort_order */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('homepage_sections')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* PUT — bulk update (array) or single update (object with id) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const supabase = createAdminClient();

    // Bulk update — array of sections
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        if (!item.id) continue;
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (item.sort_order !== undefined) updates.sort_order = item.sort_order;
        if (item.is_enabled !== undefined) updates.is_enabled = item.is_enabled;
        if (item.config !== undefined) updates.config = item.config;

        const { data, error } = await supabase
          .from('homepage_sections')
          .update(updates)
          .eq('id', item.id)
          .select('*')
          .single();

        if (error) {
          results.push({ id: item.id, error: error.message });
        } else {
          results.push({ id: item.id, ok: true, section: data });
        }
      }
      return NextResponse.json({ ok: true, results });
    }

    // Single update — object with id
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    const allowed = ['sort_order', 'is_enabled', 'config', 'title'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    const { data, error } = await supabase
      .from('homepage_sections')
      .update(updates)
      .eq('id', body.id)
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, section: data });
  } catch (err) {
    console.error('[API:HomepageSections] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* POST — create new homepage section */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    const { data: last } = await supabase
      .from('homepage_sections')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (last?.sort_order ?? 0) + 10;

    const insert = {
      code: body.code,
      title: body.title || body.code,
      section_type: body.section_type || 'product_showcase',
      sort_order: body.sort_order ?? nextOrder,
      is_enabled: body.is_enabled ?? true,
      config: body.config || {},
    };

    const { data, error } = await supabase
      .from('homepage_sections')
      .insert(insert)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, section: data }, { status: 201 });
  } catch (err) {
    console.error('[API:Sections] Create failed:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

/* DELETE — remove homepage section */
export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { error } = await supabase
      .from('homepage_sections')
      .delete()
      .eq('id', body.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:Sections] Delete failed:', err);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
