/**
 * API: /api/admin/telegram-webhook-manage
 *
 * GET  — getWebhookInfo (current webhook status)
 * POST — setWebhook
 * DELETE — deleteWebhook
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getServiceField } from "@/lib/integrations/config-resolver";

export const dynamic = "force-dynamic";

async function getBotToken(): Promise<string | null> {
  return getServiceField("telegram-admin", "bot_token");
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const token = await getBotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Bot token not configured" },
      { status: 400 },
    );
  }

  try {
    const [meRes, whRes] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`, {
        signal: AbortSignal.timeout(10000),
      }),
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, {
        signal: AbortSignal.timeout(10000),
      }),
    ]);

    const meData = await meRes.json();
    const whData = await whRes.json();

    return NextResponse.json({
      ok: true,
      bot: meData.ok ? meData.result : null,
      webhook: whData.ok ? whData.result : null,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const token = await getBotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Bot token not configured" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const webhookUrl =
    body.url ||
    `${process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com"}/api/admin/auth/telegram-webhook`;

  const whSecret = process.env.TELEGRAM_WEBHOOK_SECRET || "";

  try {
    const payload: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    };
    if (whSecret) payload.secret_token = whSecret;

    const res = await fetch(
      `https://api.telegram.org/bot${token}/setWebhook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      },
    );

    const data = await res.json();
    return NextResponse.json({
      ok: data.ok,
      description: data.description,
      webhookUrl,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const token = await getBotToken();
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Bot token not configured" },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/deleteWebhook`,
      { signal: AbortSignal.timeout(10000) },
    );
    const data = await res.json();
    return NextResponse.json({ ok: data.ok, description: data.description });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 },
    );
  }
}
