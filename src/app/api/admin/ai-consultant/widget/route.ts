import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/requireAdmin";

export const dynamic = "force-dynamic";

const ALLOWED_DESIGN_FIELDS = [
  "position", "offset_x", "offset_y", "width", "height",
  "mobile_fullscreen", "button_size", "button_icon", "button_icon_open",
  "primary_color", "secondary_color", "bg_color", "text_color", "manager_color",
  "welcome_title", "welcome_subtitle", "welcome_icon",
  "input_placeholder_ai", "input_placeholder_manager",
  "offline_title", "offline_subtitle", "offline_show_form",
  "show_powered_by", "powered_by_text",
  "show_unread_badge", "show_pulse_animation", "auto_open_delay_seconds",
];

/* GET — read design + quick buttons */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const supabase = createAdminClient();

    const [designRes, buttonsRes] = await Promise.all([
      supabase.from("ai_widget_design").select("*").limit(1).single(),
      supabase
        .from("ai_quick_buttons")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    if (designRes.error) {
      return NextResponse.json({ success: false, error: designRes.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        design: designRes.data,
        quickButtons: buttonsRes.data || [],
      },
    });
  } catch (err) {
    console.error("[API:Widget] GET error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}

/* PUT — update design + quick buttons */
export async function PUT(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const supabase = createAdminClient();

    /* Update design row */
    if (body.design) {
      const updates: Record<string, unknown> = {};
      for (const key of ALLOWED_DESIGN_FIELDS) {
        if (body.design[key] !== undefined) updates[key] = body.design[key];
      }
      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();

        const { data: existing } = await supabase
          .from("ai_widget_design")
          .select("id")
          .limit(1)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("ai_widget_design")
            .update(updates)
            .eq("id", existing.id);

          if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
          }
        }
      }
    }

    /* Replace quick buttons */
    if (Array.isArray(body.quickButtons)) {
      await supabase.from("ai_quick_buttons").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      if (body.quickButtons.length > 0) {
        const rows = body.quickButtons.map((btn: Record<string, unknown>, i: number) => ({
          label: btn.label || "",
          message: btn.message || "",
          icon: btn.icon || null,
          sort_order: i,
          is_active: true,
        }));

        const { error } = await supabase.from("ai_quick_buttons").insert(rows);
        if (error) {
          return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
      }
    }

    /* Return updated data */
    const [designRes, buttonsRes] = await Promise.all([
      supabase.from("ai_widget_design").select("*").limit(1).single(),
      supabase
        .from("ai_quick_buttons")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        design: designRes.data,
        quickButtons: buttonsRes.data || [],
      },
    });
  } catch (err) {
    console.error("[API:Widget] PUT error:", err);
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
  }
}
