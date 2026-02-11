import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: NextRequest) {
  try {
    const { ids, action } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided" }, { status: 400 });
    }

    const supabase = createAdminClient();

    if (action === "enable") {
      const { error } = await supabase
        .from("products")
        .update({ status: "active" })
        .in("id", ids);
      if (error) throw error;
      return NextResponse.json({ success: true, updated: ids.length, action: "enabled" });
    }

    if (action === "disable") {
      const { error } = await supabase
        .from("products")
        .update({ status: "disabled" })
        .in("id", ids);
      if (error) throw error;
      return NextResponse.json({ success: true, updated: ids.length, action: "disabled" });
    }

    if (action === "delete") {
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", ids);
      if (error) throw error;
      return NextResponse.json({ success: true, deleted: ids.length, action: "deleted" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("[Bulk Products]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
