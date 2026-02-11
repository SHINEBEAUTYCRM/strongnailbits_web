// POST /api/enrichment/approve
// Body: { product_ids: string[] }
// Changes status → 'approved'

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { product_ids } = body;

  if (!Array.isArray(product_ids) || product_ids.length === 0) {
    return NextResponse.json({ error: 'product_ids array is required' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from('products')
    .update({
      enrichment_status: 'approved',
      enrichment_date: new Date().toISOString(),
      enriched_by: admin.email,
    })
    .in('id', product_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log (bulk insert)
  await supabase.from('enrichment_log').insert(
    product_ids.map((id: string) => ({
      product_id: id,
      action: 'approve',
      status: 'success',
      details: { approved_by: admin.email },
    })),
  );

  return NextResponse.json({
    success: true,
    approved: product_ids.length,
  });
}
