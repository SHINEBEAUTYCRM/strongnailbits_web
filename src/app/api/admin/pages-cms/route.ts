import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getAdminUser } from "@/lib/admin/auth";
import { logAction } from "@/lib/admin/audit";
import { slugify } from "@/utils/slugify";

export const dynamic = "force-dynamic";

/* GET — list pages */
export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const sp = request.nextUrl.searchParams;
  const status = sp.get("status") || "all";
  const search = sp.get("search")?.trim();

  const supabase = createAdminClient();
  let query = supabase
    .from("pages")
    .select("id, title_uk, title_ru, slug, status, template, position, published_at, updated_at, created_at")
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("status", status);
  }
  if (search) {
    query = query.or(`title_uk.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ pages: data ?? [] });
}

/* POST — create page */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  const adminUser = await getAdminUser();

  const body = await request.json();
  const { title_uk } = body;

  if (!title_uk?.trim()) {
    return NextResponse.json({ error: "title_uk is required" }, { status: 400 });
  }

  const slug = body.slug?.trim() || slugify(title_uk) || `page-${Date.now()}`;

  const supabase = createAdminClient();

  const { data: dup } = await supabase.from("pages").select("id").eq("slug", slug).single();
  if (dup) {
    return NextResponse.json({ error: `Slug "${slug}" already exists` }, { status: 409 });
  }

  const now = new Date().toISOString();
  const status = body.status || "draft";

  const row = {
    title_uk: title_uk.trim(),
    title_ru: body.title_ru?.trim() || null,
    slug,
    content_uk: body.content_uk || null,
    content_ru: body.content_ru || null,
    meta_title_uk: body.meta_title_uk || null,
    meta_title_ru: body.meta_title_ru || null,
    meta_description_uk: body.meta_description_uk || null,
    meta_description_ru: body.meta_description_ru || null,
    status,
    template: body.template || "default",
    position: body.position ?? 0,
    author_id: auth.user.id,
    published_at: status === "published" ? now : null,
  };

  const { data: page, error } = await supabase.from("pages").insert(row).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (adminUser) {
    await logAction({
      user: adminUser,
      entity: "page",
      entity_id: page.id,
      action: "create",
      after: row,
      request,
    });
  }

  return NextResponse.json({ ok: true, page }, { status: 201 });
}
