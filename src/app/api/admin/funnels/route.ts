import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** GET /api/admin/funnels — List all funnels with stage counts and contact stats */
export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = createAdminClient();

  // Get funnels
  const { data: funnels, error } = await supabase
    .from("funnels")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Enrich with stage and contact counts
  const enriched = await Promise.all(
    (funnels || []).map(async (funnel) => {
      // Stages
      const { data: stages } = await supabase
        .from("funnel_stages")
        .select("id, name, slug, position, color")
        .eq("funnel_id", funnel.id)
        .order("position", { ascending: true });

      // Contact counts per stage
      const stageCounts: Record<string, number> = {};
      let totalContacts = 0;
      let convertedContacts = 0;

      if (stages) {
        for (const stage of stages) {
          const { count } = await supabase
            .from("funnel_contacts")
            .select("id", { count: "exact", head: true })
            .eq("stage_id", stage.id)
            .eq("is_active", true);

          stageCounts[stage.id] = count ?? 0;
          totalContacts += count ?? 0;
        }

        // Converted = contacts on last stage
        if (stages.length > 0) {
          convertedContacts = stageCounts[stages[stages.length - 1].id] || 0;
        }
      }

      const conversionRate =
        totalContacts > 0
          ? ((convertedContacts / totalContacts) * 100).toFixed(1)
          : "0.0";

      return {
        ...funnel,
        stages: stages || [],
        stageCounts,
        totalContacts,
        convertedContacts,
        conversionRate,
      };
    }),
  );

  return NextResponse.json({ data: enriched });
}

/** POST /api/admin/funnels — Create a new funnel */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { name, slug, description, color, icon, stages } = body;

  if (!name || !slug) {
    return NextResponse.json(
      { error: "Name and slug are required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // Create funnel
  const { data: funnel, error } = await supabase
    .from("funnels")
    .insert({
      name,
      slug,
      description: description || null,
      color: color || "#6366f1",
      icon: icon || "Funnel",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Create stages
  if (stages && Array.isArray(stages)) {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await supabase.from("funnel_stages").insert({
        funnel_id: funnel.id,
        name: stage.name,
        slug: stage.slug || stage.name.toLowerCase().replace(/\s+/g, "-"),
        position: i,
        color: stage.color || null,
        description: stage.description || null,
        auto_triggers: stage.auto_triggers || [],
        auto_actions: stage.auto_actions || [],
      });
    }
  }

  return NextResponse.json({ data: funnel }, { status: 201 });
}
