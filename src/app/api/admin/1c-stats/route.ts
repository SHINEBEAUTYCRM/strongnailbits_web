import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getDefaultTenantId } from "@/lib/integrations/base";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAdmin(); if (auth.error) return auth.error;
    const supabase = createAdminClient();
    const tenantId = await getDefaultTenantId();

    const now = new Date();
    const h24 = new Date(now.getTime() - 86400000).toISOString();
    const d7 = new Date(now.getTime() - 7 * 86400000).toISOString();

    // Parallel queries
    const [
      requests24h,
      requests7d,
      errors24h,
      recentRequests,
      recentErrors,
      productsSynced,
      customersSynced,
      ordersNotSynced,
      documentCount,
      bonusCount,
      priceCount,
      lastProductSync,
      lastCustomerSync,
      lastOrderSync,
    ] = await Promise.all([
      // Total requests 24h
      supabase.from("api_request_log").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("created_at", h24),
      // Total requests 7d
      supabase.from("api_request_log").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("created_at", d7),
      // Errors 24h
      supabase.from("api_request_log").select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId).gte("status_code", 400).gte("created_at", h24),
      // Recent 20 requests
      supabase.from("api_request_log").select("id, method, endpoint, status_code, response_time_ms, error_message, created_at")
        .eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(20),
      // Recent errors
      supabase.from("api_request_log").select("id, method, endpoint, status_code, error_message, request_body, created_at")
        .eq("tenant_id", tenantId).gte("status_code", 400).order("created_at", { ascending: false }).limit(10),
      // Products with external_id (synced from 1C)
      supabase.from("products").select("id", { count: "exact", head: true }).not("external_id", "is", null),
      // Customers with external_id
      supabase.from("profiles").select("id", { count: "exact", head: true }).not("external_id", "is", null),
      // Orders not synced
      supabase.from("orders").select("id", { count: "exact", head: true }).is("synced_at", null),
      // Documents
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      // Bonuses
      supabase.from("bonuses").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      // Customer prices
      supabase.from("customer_prices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId),
      // Last product sync (latest request to /v1/products)
      supabase.from("api_request_log").select("created_at, status_code")
        .eq("tenant_id", tenantId).eq("endpoint", "/v1/products").eq("method", "POST")
        .order("created_at", { ascending: false }).limit(1),
      // Last customer sync
      supabase.from("api_request_log").select("created_at, status_code")
        .eq("tenant_id", tenantId).eq("endpoint", "/v1/customers").eq("method", "POST")
        .order("created_at", { ascending: false }).limit(1),
      // Last order fetch
      supabase.from("api_request_log").select("created_at, status_code")
        .eq("tenant_id", tenantId).eq("endpoint", "/v1/orders/new").eq("method", "GET")
        .order("created_at", { ascending: false }).limit(1),
    ]);

    return NextResponse.json({
      overview: {
        requests_24h: requests24h.count ?? 0,
        requests_7d: requests7d.count ?? 0,
        errors_24h: errors24h.count ?? 0,
        error_rate_24h: (requests24h.count ?? 0) > 0
          ? Math.round(((errors24h.count ?? 0) / (requests24h.count ?? 1)) * 100)
          : 0,
      },
      entities: {
        products_synced: productsSynced.count ?? 0,
        customers_synced: customersSynced.count ?? 0,
        orders_not_synced: ordersNotSynced.count ?? 0,
        documents: documentCount.count ?? 0,
        bonuses: bonusCount.count ?? 0,
        customer_prices: priceCount.count ?? 0,
      },
      last_sync: {
        products: lastProductSync.data?.[0] || null,
        customers: lastCustomerSync.data?.[0] || null,
        orders: lastOrderSync.data?.[0] || null,
      },
      recent_requests: recentRequests.data ?? [],
      recent_errors: recentErrors.data ?? [],
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
