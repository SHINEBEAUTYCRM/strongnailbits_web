// ================================================================
//  API: /api/integrations/keys
//  PUT  — зберегти конфігурацію інтеграції (зашифровану)
//  DELETE — деактивувати інтеграцію
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { SimpleKeyIntegration } from "@/lib/integrations/base";

export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { slug, config } = await request.json();

    if (!slug || !config) {
      return NextResponse.json({ error: "Missing slug or config" }, { status: 400 });
    }

    const requiredKeys = Object.keys(config).filter((k) => config[k]);
    const integration = new SimpleKeyIntegration(slug, requiredKeys);
    await integration.verifyAndSave(config);

    return NextResponse.json({ success: true, message: "Ключі збережено" });
  } catch (err) {
    console.error("[API:integrations/keys] PUT error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Помилка збереження" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const { slug } = await request.json();

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const { getDefaultTenantId } = await import("@/lib/integrations/base");
    const tenantId = await getDefaultTenantId();
    const supabase = createAdminClient();

    await supabase
      .from("integration_keys")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .eq("service_slug", slug);

    return NextResponse.json({ success: true, message: "Інтеграцію деактивовано" });
  } catch (err) {
    console.error("[API:integrations/keys] DELETE error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Помилка деактивації" },
      { status: 500 },
    );
  }
}
