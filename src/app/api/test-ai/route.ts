/**
 * Test endpoint: verify Claude AI is working
 * GET /api/test-ai
 */

import { NextResponse } from "next/server";
import { isAIConfigured, askClaude } from "@/lib/ai/claude";
import { getServiceField } from "@/lib/integrations/config-resolver";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const apiKey = await getServiceField('claude-api', 'api_key');
  const configured = await isAIConfigured();

  const result: Record<string, unknown> = {
    hasKey: !!apiKey,
    isConfigured: configured,
    keyPrefix: apiKey?.slice(0, 12) || "not set",
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
