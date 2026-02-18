import { NextRequest, NextResponse } from 'next/server';
import { callClaude } from '@/lib/ai/claude';
import { buildSystemPrompt, buildUserPrompt, type GenerateRequest } from '@/lib/ai/description-prompts';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.action || !body.targetLang || !body.productName) {
      return NextResponse.json(
        { error: 'Missing required fields: action, targetLang, productName' },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt(body);
    const userPrompt = buildUserPrompt(body);

    if (!userPrompt) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const result = await callClaude({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      maxTokens: 2000,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'AI generation failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      html: result.text,
      tokens_used: (result.inputTokens || 0) + (result.outputTokens || 0),
    });
  } catch (err) {
    console.error('[AI Generate Description]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
