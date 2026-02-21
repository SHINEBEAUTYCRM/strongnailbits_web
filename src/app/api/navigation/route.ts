import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 300;

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function GET(req: Request) {
  const url = new URL(req.url);
  const menu = url.searchParams.get("menu") || "header";

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("v_navigation")
    .select("*")
    .eq("menu_handle", menu)
    .order("position", { ascending: true });

  const items = data ?? [];

  const map = new Map<string, any>();
  const roots: any[] = [];

  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }
  for (const item of items) {
    const node = map.get(item.id)!;
    if (item.parent_id && map.has(item.parent_id)) {
      map.get(item.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return NextResponse.json(roots, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
  });
}
