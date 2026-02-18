import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { analyzeStructureAI, analyzeStructureFallback } from "@/lib/import-export/ai/analyze-structure";
import { smartMappingAI, smartMappingFallback } from "@/lib/import-export/ai/smart-mapping";
import { smartValidationAI, basicValidation } from "@/lib/import-export/ai/smart-validation";
import { enrichDataAI, matchProductsAI } from "@/lib/import-export/ai/enrichment";
import { generatePostReportAI, generateBasicReport } from "@/lib/import-export/ai/post-report";
import { getColumnSamples } from "@/lib/import-export/parsers";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/import/ai-analyze
 * Unified AI analysis endpoint for all import steps.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { step, data, context } = body as {
      step: "structure" | "mapping" | "validation" | "enrichment" | "matching" | "report";
      data: Record<string, unknown>;
      context?: Record<string, unknown>;
    };

    const useAI = context?.ai_enabled !== false;

    switch (step) {
      case "structure": {
        const rows = data.rows as string[][];
        const result = useAI
          ? await analyzeStructureAI(rows)
          : analyzeStructureFallback(rows);
        return NextResponse.json({ ok: true, result, fallback: !useAI });
      }

      case "mapping": {
        const rows = data.rows as string[][];
        const headerRow = data.header_row as number;
        const dataStartRow = data.data_start_row as number;
        const samples = getColumnSamples(rows, headerRow, dataStartRow);
        const previousDecisions = (context?.previous_decisions as Array<{ file_column: string; db_field: string | null }>) ?? undefined;
        const result = useAI
          ? await smartMappingAI(samples, previousDecisions)
          : smartMappingFallback(samples);
        return NextResponse.json({ ok: true, result, fallback: !useAI });
      }

      case "validation": {
        const rows = data.rows as string[][];
        const mappings = data.mappings as Parameters<typeof smartValidationAI>[1];
        const headerRow = data.header_row as number;
        const dataStartRow = data.data_start_row as number;

        // Fetch brands & categories from DB
        const supabase = createAdminClient();
        const [{ data: brands }, { data: categories }] = await Promise.all([
          supabase.from("brands").select("name").order("name"),
          supabase.from("categories").select("name_uk").order("name_uk"),
        ]);
        const brandsList = (brands ?? []).map((b) => b.name).filter(Boolean);
        const categoriesList = (categories ?? []).map((c) => c.name_uk).filter(Boolean);

        const result = useAI
          ? await smartValidationAI(rows, mappings, headerRow, dataStartRow, brandsList, categoriesList)
          : basicValidation(rows, mappings, headerRow, dataStartRow);
        return NextResponse.json({ ok: true, result, fallback: !useAI });
      }

      case "enrichment": {
        if (!useAI) return NextResponse.json({ ok: true, result: [], fallback: true });
        const rows = data.rows as string[][];
        const mappings = data.mappings as Parameters<typeof enrichDataAI>[1];
        const headerRow = data.header_row as number;
        const dataStartRow = data.data_start_row as number;
        const result = await enrichDataAI(rows, mappings, headerRow, dataStartRow);
        return NextResponse.json({ ok: true, result });
      }

      case "matching": {
        if (!useAI) return NextResponse.json({ ok: true, result: [], fallback: true });
        const rows = data.rows as string[][];
        const mappings = data.mappings as Parameters<typeof matchProductsAI>[1];
        const headerRow = data.header_row as number;
        const dataStartRow = data.data_start_row as number;

        const supabase = createAdminClient();
        const { data: products } = await supabase
          .from("products")
          .select("id, name_uk, sku")
          .order("name_uk")
          .limit(500);
        const dbProducts = (products ?? []).map((p) => ({
          id: p.id,
          name: p.name_uk,
          sku: p.sku || "",
        }));

        const result = await matchProductsAI(rows, mappings, headerRow, dataStartRow, dbProducts);
        return NextResponse.json({ ok: true, result });
      }

      case "report": {
        const stats = data.stats as Parameters<typeof generatePostReportAI>[0];
        const result = useAI
          ? await generatePostReportAI(stats)
          : generateBasicReport(stats);
        return NextResponse.json({ ok: true, result, fallback: !useAI });
      }

      default:
        return NextResponse.json(
          { error: `Unknown step: ${step}` },
          { status: 400 },
        );
    }
  } catch (err) {
    console.error("[Import AI Analyze]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI analysis failed" },
      { status: 500 },
    );
  }
}
