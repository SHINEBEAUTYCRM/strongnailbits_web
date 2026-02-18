// ================================================================
//  API: /api/admin/serpstat
//  Proxy для Serpstat API v4 — всі запити через сервер
//  POST { method, params }
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDefaultTenantId } from "@/lib/integrations/base";
import { decryptConfig } from "@/lib/integrations/crypto";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const SERPSTAT_API = "https://api.serpstat.com/v4";

async function getSerpstatToken(): Promise<string | null> {
  try {
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("integration_keys")
      .select("config, is_active")
      .eq("tenant_id", tenantId)
      .eq("service_slug", "serpstat")
      .eq("is_active", true)
      .maybeSingle();

    if (!data?.config) return null;
    const decrypted = await decryptConfig(data.config as Record<string, string>);
    return decrypted.api_key || null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { method, params } = body;

    if (!method) {
      return NextResponse.json({ error: "Missing method" }, { status: 400 });
    }

    const token = await getSerpstatToken();
    if (!token) {
      return NextResponse.json(
        { error: "Serpstat API ключ не налаштовано. Перейдіть до Інтеграцій → Serpstat." },
        { status: 400 },
      );
    }

    const { token: _removeToken, ...cleanParams } = params || {};
    const payload = {
      id: "1",
      method,
      params: cleanParams,
    };

    const res = await fetch(`${SERPSTAT_API}?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json(
        { error: data.error.message || "Serpstat API error" },
        { status: 400 },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    );
  }
}
