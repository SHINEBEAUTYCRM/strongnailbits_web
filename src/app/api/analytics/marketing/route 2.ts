// ================================================================
//  API: /api/analytics/marketing
//  Повні маркетингові дані для Marketing Dashboard
// ================================================================

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createAdminClient();
    const now = new Date();

    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    const last7dStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7).toISOString();
    const last5min = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [
      activeNow,
      todayAll,
      yesterdayAll,
      last7dAll,
      recentFeed,
      todayOrders,
      yesterdayOrders,
    ] = await Promise.all([
      // Активні зараз
      supabase
        .from("site_events")
        .select("session_id")
        .gte("created_at", last5min)
        .not("session_id", "is", null),

      // Всі події сьогодні
      supabase
        .from("site_events")
        .select("event_type, page_path, product_id, product_name, search_query, order_id, revenue, device_type, country, session_id, referrer, created_at")
        .gte("created_at", todayStart)
        .order("created_at", { ascending: true })
        .limit(5000),

      // Всі події вчора
      supabase
        .from("site_events")
        .select("event_type, session_id, revenue")
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart)
        .limit(5000),

      // 7 днів
      supabase
        .from("site_events")
        .select("event_type, created_at, revenue, session_id")
        .gte("created_at", last7dStart)
        .limit(10000),

      // Лента (останні 30)
      supabase
        .from("site_events")
        .select("event_type, page_path, product_name, search_query, order_id, revenue, device_type, country, created_at")
        .order("created_at", { ascending: false })
        .limit(30),

      // Замовлення сьогодні (з таблиці orders)
      supabase
        .from("orders")
        .select("id, order_number, total, created_at")
        .gte("created_at", todayStart),

      // Замовлення вчора
      supabase
        .from("orders")
        .select("id, total")
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart),
    ]);

    const todayData = todayAll.data || [];
    const yesterdayData = yesterdayAll.data || [];
    const last7dData = last7dAll.data || [];

    // ── Active Users ──
    const activeUsers = new Set(
      (activeNow.data || []).map((e) => e.session_id).filter(Boolean)
    ).size;

    // ── KPI: сьогодні ──
    const todayPageViews = todayData.filter((e) => e.event_type === "page_view").length;
    const todaySessions = new Set(todayData.map((e) => e.session_id).filter(Boolean)).size;
    const todayAddToCart = todayData.filter((e) => e.event_type === "add_to_cart").length;
    const todayCheckouts = todayData.filter((e) => e.event_type === "begin_checkout").length;
    const todayPurchases = todayData.filter((e) => e.event_type === "purchase").length;
    const todaySearches = todayData.filter((e) => e.event_type === "search").length;
    const todayViewItems = todayData.filter((e) => e.event_type === "view_item").length;

    const ordersData = todayOrders.data || [];
    const ordersYesterday = yesterdayOrders.data || [];
    const revenueToday = ordersData.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const revenueYesterday = ordersYesterday.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const avgCheck = ordersData.length > 0 ? Math.round(revenueToday / ordersData.length) : 0;

    // ── KPI: вчора (для порівняння) ──
    const yPV = yesterdayData.filter((e) => e.event_type === "page_view").length;
    const ySessions = new Set(yesterdayData.map((e) => e.session_id).filter(Boolean)).size;
    const yPurchases = yesterdayData.filter((e) => e.event_type === "purchase").length;

    function pctChange(today: number, yesterday: number): number {
      if (yesterday === 0) return today > 0 ? 100 : 0;
      return Math.round(((today - yesterday) / yesterday) * 100);
    }

    // ── Воронка конверсії ──
    const funnel = [
      { step: "Перегляди", count: todayPageViews, color: "#6366f1" },
      { step: "Товари", count: todayViewItems, color: "#a855f7" },
      { step: "Кошик", count: todayAddToCart, color: "#f59e0b" },
      { step: "Checkout", count: todayCheckouts, color: "#ec4899" },
      { step: "Покупка", count: todayPurchases, color: "#10b981" },
    ];

    // ── Графік по годинах (сьогодні) ──
    const hourlyMap: Record<number, { views: number; events: number }> = {};
    for (let h = 0; h <= now.getHours(); h++) {
      hourlyMap[h] = { views: 0, events: 0 };
    }
    todayData.forEach((e) => {
      const h = new Date(e.created_at).getHours();
      if (hourlyMap[h]) {
        hourlyMap[h].events++;
        if (e.event_type === "page_view") hourlyMap[h].views++;
      }
    });
    const hourlyChart = Object.entries(hourlyMap).map(([h, d]) => ({
      hour: `${h}:00`,
      views: d.views,
      events: d.events,
    }));

    // ── Топ сторінки ──
    const pageCounts: Record<string, number> = {};
    todayData
      .filter((e) => e.event_type === "page_view" && e.page_path)
      .forEach((e) => {
        pageCounts[e.page_path!] = (pageCounts[e.page_path!] || 0) + 1;
      });
    const topPages = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // ── Топ товари (по переглядах) ──
    const productViews: Record<string, { name: string; views: number; carts: number }> = {};
    todayData
      .filter((e) => (e.event_type === "view_item" || e.event_type === "add_to_cart") && e.product_name)
      .forEach((e) => {
        const key = e.product_id || e.product_name!;
        if (!productViews[key]) {
          productViews[key] = { name: e.product_name!, views: 0, carts: 0 };
        }
        if (e.event_type === "view_item") productViews[key].views++;
        if (e.event_type === "add_to_cart") productViews[key].carts++;
      });
    const topProducts = Object.values(productViews)
      .sort((a, b) => b.views + b.carts * 3 - (a.views + a.carts * 3))
      .slice(0, 10);

    // ── Пошукові запити ──
    const searchMap: Record<string, number> = {};
    todayData
      .filter((e) => e.event_type === "search" && e.search_query)
      .forEach((e) => {
        searchMap[e.search_query!] = (searchMap[e.search_query!] || 0) + 1;
      });
    const topSearches = Object.entries(searchMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // ── Пристрої ──
    const devices: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    todayData
      .filter((e) => e.event_type === "page_view" && e.device_type)
      .forEach((e) => {
        if (devices[e.device_type!] !== undefined) devices[e.device_type!]++;
      });

    // ── Джерела трафіку (referrer) ──
    const referrerMap: Record<string, number> = {};
    todayData
      .filter((e) => e.event_type === "page_view" && e.referrer)
      .forEach((e) => {
        try {
          const host = new URL(e.referrer!).hostname.replace("www.", "");
          if (host && !host.includes("shineshop")) {
            referrerMap[host] = (referrerMap[host] || 0) + 1;
          }
        } catch (err) { console.error('[API:Analytics:Marketing] Referrer parse error:', err); }
      });
    const trafficSources = Object.entries(referrerMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([source, count]) => ({ source, count }));

    // ── Країни ──
    const countryMap: Record<string, number> = {};
    todayData
      .filter((e) => e.event_type === "page_view" && e.country)
      .forEach((e) => {
        countryMap[e.country!] = (countryMap[e.country!] || 0) + 1;
      });
    const countries = Object.entries(countryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([code, count]) => ({ code, count }));

    // ── 7-денний тренд ──
    const dailyMap: Record<string, { views: number; sessions: Set<string>; orders: number; revenue: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { views: 0, sessions: new Set(), orders: 0, revenue: 0 };
    }
    last7dData.forEach((e) => {
      const key = e.created_at.slice(0, 10);
      if (dailyMap[key]) {
        if (e.event_type === "page_view") dailyMap[key].views++;
        if (e.session_id) dailyMap[key].sessions.add(e.session_id);
        if (e.event_type === "purchase") {
          dailyMap[key].orders++;
          dailyMap[key].revenue += Number(e.revenue) || 0;
        }
      }
    });
    const weeklyTrend = Object.entries(dailyMap).map(([date, d]) => ({
      date,
      label: new Date(date).toLocaleDateString("uk-UA", { weekday: "short", day: "numeric" }),
      views: d.views,
      sessions: d.sessions.size,
      orders: d.orders,
      revenue: d.revenue,
    }));

    return NextResponse.json({
      activeUsers,
      kpi: {
        sessions: { value: todaySessions, change: pctChange(todaySessions, ySessions) },
        pageViews: { value: todayPageViews, change: pctChange(todayPageViews, yPV) },
        orders: { value: ordersData.length, change: pctChange(ordersData.length, ordersYesterday.length) },
        revenue: { value: revenueToday, change: pctChange(revenueToday, revenueYesterday) },
        avgCheck: { value: avgCheck },
        searches: { value: todaySearches },
        purchases: { value: todayPurchases, change: pctChange(todayPurchases, yPurchases) },
        conversion: {
          value: todaySessions > 0 ? ((todayPurchases / todaySessions) * 100).toFixed(1) : "0",
        },
      },
      funnel,
      hourlyChart,
      weeklyTrend,
      topPages,
      topProducts,
      topSearches,
      trafficSources,
      countries,
      devices,
      recentEvents: recentFeed.data || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
