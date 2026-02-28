import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");

    if (!token) {
      return NextResponse.json({ status: "invalid" }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: authReq } = await supabase
      .from("auth_requests")
      .select("status, type, expires_at")
      .eq("token", token)
      .in("type", ["client", "client_register"])
      .maybeSingle();

    if (!authReq) {
      return NextResponse.json({ status: "not_found" }, { status: 404 });
    }

    if (authReq.status === "pending" && new Date(authReq.expires_at) < new Date()) {
      return NextResponse.json({ status: "expired", type: authReq.type });
    }

    return NextResponse.json({ status: authReq.status, type: authReq.type });
  } catch (err) {
    console.error("[ClientAuthCheck] Error:", err);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
