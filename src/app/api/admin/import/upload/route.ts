import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { parseFile } from "@/lib/import-export/parsers";

export const dynamic = "force-dynamic";

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_EXTENSIONS = ["xlsx", "xls", "xlsm", "xlsb", "csv", "tsv", "txt"];

/**
 * POST /api/admin/import/upload
 * Accepts a file via FormData, parses it, and returns structured rows.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Файл не надано" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Файл завеликий (макс. 20 МБ)" },
        { status: 400 },
      );
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        {
          error: `Непідтримуваний формат .${ext}. Дозволені: ${ALLOWED_EXTENSIONS.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    const parsed = parseFile(buffer, file.name);

    return NextResponse.json({
      ok: true,
      file: parsed,
    });
  } catch (err) {
    console.error("[Import Upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Помилка обробки файлу" },
      { status: 500 },
    );
  }
}
