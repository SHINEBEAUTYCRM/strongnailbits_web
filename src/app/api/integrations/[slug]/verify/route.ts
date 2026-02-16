// ================================================================
//  API: /api/integrations/[slug]/verify
//  POST — верифікувати і зберегти ключі інтеграції
//  Кастомна перевірка для сервісів з API (Serpstat, AlphaSMS, тощо)
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SimpleKeyIntegration } from "@/lib/integrations/base";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { slug } = await params;
  const { config } = await request.json();

  if (!config || typeof config !== "object") {
    return NextResponse.json({ success: false, message: "Missing config" }, { status: 400 });
  }

  const requiredKeys = Object.keys(config).filter((k) => config[k]);

  // —— Serpstat: перевірка токена через API v4 ——
  if (slug === "serpstat" && config.api_key) {
    try {
      const serpRes = await fetch("https://api.serpstat.com/v4", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: "1",
          method: "SerpstatDomainProcedure.getDomainsInfo",
          params: {
            token: config.api_key,
            domains: ["google.com"],
            se: "g_ua",
          },
        }),
        signal: AbortSignal.timeout(15000),
      });

      const serpData = await serpRes.json();

      if (serpData.error) {
        const integration = new SimpleKeyIntegration(slug, requiredKeys);
        await integration.verifyAndSave(config);
        return NextResponse.json({
          success: false,
          message: `Serpstat: ${serpData.error.message || "невірний API ключ"}`,
        });
      }

      // Зберегти верифіковану конфігурацію
      const integration = new SimpleKeyIntegration(slug, requiredKeys);
      await integration.verifyAndSave(config);

      const leftLines = serpData.result?.summary_info?.left_lines;
      return NextResponse.json({
        success: true,
        message: `Serpstat підключено!${leftLines ? ` Залишок кредитів: ${leftLines.toLocaleString()}` : ""}`,
        details: { left_lines: leftLines },
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        message: `Serpstat: помилка з'єднання — ${err instanceof Error ? err.message : "timeout"}`,
      });
    }
  }

  // —— Базова верифікація для інших сервісів ——
  try {
    const integration = new SimpleKeyIntegration(slug, requiredKeys);
    const result = await integration.verifyAndSave(config);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: err instanceof Error ? err.message : "Помилка верифікації",
    });
  }
}
