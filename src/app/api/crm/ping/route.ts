// ================================================================
//  GET /api/crm/ping — перевірка з'єднання CRM ↔ Strong Nail Bits
// ================================================================

import { NextRequest } from 'next/server';
import { requireCrmAuth, handleCorsOptions, crmJson } from '@/lib/crm-auth';

export const dynamic = 'force-dynamic';

export async function OPTIONS(req: NextRequest) {
  return handleCorsOptions(req);
}

export async function GET(req: NextRequest) {
  const authError = await requireCrmAuth(req);
  if (authError) return authError;

  return crmJson({
    status: 'ok',
    shop: 'Strong Nail Bits B2B',
    version: '1.0',
    timestamp: new Date().toISOString(),
  });
}
