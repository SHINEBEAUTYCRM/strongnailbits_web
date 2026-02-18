import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/admin/requireAdmin';

export const dynamic = 'force-dynamic';

/* GET — single by ?code= or list all */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();
  const code = request.nextUrl.searchParams.get('code');

  if (code) {
    const { data, error } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('code', code)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });
    return NextResponse.json(data);
  }

  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .order('code', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

/* PUT — update content block by id or code */
export async function PUT(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const body = await request.json();
    if (!body.id && !body.code) {
      return NextResponse.json({ error: 'id or code is required' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const updates: Record<string, unknown> = {};
    const allowed = [
      'title_uk', 'title_ru', 'subtitle_uk', 'subtitle_ru',
      'body_uk', 'body_ru', 'button_text_uk', 'button_text_ru',
      'button_url', 'tags', 'bg_color', 'text_color', 'image_url', 'is_enabled',
    ];

    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates[key] = body[key];
      }
    }

    updates.updated_at = new Date().toISOString();

    let query = supabase.from('content_blocks').update(updates);

    if (body.id) {
      query = query.eq('id', body.id);
    } else {
      query = query.eq('code', body.code);
    }

    const { data, error } = await query.select('*').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, block: data });
  } catch (err) {
    console.error('[API:ContentBlocks] PUT error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
