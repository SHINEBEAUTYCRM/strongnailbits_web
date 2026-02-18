import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/claude';
import { buildSeoPrompt, type SeoRequest } from '@/lib/ai/description-prompts';

export async function POST(request: NextRequest) {
  try {
    const body: SeoRequest = await request.json();

    if (!body.productName || !body.targetLang) {
      return NextResponse.json(
        { error: 'Missing required fields: productName, targetLang' },
        { status: 400 }
      );
    }

    const { system, user } = buildSeoPrompt(body);

    const result = await callClaude({
      system,
      messages: [{ role: 'user', content: user }],
      maxTokens: 500,
      fast: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'SEO generation failed' },
        { status: 500 }
      );
    }

    let parsed: { meta_title: string; meta_description: string };
    try {
      const cleaned = result.text.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON', raw: result.text },
        { status: 500 }
      );
    }

    return NextResponse.json({
      meta_title: parsed.meta_title || '',
      meta_description: parsed.meta_description || '',
      tokens_used: (result.inputTokens || 0) + (result.outputTokens || 0),
    });
  } catch (err) {
    console.error('[AI Generate SEO]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
