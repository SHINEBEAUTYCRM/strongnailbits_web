import { NextRequest, NextResponse } from "next/server";
import { getCategoryTree, type CategoryNode } from "@/lib/categories/tree";

export const dynamic = "force-dynamic";

function summarize(node: CategoryNode, depth = 0): object {
  return {
    name: node.name_uk,
    cs_cart_id: node.cs_cart_id,
    position: node.position,
    product_count: node.product_count,
    children_count: node.children.length,
    ...(depth < 2 && node.children.length > 0
      ? { children: node.children.map((c) => summarize(c, depth + 1)) }
      : {}),
  };
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey || token !== serviceRoleKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tree = await getCategoryTree();

  return NextResponse.json({
    root_count: tree.length,
    roots: tree.map((r) => summarize(r)),
  });
}
