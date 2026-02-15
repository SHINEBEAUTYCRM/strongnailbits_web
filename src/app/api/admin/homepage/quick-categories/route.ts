import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — list all with joined category data, sorted by sort_order */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('quick_categories')
    .select('*, categories(id, name_uk, name_ru, slug, image_url)')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* POST — create quick category */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('quick_categories')
      .insert({
        category_id: body.category_id || null,
        title_override_uk: body.title_override_uk || null,
        title_override_ru: body.title_override_ru || null,
        image_override: body.image_override || null,
        sort_order: body.sort_order ?? 0,
        is_enabled: body.is_enabled ?? true,
      })
      .select('*, categories(id, name_uk, name_ru, slug, image_url)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, quickCategory: data });
  } catch (err) {
    console.error('[API:QuickCategories] POST error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* PUT — bulk update (array) or single update (object with id) */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    const supabase = createAdminClient();

    // Bulk update — array (sort_order)
    if (Array.isArray(body)) {
      const results = [];
      for (const item of body) {
        if (!item.id) continue;
        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (item.sort_order !== undefined) updates.sort_order = item.sort_order;

        const { data, error } = await supabase
          .from('quick_categories')
          .update(updates)
          .eq('id', item.id)
          .select('*')
          .single();

        if (error) {
          results.push({ id: item.id, error: error.message });
        } else {
          results.push({ id: item.id, ok: true, quickCategory: data });
        }
      }
      return NextResponse.json({ ok: true, results });
    }

    // Single update
    if (!body.id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    const allowed = [
      'category_id', 'title_override_uk', 'title_override_ru',
      'image_override', 'sort_order', 'is_enabled',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('quick_categories')
      .update(updates)
      .eq('id', body.id)
      .select('*, categories(id, name_uk, name_ru, slug, image_url)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, quickCategory: data });
  } catch (err) {
    console.error('[API:QuickCategories] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/* DELETE — delete quick category by body.id */
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
      .from('quick_categories')
      .delete()
      .eq('id', body.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[API:QuickCategories] DELETE error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
