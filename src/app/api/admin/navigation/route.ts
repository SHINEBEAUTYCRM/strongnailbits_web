import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin/auth";
import { getMenuItems, getMenus, saveMenuItems } from "@/lib/admin/navigation";
import { logAction } from "@/lib/admin/audit";

export async function GET(req: Request) {
  const user = await getAdminUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const menuHandle = url.searchParams.get("menu");

  if (menuHandle) {
    const result = await getMenuItems(menuHandle);
    return NextResponse.json(result);
  }

  const menus = await getMenus();
  return NextResponse.json({ menus });
}

export async function PUT(req: Request) {
  const user = await getAdminUser();
  if (!user || !["owner", "admin", "content_manager"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    await saveMenuItems(body.menu_id, body.items);
    await logAction({
      user,
      entity: "menu",
      entity_id: body.menu_id,
      action: "update",
      after: { items_count: body.items?.length ?? 0 },
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
