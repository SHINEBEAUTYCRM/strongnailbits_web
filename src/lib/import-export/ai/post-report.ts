/* ------------------------------------------------------------------ */
/*  AI #5 — Post-import analytics report                             */
/* ------------------------------------------------------------------ */

import type { PostImportReport } from "../types";
import { buildReportPrompt } from "./prompts";
import { askClaude } from "./client";

/**
 * AI-powered post-import report with analytics and recommendations.
 */
export async function generatePostReportAI(stats: {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  price_changes: Array<{ name: string; old_price: number; new_price: number }>;
  stock_changes: Array<{ name: string; old_qty: number; new_qty: number }>;
  new_brands: string[];
  products_without_photo: number;
  products_without_description: number;
}): Promise<PostImportReport> {
  const prompt = buildReportPrompt(stats);
  const { result } = await askClaude<PostImportReport>(prompt);

  if (result) return result;

  // Fallback: basic report without AI insights
  return generateBasicReport(stats);
}

/**
 * Basic report without AI — just raw stats.
 */
export function generateBasicReport(stats: {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  price_changes: Array<{ name: string; old_price: number; new_price: number }>;
  stock_changes: Array<{ name: string; old_qty: number; new_qty: number }>;
  new_brands: string[];
  products_without_photo: number;
  products_without_description: number;
}): PostImportReport {
  const priceChanges = stats.price_changes.map((c) => {
    const pct = c.old_price > 0 ? ((c.new_price - c.old_price) / c.old_price) * 100 : 0;
    return pct;
  });

  const avgPriceChange =
    priceChanges.length > 0
      ? priceChanges.reduce((a, b) => a + b, 0) / priceChanges.length
      : 0;

  const recommendations: PostImportReport["recommendations"] = [];

  if (stats.products_without_photo > 0) {
    recommendations.push({
      type: "warning",
      message: `${stats.products_without_photo} товарів без фото — додайте зображення`,
    });
  }
  if (stats.products_without_description > 0) {
    recommendations.push({
      type: "info",
      message: `${stats.products_without_description} товарів без опису — заповніть описи`,
    });
  }
  if (stats.new_brands.length > 0) {
    recommendations.push({
      type: "info",
      message: `Нові бренди: ${stats.new_brands.join(", ")}`,
    });
  }

  return {
    total_imported: stats.total,
    new_products: stats.created,
    updated_products: stats.updated,
    skipped: stats.skipped,
    price_changes: {
      average_change_percent: Math.round(avgPriceChange * 10) / 10,
      increased_above_15: priceChanges.filter((p) => p > 15).length,
      decreased_above_20: priceChanges.filter((p) => p < -20).length,
      below_cost: 0,
    },
    stock_changes: {
      went_out_of_stock: stats.stock_changes.filter((c) => c.old_qty > 0 && c.new_qty === 0)
        .length,
      back_in_stock: stats.stock_changes.filter((c) => c.old_qty === 0 && c.new_qty > 0).length,
    },
    recommendations,
  };
}
