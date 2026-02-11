// POST /api/enrichment/auto-detect
// Body: { source_url }
// Response: { selectors, sample_product_url, confidence }

import { NextRequest, NextResponse } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { autoDetectSelectors } from '@/lib/enrichment/auto-detect';

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { source_url } = body;

  if (!source_url) {
    return NextResponse.json({ error: 'source_url is required' }, { status: 400 });
  }

  try {
    const result = await autoDetectSelectors(source_url);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      error: err instanceof Error ? err.message : 'Auto-detect failed',
    }, { status: 500 });
  }
}
