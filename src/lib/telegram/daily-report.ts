/**
 * Daily report generator for Telegram
 * Collects stats from DB and sends formatted report
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyDailyReport, notifyLowStock } from "./notify";
import { getBalance as getAlphaSmsBalance } from "@/lib/sms/alphasms";

export async function sendDailyReport(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createAdminClient();
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD
    const startOfDay = `${todayStr}T00:00:00.000Z`;
    const endOfDay = `${todayStr}T23:59:59.999Z`;

    // Format date for display
    const displayDate = today.toLocaleDateString("uk-UA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    // ── Orders today ──
    const { data: todayOrders } = await supabase
      .from("orders")
      .select("id, total, items")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay);

    const ordersCount = todayOrders?.length ?? 0;
    const totalRevenue = todayOrders?.reduce((sum, o) => sum + Number(o.total || 0), 0) ?? 0;

    // ── Top products today ──
    const productCounts = new Map<string, { name: string; qty: number }>();
    todayOrders?.forEach((order) => {
      const items = order.items as { name: string; quantity: number }[] | null;
      items?.forEach((item) => {
        const existing = productCounts.get(item.name);
        if (existing) {
          existing.qty += item.quantity;
        } else {
          productCounts.set(item.name, { name: item.name, qty: item.quantity });
        }
      });
    });

    const topProducts = [...productCounts.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // ── New customers today ──
    const { count: newCustomers } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .eq("role", "user");

    // ── AlphaSMS balance ──
    let smsBalance: number | undefined;
    try {
      const balance = await getAlphaSmsBalance();
      if (balance !== null) smsBalance = balance;
    } catch {
      // skip
    }

    // ── Send daily report ──
    await notifyDailyReport({
      date: displayDate,
      ordersCount,
      totalRevenue,
      newCustomers: newCustomers ?? 0,
      topProducts,
      smsBalance,
    });

    // ── Check low stock ──
    const { data: lowStockProducts } = await supabase
      .from("products")
      .select("name_uk, quantity, sku")
      .eq("is_active", true)
      .lt("quantity", 3)
      .gt("quantity", -1)
      .order("quantity", { ascending: true })
      .limit(20);

    if (lowStockProducts && lowStockProducts.length > 0) {
      await notifyLowStock(
        lowStockProducts.map((p) => ({
          name: p.name_uk || "Без назви",
          stock: p.quantity ?? 0,
          sku: p.sku || undefined,
        })),
      );
    }

    return { success: true };
  } catch (err) {
    console.error("[Daily Report] Error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}
