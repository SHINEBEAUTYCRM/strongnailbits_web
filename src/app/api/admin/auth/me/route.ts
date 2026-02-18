/**
 * GET /api/admin/auth/me — поточний авторизований користувач
 */

import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getAdminUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(user);
}
