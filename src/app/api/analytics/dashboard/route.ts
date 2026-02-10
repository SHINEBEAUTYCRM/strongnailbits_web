// ================================================================
//  API: /api/analytics/dashboard
//  Дані для реалтайм дашборду адмінки
// ================================================================

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();
    const now = new Date();

    // Часові рамки
    const last5min = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const last30min = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();

    // Паралельні запити
    const [
      activeNow,
      todayPageViews,
      todayEvents,
      yesterdayPageViews,
      recentEvents,
      topPages,
      todayOrders,
      todaySearches,
      deviceStats,
    ] = await Promise.all([
      // Активні зараз (унікальні сесії за 5 хв)
      supabase
        .from("site_events")
        .select("session_id")
        .gte("created_at", last5min)
        .not("session_id", "is", null),

      // Перегляди сторінок сьогодні
      supabase
        .from("site_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .gte("created_at", todayStart),

      // Всі події сьогодні
      supabase
        .from("site_events")
        .select("id", { count: "exact", head: true })
        .gte("created_at", todayStart),

      // Перегляди вчора (для порівняння)
      supabase
        .from("site_events")
        .select("id", { count: "exact", head: true })
        .eq("event_type", "page_view")
        .gte("created_at", yesterdayStart)
        .lt("created_at", todayStart),

      // Останні 20 подій (для live feed)
      supabase
        .from("site_events")
        .select("event_type, page_path, product_name, search_query, order_id, revenue, device_type, country, created_at")
        .order("created_at", { ascending: false })
        .limit(20),

      // Топ сторінки сьогодні
      supabase
        .from("site_events")
        .select("page_path")
        .eq("event_type", "page_view")
        .gte("created_at", todayStart)
        .not("page_path", "is", null)
        .limit(500),

      // Замовлення сьогодні
      supabase
        .from("site_events")
        .select("revenue")
        .eq("event_type", "purchase")
        .gte("created_at", todayStart),

      // Пошукові запити сьогодні
      supabase
        .from("site_events")
        .select("search_query")
        .eq("event_type", "search")
        .gte("created_at", todayStart)
        .not("search_query", "is", null)
        .limit(200),

      // Статистика по пристроях
      supabase
        .from("site_events")
        .select("device_type")
        .eq("event_type", "page_view")
        .gte("created_at", todayStart)
        .limit(500),
    ]);

    // Обробка активних користувачів
    const uniqueSessions = new Set(
      (activeNow.data || []).map((e) => e.session_id).filter(Boolean)
    );

    // Обробка топ сторінок
    const pageCounts: Record<string, number> = {};
    (topPages.data || []).forEach((e) => {
      if (e.page_path) {
        pageCounts[e.page_path] = (pageCounts[e.page_path] || 0) + 1;
      }
    });
    const topPagesArr = Object.entries(pageCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, count]) => ({ path, count }));

    // Обробка пристроїв
    const devices: Record<string, number> = { desktop: 0, mobile: 0, tablet: 0 };
    (deviceStats.data || []).forEach((e) => {
      if (e.device_type && devices[e.device_type] !== undefined) {
        devices[e.device_type]++;
      }
    });

    // Обробка пошукових запитів
    const searchCounts: Record<string, number> = {};
    (todaySearches.data || []).forEach((e) => {
      if (e.search_query) {
        searchCounts[e.search_query] = (searchCounts[e.search_query] || 0) + 1;
      }
    });
    const topSearches = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([query, count]) => ({ query, count }));

    // Замовлення
    const ordersToday = todayOrders.data || [];
    const revenueToday = ordersToday.reduce((s, e) => s + (Number(e.revenue) || 0), 0);

    // Зміна % порівняно з вчора
    const pvToday = todayPageViews.count || 0;
    const pvYesterday = yesterdayPageViews.count || 0;
    const pvChange = pvYesterday > 0
      ? Math.round(((pvToday - pvYesterday) / pvYesterday) * 100)
      : pvToday > 0 ? 100 : 0;

    // Параметр period (для майбутнього)
    const period = request.nextUrl.searchParams.get("period") || "today";

    return NextResponse.json({
      period,
      realtime: {
        activeUsers: uniqueSessions.size,
        lastUpdated: now.toISOString(),
      },
      today: {
        pageViews: pvToday,
        pageViewsChange: pvChange,
        totalEvents: todayEvents.count || 0,
        orders: ordersToday.length,
        revenue: revenueToday,
      },
      topPages: topPagesArr,
      topSearches,
      devices,
      recentEvents: recentEvents.data || [],
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
