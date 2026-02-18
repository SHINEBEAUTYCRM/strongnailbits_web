/**
 * Claude AI Client for ShineShop
 *
 * Provides access to Anthropic Claude API for:
 * - Message personalization
 * - Customer chat-bot
 * - Funnel analysis & recommendations
 * - Lead scoring
 * - Content generation
 */

import { getServiceConfig } from '@/lib/integrations/config-resolver';

const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-20250514";
const FAST_MODEL = "claude-3-5-haiku-latest";

// ────── Config ──────

async function getConfig(): Promise<{ apiKey: string; model: string }> {
  const config = await getServiceConfig('claude-api');
  if (!config?.api_key) {
    throw new Error('Claude API not configured. Set CLAUDE_API_KEY or configure in admin.');
  }
  return {
    apiKey: config.api_key,
    model: config.model || DEFAULT_MODEL,
  };
}

/** Check if Claude AI is configured (non-throwing) */
export async function isAIConfigured(): Promise<boolean> {
  try {
    await getConfig();
    return true;
  } catch (err) {
    console.error('[Claude] Config check failed:', err);
    return false;
  }
}

// ────── Core API Call ──────

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

interface ClaudeOptions {
  system?: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
  fast?: boolean; // Use Haiku for quick/cheap tasks
}

interface ClaudeResponse {
  success: boolean;
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

/** Call Claude API */
export async function callClaude(
  options: ClaudeOptions,
): Promise<ClaudeResponse> {
  try {
    const { apiKey, model } = await getConfig();
    const useModel = options.fast ? FAST_MODEL : model;

    const body: Record<string, unknown> = {
      model: useModel,
      max_tokens: options.maxTokens || 1024,
      messages: options.messages,
    };

    if (options.system) {
      body.system = options.system;
    }
    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const res = await fetch(ANTHROPIC_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();

    if (data.error) {
      console.error("[Claude] API error:", data.error);
      return {
        success: false,
        text: "",
        error: data.error.message || "Claude API error",
      };
    }

    const text =
      data.content?.find((c: { type: string }) => c.type === "text")?.text ||
      "";

    return {
      success: true,
      text,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  } catch (err) {
    console.error("[Claude] Request failed:", err);
    return {
      success: false,
      text: "",
      error: err instanceof Error ? err.message : "Claude request failed",
    };
  }
}

// ────── Convenience Helpers ──────

/** Quick single-shot prompt */
export async function askClaude(
  prompt: string,
  options?: {
    system?: string;
    maxTokens?: number;
    fast?: boolean;
    temperature?: number;
  },
): Promise<string> {
  const result = await callClaude({
    system: options?.system,
    messages: [{ role: "user", content: prompt }],
    maxTokens: options?.maxTokens || 1024,
    fast: options?.fast,
    temperature: options?.temperature,
  });

  return result.text || "";
}

/** Chat with Claude (multi-turn) */
export async function chatWithClaude(
  messages: ClaudeMessage[],
  options?: {
    system?: string;
    maxTokens?: number;
    fast?: boolean;
  },
): Promise<ClaudeResponse> {
  return callClaude({
    system: options?.system,
    messages,
    maxTokens: options?.maxTokens || 2048,
    fast: options?.fast,
  });
}
