import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Use request origin to redirect correctly on both localhost and production
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", origin), { status: 302 });
}
