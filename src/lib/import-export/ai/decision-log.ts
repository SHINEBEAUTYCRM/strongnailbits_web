/* ------------------------------------------------------------------ */
/*  AI Decision log — saves user decisions for learning              */
/* ------------------------------------------------------------------ */

import { createAdminClient } from "@/lib/supabase/admin";

export interface DecisionLogEntry {
  step: "structure" | "mapping" | "validation" | "enrichment" | "report";
  supplier_name: string | null;
  input_hash: string | null;
  ai_suggestion: unknown;
  user_decision: unknown;
  accepted: boolean;
}

/**
 * Save an AI decision to the log for future learning.
 */
export async function logDecision(entry: DecisionLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("ai_import_decisions").insert({
      step: entry.step,
      supplier_name: entry.supplier_name,
      input_hash: entry.input_hash,
      ai_suggestion: entry.ai_suggestion,
      user_decision: entry.user_decision,
      accepted: entry.accepted,
    });
  } catch (err) {
    console.error("[AI Decision Log] Failed to save:", err);
  }
}

/**
 * Get previous mapping decisions for a supplier (for AI context).
 */
export async function getPreviousMappingDecisions(
  supplierName: string,
): Promise<Array<{ file_column: string; db_field: string | null }>> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("ai_import_decisions")
      .select("user_decision")
      .eq("step", "mapping")
      .eq("supplier_name", supplierName)
      .eq("accepted", true)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!data || data.length === 0) return [];

    // Extract mapping decisions from the most recent session
    const latestDecision = data[0].user_decision;
    if (Array.isArray(latestDecision)) {
      return latestDecision as Array<{ file_column: string; db_field: string | null }>;
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Simple hash of file structure for caching.
 */
export function hashFileStructure(headers: string[]): string {
  return headers
    .filter(Boolean)
    .map((h) => h.toLowerCase().trim())
    .sort()
    .join("|");
}
