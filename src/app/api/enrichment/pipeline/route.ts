// POST /api/enrichment/pipeline
// Body: { brand_id?, scope, steps }
// Response: Server-Sent Events with PipelineProgress

import { NextRequest } from 'next/server';
import { getAdminUser } from '@/lib/admin/auth';
import { runPipeline } from '@/lib/enrichment/pipeline';
import type { PipelineConfig } from '@/lib/enrichment/types';

export const maxDuration = 300; // 5 min timeout for Vercel

export async function POST(request: NextRequest) {
  const admin = await getAdminUser();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();

  const config: PipelineConfig = {
    brand_id: body.brand_id || undefined,
    scope: body.scope || 'missing',
    steps: {
      parse: body.steps?.parse ?? true,
      download_photos: body.steps?.download_photos ?? true,
      ai_vision: body.steps?.ai_vision ?? true,
      ai_enrichment: body.steps?.ai_enrichment ?? true,
      embeddings: body.steps?.embeddings ?? true,
    },
  };

  // Server-Sent Events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const progress of runPipeline(config)) {
          const data = `data: ${JSON.stringify(progress)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        const errorData = `data: ${JSON.stringify({
          error: err instanceof Error ? err.message : 'Pipeline failed',
        })}\n\n`;
        controller.enqueue(encoder.encode(errorData));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
