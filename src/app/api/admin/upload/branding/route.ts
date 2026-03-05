import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const BUCKET = "branding";
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const ALLOWED_TYPES: Record<string, string[]> = {
  logo: ["image/png", "image/svg+xml", "image/webp"],
  favicon: ["image/png", "image/x-icon", "image/vnd.microsoft.icon", "image/svg+xml"],
};

/**
 * POST /api/admin/upload/branding
 * Accepts FormData: file + type (logo|favicon)
 * Uploads to Supabase Storage "branding" bucket,
 * saves public URL to site_settings table.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!type || !["logo", "favicon"].includes(type)) {
      return NextResponse.json({ error: "Invalid type (logo|favicon)" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "Файл завеликий (макс. 2 МБ)" }, { status: 400 });
    }

    const allowed = ALLOWED_TYPES[type];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: `Невірний формат. Дозволені: ${allowed.join(", ")}` },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some((b) => b.name === BUCKET)) {
      await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: MAX_SIZE,
        allowedMimeTypes: [
          "image/png", "image/svg+xml", "image/webp",
          "image/x-icon", "image/vnd.microsoft.icon",
        ],
      });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `${type}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filename, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    const url = `${urlData.publicUrl}?v=${Date.now()}`;

    const settingKey = type === "logo" ? "logo_url" : "favicon_url";
    await supabase
      .from("site_settings")
      .upsert({ key: settingKey, value: JSON.stringify(url), updated_at: new Date().toISOString() }, { onConflict: "key" });

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
