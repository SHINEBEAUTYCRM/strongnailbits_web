import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateToken, SESSION_COOKIE } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token обов'язковий" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Find confirmed auth request that hasn't expired
    const { data: authReq } = await supabase
      .from("auth_requests")
      .select("id, team_member_id, status, expires_at")
      .eq("token", token)
      .eq("status", "confirmed")
      .maybeSingle();

    if (!authReq) {
      return NextResponse.json({ error: "Запит не знайдено або не підтверджено" }, { status: 401 });
    }

    // Check expiration
    if (new Date(authReq.expires_at) < new Date()) {
      return NextResponse.json({ error: "Час запиту вийшов" }, { status: 401 });
    }

    // Verify team member is still active
    const { data: member } = await supabase
      .from("team_members")
      .select("id, is_active")
      .eq("id", authReq.team_member_id)
      .eq("is_active", true)
      .maybeSingle();

    if (!member) {
      return NextResponse.json({ error: "Користувач деактивовано" }, { status: 403 });
    }

    // Create session
    const sessionToken = generateToken();

    const { error: sessionError } = await supabase.from("admin_sessions").insert({
      team_member_id: authReq.team_member_id,
      session_token: sessionToken,
    });

    if (sessionError) {
      console.error("[AuthConfirm] Session insert error:", sessionError);
      return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
    }

    // Mark auth request as consumed (prevent reuse)
    await supabase
      .from("auth_requests")
      .update({ status: "expired" })
      .eq("id", authReq.id);

    // Set cookie
    const response = NextResponse.json({ success: true, redirect: "/admin" });
    response.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[AuthConfirm] Error:", err);
    return NextResponse.json({ error: "Помилка сервера" }, { status: 500 });
  }
}
