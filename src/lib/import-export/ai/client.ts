/* ------------------------------------------------------------------ */
/*  AI Import — Claude API client wrapper                            */
/* ------------------------------------------------------------------ */

import Anthropic from "@anthropic-ai/sdk";
import { IMPORT_AI_SYSTEM } from "./prompts";

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("Missing CLAUDE_API_KEY env variable");
  _client = new Anthropic({ apiKey });
  return _client;
}

/**
 * Send a prompt to Claude and get parsed JSON back.
 * Falls back to null if parsing fails.
 */
export async function askClaude<T>(userPrompt: string): Promise<{ result: T | null; raw: string }> {
  const client = getClient();
  const model = process.env.CLAUDE_MODEL || "claude-sonnet-4-20250514";

  const response = await client.messages.create({
    model,
    max_tokens: 4096,
    system: IMPORT_AI_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Try to parse JSON from the response
  try {
    // Sometimes AI wraps JSON in ```json ... ```
    const cleaned = text
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    const parsed = JSON.parse(cleaned) as T;
    return { result: parsed, raw: text };
  } catch {
    console.error("[AI Import] Failed to parse JSON from Claude response:", text.slice(0, 200));
    return { result: null, raw: text };
  }
}
