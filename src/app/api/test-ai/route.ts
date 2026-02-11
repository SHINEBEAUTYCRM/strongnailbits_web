/**
 * Test endpoint: verify Claude AI is working
 * GET /api/test-ai
 */

import { NextResponse } from "next/server";
import { isAIConfigured, askClaude } from "@/lib/ai/claude";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const hasKey = !!process.env.CLAUDE_API_KEY;
  const hasAltKey = !!process.env.ANTHROPIC_API_KEY;
  const configured = await isAIConfigured();

  const result: Record<string, unknown> = {
    hasEnvKey: hasKey,
    hasAltKey: hasAltKey,
    isConfigured: configured,
    keyPrefix: process.env.CLAUDE_API_KEY?.slice(0, 12) || "not set",
  };

  if (configured) {
    try {
      // Test raw callClaude to see full response
      const { callClaude } = await import("@/lib/ai/claude");
      const fullResult = await callClaude({
        messages: [{ role: "user", content: "Скажи: привіт!" }],
        maxTokens: 50,
        fast: true,
      });
      result.aiResult = fullResult;
      result.aiWorking = fullResult.success;
    } catch (err) {
      result.aiError = err instanceof Error ? err.message : String(err);
      result.aiWorking = false;
    }
  }

  return NextResponse.json(result);
}
