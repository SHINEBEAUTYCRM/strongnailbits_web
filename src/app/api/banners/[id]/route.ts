// GET    /api/banners/:id — get single banner
// PATCH  /api/banners/:id — update banner
// DELETE /api/banners/:id — delete banner + cleanup storage
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("banners")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const body = await request.json();

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("banners")
      .update(body)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, banner: data });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

/**
 * Extract the storage path from a full Supabase Storage URL.
 * URL pattern: .../storage/v1/object/public/<bucket>/<path>
 * We need <bucket> and <path> separately.
 */
function extractStoragePath(url: string): { bucket: string; path: string } | null {
  const marker = "/storage/v1/object/public/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;

  const rest = url.slice(idx + marker.length);
  const slashIdx = rest.indexOf("/");
  if (slashIdx === -1) return null;

  return {
    bucket: rest.slice(0, slashIdx),
    path: rest.slice(slashIdx + 1),
  };
}

export async function DELETE(
  _request: NextRequest,
  { params }: RouteContext,
) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  // Fetch banner first to get image URLs
  const { data: banner, error: fetchError } = await supabase
    .from("banners")
    .select("image_desktop, image_mobile")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  // Delete images from Storage if they exist
  const imageUrls = [banner.image_desktop, banner.image_mobile].filter(Boolean) as string[];
  for (const url of imageUrls) {
    const parsed = extractStoragePath(url);
    if (parsed) {
      await supabase.storage.from(parsed.bucket).remove([parsed.path]);
    }
  }

  // Delete the banner record
  const { error: deleteError } = await supabase
    .from("banners")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
