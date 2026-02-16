import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/auth/check?token=xxx
 * Polling fallback — check auth_request status by token
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ status: "invalid" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: authReq } = await supabase
      .from("auth_requests")
      .select("status, expires_at")
      .eq("token", token)
      .maybeSingle();

    if (!authReq) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    // Check if expired by time
    if (
      authReq.status === "pending" &&
      new Date(authReq.expires_at) < new Date()
    ) {
      return NextResponse.json({ status: "expired" });
    }

    return NextResponse.json({ status: authReq.status });
  } catch (err) {
    console.error("[AuthCheck] Error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
