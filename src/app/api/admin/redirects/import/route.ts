import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const body = await request.json();
  const csv = (body.csv as string) || "";

  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return NextResponse.json({ error: "Empty CSV" }, { status: 400 });
  }

  const firstLine = lines[0].toLowerCase();
  const startIdx = firstLine.includes("from_path") || firstLine.includes("from") ? 1 : 0;

  const errors: string[] = [];
  const rows: Array<{ from_path: string; to_path: string; code: number; is_active: boolean; hits: number }> = [];

  for (let i = startIdx; i < lines.length; i++) {
    const parts = lines[i].split(",").map((p) => p.trim());
    const from_path = parts[0] || "";
    const to_path = parts[1] || "";
    const code = parseInt(parts[2] || "301", 10);

    if (!from_path.startsWith("/")) {
      errors.push(`Row ${i + 1}: from_path must start with / — got "${from_path}"`);
      continue;
    }
    if (!to_path) {
      errors.push(`Row ${i + 1}: to_path is empty`);
      continue;
    }

    rows.push({
      from_path,
      to_path,
      code: code === 302 ? 302 : 301,
      is_active: true,
      hits: 0,
    });
  }

  let imported = 0;
  let skipped = 0;

  if (rows.length > 0) {
    const supabase = createAdminClient();

    for (const row of rows) {
      const { error } = await supabase
        .from("redirects")
        .upsert(row, { onConflict: "from_path", ignoreDuplicates: false });

      if (error) {
        skipped++;
        errors.push(`"${row.from_path}": ${error.message}`);
      } else {
        imported++;
      }
    }

    if (adminUser) {
      await logAction({
        user: adminUser,
        entity: "redirect",
        action: "import",
        after: { imported, skipped, total: rows.length },
        request,
      });
    }
  }

  return NextResponse.json({ imported, skipped, errors });
}
