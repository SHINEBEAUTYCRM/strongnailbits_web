/**
 * Admin Tools — 12 tools for admin mode in Telegram
 *
 * Dashboard, orders management, inventory, clients, finance,
 * reply to clients, content generation, broadcast, chatbot analytics.
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ToolDefinition } from "@/lib/chat/tool-definitions";
import { executeToolCall } from "@/lib/chat/tools";

// ────── Tool Definitions ──────

export const adminToolDefinitions: ToolDefinition[] = [
  {
    name: "search_products",
    description:
      "Пошук товарів по назві, бренду, категорії, артикулу. Використовуй ЗАВЖДИ коли адмін шукає конкретний товар.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Текст пошуку (назва, бренд, артикул)",
        },
        brand: {
          type: "string",
          description: "Фільтр по бренду (DARK, Siller, SUNUV, etc)",
        },
        category_slug: {
          type: "string",
          description: "Slug категорії (gel-laky, bazy, topy, obladnannya, etc)",
        },
        in_stock_only: {
          type: "boolean",
          description: "Тільки в наявності (default: true)",
        },
        limit: {
          type: "number",
          description: "Кількість результатів (default: 6, max: 20)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_product_by_id",
    description:
      "Повна інформація про конкретний товар — ціни, опис, наявність, фото.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID товару" },
        slug: { type: "string", description: "Slug товару" },
      },
      required: [],
    },
  },
  {
    name: "dashboard_stats",
    description:
      "Загальна аналітика: виручка, замовлення, клієнти, топ товари. За день, тиждень, місяць. Порівняння з попереднім періодом.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "yesterday", "week", "month", "quarter", "year"],
        },
        compare_with: {
          type: "string",
          enum: ["previous_period", "same_period_last_year", "none"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "admin_orders",
    description:
      "Список замовлень з фільтрами. Нові, в обробці, відправлені. Підтвердження, створення ТТН.",
    input_schema: {
      type: "object",
      properties: {
        status: {
          type: "string",
          enum: [
            "new",
            "pending",
            "processing",
            "confirmed",
            "paid",
            "shipped",
            "delivered",
            "cancelled",
            "all",
          ],
        },
        period: {
          type: "string",
          enum: ["today", "yesterday", "week", "month"],
        },
        min_sum: { type: "number" },
        client_type: {
          type: "string",
          enum: ["wholesale", "retail", "all"],
        },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "admin_order_action",
    description:
      "Дія над замовленням: підтвердити, скасувати, змінити статус.",
    input_schema: {
      type: "object",
      properties: {
        order_id: { type: "string" },
        action: {
          type: "string",
          enum: ["confirm", "cancel", "mark_shipped", "mark_delivered"],
        },
        comment: { type: "string" },
      },
      required: ["order_id", "action"],
    },
  },
  {
    name: "admin_inventory",
    description:
      "Залишки товарів. Використовуй filter='stats' для загальної статистики (кількість товарів, в наявності, загальний залишок). Використовуй 'critical'/'low'/'out_of_stock' для списку конкретних товарів.",
    input_schema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["stats", "critical", "low", "out_of_stock", "all", "overstocked"],
          description: "stats = загальна статистика і категорії, critical = товари з залишком < 10, low = < 30, out_of_stock = 0, all = загальна статистика",
        },
        brand: { type: "string" },
        category_slug: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "admin_product_stats",
    description:
      "Статистика продажів конкретного товару або бренду за період.",
    input_schema: {
      type: "object",
      properties: {
        product_name: { type: "string" },
        brand: { type: "string" },
        period: {
          type: "string",
          enum: ["today", "week", "month", "quarter"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "admin_clients",
    description:
      "Пошук клієнтів, топ клієнти, статистика клієнта.",
    input_schema: {
      type: "object",
      properties: {
        search: {
          type: "string",
          description: "Пошук по імені, телефону, email",
        },
        filter: {
          type: "string",
          enum: [
            "top_revenue",
            "top_orders",
            "new_this_month",
            "inactive",
            "wholesale",
            "retail",
          ],
        },
        limit: { type: "number" },
      },
      required: [],
    },
  },
  {
    name: "admin_client_detail",
    description:
      "Повна інформація про конкретного клієнта: контакти, замовлення, статистика.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        phone: { type: "string" },
        name: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: "admin_finance",
    description:
      "Фінансова аналітика: виручка по каналах оплати, B2B vs B2C.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month", "quarter", "year"],
        },
        breakdown: {
          type: "string",
          enum: ["payment_method", "client_type", "brand", "category"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "admin_reply_to_client",
    description:
      "Відповісти клієнту який чекає менеджера. Через Telegram.",
    input_schema: {
      type: "object",
      properties: {
        client_id: { type: "string" },
        message: { type: "string" },
      },
      required: ["client_id", "message"],
    },
  },
  {
    name: "admin_create_content",
    description:
      "Створити контент: пост для Instagram, опис товару, email розсилка.",
    input_schema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "instagram_post",
            "product_description",
            "email_campaign",
            "telegram_broadcast",
          ],
        },
        topic: { type: "string" },
        brand: { type: "string" },
        tone: {
          type: "string",
          enum: ["promotional", "informational", "casual"],
        },
      },
      required: ["type", "topic"],
    },
  },
  {
    name: "admin_broadcast",
    description:
      "Масове повідомлення клієнтам через Telegram. Попередній перегляд аудиторії.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string" },
        target: {
          type: "string",
          enum: ["all", "wholesale", "retail", "inactive", "custom"],
        },
        city: { type: "string" },
        brand_buyers: {
          type: "string",
          description: "Тільки покупці цього бренду",
        },
        preview_only: {
          type: "boolean",
          description: "Тільки показати скільки отримає, не відправляти",
        },
      },
      required: ["message", "target"],
    },
  },
  {
    name: "admin_chatbot_analytics",
    description:
      "Аналітика AI чат-бота: сесії, витрати, топ запити.",
    input_schema: {
      type: "object",
      properties: {
        period: {
          type: "string",
          enum: ["today", "week", "month"],
        },
      },
      required: ["period"],
    },
  },
  {
    name: "admin_consumables_analytics",
    description:
      "Аналітика витратних матеріалів клієнтів: топ товарів, середній цикл, кількість клієнтів.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "create_reminder",
    description:
      "Створити нагадування. Використовуй коли адмін просить нагадати щось через певний час.",
    input_schema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Текст нагадування" },
        delay_minutes: {
          type: "number",
          description: "Через скільки хвилин нагадати",
        },
      },
      required: ["message", "delay_minutes"],
    },
  },
];

// ────── Tool Router ──────

export async function executeAdminToolCall(
  toolName: string,
  params: Record<string, unknown>,
): Promise<unknown> {
  const supabase = createAdminClient();

  switch (toolName) {
    case "search_products":
    case "get_product_by_id":
      return executeToolCall(toolName, params);
    case "dashboard_stats":
      return dashboardStats(supabase, params);
    case "admin_orders":
      return adminOrders(supabase, params);
    case "admin_order_action":
      return adminOrderAction(supabase, params);
    case "admin_inventory":
      return adminInventory(supabase, params);
    case "admin_product_stats":
      return adminProductStats(supabase, params);
    case "admin_clients":
      return adminClients(supabase, params);
    case "admin_client_detail":
      return adminClientDetail(supabase, params);
    case "admin_finance":
      return adminFinance(supabase, params);
    case "admin_reply_to_client":
      return adminReplyToClient(supabase, params);
    case "admin_create_content":
      return { type: params.type, topic: params.topic, note: "Content generation handled by Claude response itself" };
    case "admin_broadcast":
      return adminBroadcast(supabase, params);
    case "admin_chatbot_analytics":
      return adminChatbotAnalytics(supabase, params);
    case "admin_consumables_analytics":
      return adminConsumablesAnalytics(supabase);
    case "create_reminder":
      return adminCreateReminder(supabase, params);
    default:
      return { error: `Unknown admin tool: ${toolName}` };
  }
}

// ────── Helpers ──────

function getPeriodRange(period: string): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString();
  let start: Date;

  switch (period) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "yesterday": {
      const y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      start = y;
      break;
    }
    case "week":
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "quarter":
      start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return { start: start.toISOString(), end };
}

// ────── 1. Dashboard Stats ──────

async function dashboardStats(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const { start, end } = getPeriodRange(String(params.period));

  // Orders in period
  const { data: orders } = await supabase
    .from("orders")
    .select("id, total, status, items, profile_id, created_at")
    .gte("created_at", start)
    .lte("created_at", end);

  const ordersCount = orders?.length || 0;
  const revenue =
    orders?.reduce((sum, o) => sum + Number(o.total || 0), 0) || 0;
  const avgCheck = ordersCount > 0 ? Math.round(revenue / ordersCount) : 0;

  // New customers
  const { count: newCustomers } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .gte("created_at", start)
    .lte("created_at", end);

  // Top products
  const productCounts = new Map<string, { name: string; qty: number; revenue: number }>();
  orders?.forEach((order) => {
    const items = order.items as { name?: string; quantity?: number; price?: number }[] | null;
    items?.forEach((item) => {
      const name = item.name || "Невідомий";
      const existing = productCounts.get(name);
      const qty = item.quantity || 1;
      const rev = (item.price || 0) * qty;
      if (existing) {
        existing.qty += qty;
        existing.revenue += rev;
      } else {
        productCounts.set(name, { name, qty, revenue: rev });
      }
    });
  });

  const topProducts = [...productCounts.values()]
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  // Comparison period (if requested)
  let comparison = null;
  if (params.compare_with === "previous_period") {
    const periodMs = new Date(end).getTime() - new Date(start).getTime();
    const prevStart = new Date(new Date(start).getTime() - periodMs).toISOString();
    const prevEnd = start;

    const { data: prevOrders } = await supabase
      .from("orders")
      .select("total")
      .gte("created_at", prevStart)
      .lte("created_at", prevEnd);

    const prevRevenue = prevOrders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0;
    const prevCount = prevOrders?.length || 0;

    comparison = {
      prev_revenue: prevRevenue,
      prev_orders: prevCount,
      revenue_change_pct:
        prevRevenue > 0 ? Math.round(((revenue - prevRevenue) / prevRevenue) * 100) : null,
      orders_change_pct:
        prevCount > 0 ? Math.round(((ordersCount - prevCount) / prevCount) * 100) : null,
    };
  }

  return {
    period: params.period,
    orders_count: ordersCount,
    revenue,
    avg_check: avgCheck,
    new_customers: newCustomers || 0,
    top_products: topProducts,
    comparison,
  };
}

// ────── 2. Admin Orders ──────

async function adminOrders(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("orders")
    .select(
      "id, order_number, status, total, items, shipping_method, payment_method, created_at, profile_id, profiles(first_name, last_name, company, phone, type)",
    )
    .order("created_at", { ascending: false });

  // Status filter
  if (params.status && params.status !== "all") {
    query = query.eq("status", String(params.status));
  }

  // Period filter
  if (params.period) {
    const { start } = getPeriodRange(String(params.period));
    query = query.gte("created_at", start);
  }

  // Min sum
  if (params.min_sum) {
    query = query.gte("total", Number(params.min_sum));
  }

  const limit = Number(params.limit) || 10;
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return {
    orders:
      data?.map((o: Record<string, unknown>) => {
        const p = o.profiles as Record<string, unknown> | null;
        const items = o.items as Record<string, unknown>[] | null;
        return {
          id: o.id,
          order_number: o.order_number,
          status: o.status,
          total: o.total,
          items_count: items?.length || 0,
          customer_name: p
            ? `${p.first_name || ""} ${p.last_name || ""}`.trim()
            : "Невідомий",
          customer_phone: p?.phone || null,
          customer_type: p?.type || "retail",
          company: p?.company || null,
          shipping_method: o.shipping_method,
          payment_method: o.payment_method,
          created_at: o.created_at,
        };
      }) || [],
    total: data?.length || 0,
  };
}

// ────── 3. Admin Order Action ──────

async function adminOrderAction(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const orderId = String(params.order_id);
  const action = String(params.action);

  const statusMap: Record<string, string> = {
    confirm: "processing",
    cancel: "cancelled",
    mark_shipped: "shipped",
    mark_delivered: "delivered",
  };

  const newStatus = statusMap[action];
  if (!newStatus) return { error: `Невідома дія: ${action}` };

  const { data: order, error } = await supabase
    .from("orders")
    .update({ status: newStatus })
    .eq("id", orderId)
    .select("order_number, status")
    .single();

  if (error) return { error: error.message };

  return {
    success: true,
    order_number: order.order_number,
    new_status: newStatus,
    message: `Замовлення #${order.order_number} — статус змінено на "${newStatus}"`,
  };
}

// ────── 4. Admin Inventory ──────

async function adminInventory(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const filter = String(params.filter || "critical");

  // ── "stats" or "all" → aggregated overview (NO limit, NO individual rows) ──
  if (filter === "stats" || filter === "all") {
    const { count: totalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: inStockProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("quantity", 0);

    const { count: outOfStockProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .lte("quantity", 0);

    const { count: criticalProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .gt("quantity", 0)
      .lt("quantity", 10);

    // Try RPC for sum, fallback to 0
    let totalQuantity = 0;
    try {
      const { data: sumData } = await supabase.rpc("sum_active_product_quantity");
      totalQuantity = Number(sumData) || 0;
    } catch {
      // RPC not available — skip sum
    }

    // Category breakdown (top 10 by in-stock count)
    const { data: catProducts } = await supabase
      .from("products")
      .select("category_id, categories(name_uk)")
      .eq("status", "active")
      .gt("quantity", 0);

    const categoryCount: Record<string, number> = {};
    catProducts?.forEach((p: Record<string, unknown>) => {
      const cat = (p.categories as Record<string, unknown> | null)?.name_uk as string || "Інше";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    return {
      filter,
      total_products: totalProducts || 0,
      in_stock: inStockProducts || 0,
      out_of_stock: outOfStockProducts || 0,
      critical_stock: criticalProducts || 0,
      total_quantity: totalQuantity,
      by_category: topCategories,
    };
  }

  // ── Filtered product lists (critical, low, out_of_stock, overstocked) ──
  let query = supabase
    .from("products")
    .select("id, name_uk, sku, quantity, price, brands(name)")
    .eq("status", "active");

  switch (filter) {
    case "critical":
      query = query.lt("quantity", 10).gt("quantity", 0);
      break;
    case "low":
      query = query.lt("quantity", 30).gt("quantity", 0);
      break;
    case "out_of_stock":
      query = query.lte("quantity", 0);
      break;
    case "overstocked":
      query = query.gt("quantity", 200);
      break;
  }

  if (params.brand) {
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${String(params.brand)}%`)
      .maybeSingle();
    if (brand) query = query.eq("brand_id", brand.id);
  }

  // Count total matching BEFORE limit
  const countQuery = supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Apply same filters for count
  let countQ = countQuery;
  switch (filter) {
    case "critical":
      countQ = countQ.lt("quantity", 10).gt("quantity", 0);
      break;
    case "low":
      countQ = countQ.lt("quantity", 30).gt("quantity", 0);
      break;
    case "out_of_stock":
      countQ = countQ.lte("quantity", 0);
      break;
    case "overstocked":
      countQ = countQ.gt("quantity", 200);
      break;
  }
  const { count: totalMatching } = await countQ;

  query = query.order("quantity", { ascending: true }).limit(20);
  const { data } = await query;

  return {
    products:
      data?.map((p: Record<string, unknown>) => ({
        name: p.name_uk,
        sku: p.sku,
        quantity: p.quantity,
        price: p.price,
        brand: (p.brands as Record<string, unknown> | null)?.name || null,
      })) || [],
    filter,
    shown: data?.length || 0,
    total_matching: totalMatching || 0,
  };
}

// ────── 5. Admin Product Stats ──────

async function adminProductStats(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const { start, end } = getPeriodRange(String(params.period));

  const { data: orders } = await supabase
    .from("orders")
    .select("items, total, created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .neq("status", "cancelled");

  const searchName = String(params.product_name || params.brand || "").toLowerCase();

  const stats = new Map<string, { qty: number; revenue: number; days: Map<string, number> }>();

  orders?.forEach((order) => {
    const items = order.items as { name?: string; quantity?: number; price?: number }[] | null;
    const day = new Date(order.created_at as string).toLocaleDateString("uk-UA");

    items?.forEach((item) => {
      const name = item.name || "Невідомий";
      if (searchName && !name.toLowerCase().includes(searchName)) return;

      const qty = item.quantity || 1;
      const rev = (item.price || 0) * qty;
      const existing = stats.get(name) || { qty: 0, revenue: 0, days: new Map() };
      existing.qty += qty;
      existing.revenue += rev;
      existing.days.set(day, (existing.days.get(day) || 0) + qty);
      stats.set(name, existing);
    });
  });

  const results = [...stats.entries()]
    .map(([name, data]) => ({
      name,
      total_qty: data.qty,
      total_revenue: data.revenue,
      daily_breakdown: Object.fromEntries(data.days),
      avg_daily: Math.round(data.qty / Math.max(1, data.days.size)),
    }))
    .sort((a, b) => b.total_qty - a.total_qty)
    .slice(0, 10);

  return {
    period: params.period,
    products: results,
  };
}

// ────── 6. Admin Clients ──────

async function adminClients(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("profiles")
    .select(
      "id, first_name, last_name, company, phone, email, type, discount_percent, total_orders, total_spent, telegram_chat_id, created_at",
    );

  // Search
  if (params.search) {
    const s = String(params.search);
    query = query.or(
      `first_name.ilike.%${s}%,last_name.ilike.%${s}%,company.ilike.%${s}%,phone.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }

  // Filters
  switch (params.filter) {
    case "top_revenue":
      query = query.order("total_spent", { ascending: false });
      break;
    case "top_orders":
      query = query.order("total_orders", { ascending: false });
      break;
    case "new_this_month": {
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      query = query.gte("created_at", monthStart);
      break;
    }
    case "wholesale":
      query = query.eq("type", "wholesale");
      break;
    case "retail":
      query = query.eq("type", "retail");
      break;
    default:
      query = query.order("total_spent", { ascending: false });
  }

  const limit = Number(params.limit) || 10;
  query = query.limit(limit);

  const { data } = await query;

  return {
    clients:
      data?.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Невідомий",
        company: p.company,
        phone: p.phone,
        type: p.type,
        discount_percent: p.discount_percent,
        total_orders: p.total_orders,
        total_spent: p.total_spent,
        has_telegram: !!p.telegram_chat_id,
      })) || [],
    total: data?.length || 0,
  };
}

// ────── 7. Admin Client Detail ──────

async function adminClientDetail(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("profiles")
    .select("*");

  if (params.client_id) query = query.eq("id", String(params.client_id));
  else if (params.phone) query = query.ilike("phone", `%${String(params.phone)}%`);
  else if (params.name) {
    const name = String(params.name);
    query = query.or(`first_name.ilike.%${name}%,last_name.ilike.%${name}%,company.ilike.%${name}%`);
  } else return { error: "Потрібен client_id, phone або name" };

  const { data: profile } = await query.maybeSingle();
  if (!profile) return { error: "Клієнта не знайдено" };

  // Recent orders
  const { data: orders } = await supabase
    .from("orders")
    .select("order_number, status, total, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    id: profile.id,
    name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
    company: profile.company,
    phone: profile.phone,
    email: profile.email,
    type: profile.type,
    discount_percent: profile.discount_percent,
    total_orders: profile.total_orders,
    total_spent: profile.total_spent,
    has_telegram: !!profile.telegram_chat_id,
    registered: profile.created_at,
    recent_orders: orders || [],
  };
}

// ────── 8. Admin Finance ──────

async function adminFinance(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const { start, end } = getPeriodRange(String(params.period));

  const { data: orders } = await supabase
    .from("orders")
    .select("total, payment_method, profile_id, profiles(type), created_at")
    .gte("created_at", start)
    .lte("created_at", end)
    .neq("status", "cancelled");

  const revenue = orders?.reduce((s, o) => s + Number(o.total || 0), 0) || 0;

  // By payment method
  const byPayment = new Map<string, number>();
  orders?.forEach((o) => {
    const method = String(o.payment_method || "Невідомо");
    byPayment.set(method, (byPayment.get(method) || 0) + Number(o.total || 0));
  });

  // By client type
  const byType = new Map<string, number>();
  orders?.forEach((o) => {
    const profileRaw = o.profiles;
    const profileObj = (Array.isArray(profileRaw) ? profileRaw[0] : profileRaw) as Record<string, unknown> | null;
    const type = profileObj?.type || "retail";
    byType.set(String(type), (byType.get(String(type)) || 0) + Number(o.total || 0));
  });

  return {
    period: params.period,
    total_revenue: revenue,
    orders_count: orders?.length || 0,
    by_payment_method: Object.fromEntries(byPayment),
    by_client_type: Object.fromEntries(byType),
  };
}

// ────── 9. Admin Reply to Client ──────

async function adminReplyToClient(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const clientId = String(params.client_id);
  const message = String(params.message);

  // Find client's telegram_chat_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("telegram_chat_id, first_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!profile?.telegram_chat_id) {
    return {
      error: "Клієнт не підключив Telegram. Зверніться через телефон або email.",
    };
  }

  // Send message to client via bot
  const { getBot } = await import("./bot");
  const bot = getBot();

  await bot.sendMessage(profile.telegram_chat_id, `💬 <b>Відповідь менеджера:</b>\n\n${message}`, {
    parse_mode: "HTML",
  });

  return {
    success: true,
    message: `Повідомлення відправлено клієнту ${profile.first_name || ""}`,
  };
}

// ────── 10. Admin Broadcast ──────

async function adminBroadcast(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("profiles")
    .select("id, telegram_chat_id, first_name, type")
    .not("telegram_chat_id", "is", null);

  // Target filter
  switch (params.target) {
    case "wholesale":
      query = query.eq("type", "wholesale");
      break;
    case "retail":
      query = query.eq("type", "retail");
      break;
  }

  const { data: recipients } = await query;
  const count = recipients?.length || 0;

  // Preview only
  if (params.preview_only) {
    return {
      preview: true,
      recipients_count: count,
      target: params.target,
      message_preview: String(params.message).slice(0, 200),
    };
  }

  // Actually send (limit to prevent abuse)
  if (count > 500) {
    return {
      error: "Занадто багато отримувачів. Обмеження: 500. Уточніть фільтри.",
    };
  }

  // Send via bot
  const { getBot } = await import("./bot");
  const bot = getBot();
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients || []) {
    try {
      await bot.sendMessage(
        recipient.telegram_chat_id as number,
        String(params.message),
        { parse_mode: "HTML" },
      );
      sent++;
      // Rate limit: ~30 messages per second
      if (sent % 25 === 0) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    } catch {
      failed++;
    }
  }

  return {
    success: true,
    sent,
    failed,
    total: count,
    message: `Розсилка завершена: ${sent} відправлено, ${failed} помилок`,
  };
}

// ────── 11. Chatbot Analytics ──────

async function adminChatbotAnalytics(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const { start } = getPeriodRange(String(params.period));

  // Sessions
  const { data: sessions } = await supabase
    .from("telegram_sessions")
    .select("message_count, total_input_tokens, total_output_tokens, tools_used, is_admin, last_activity")
    .gte("last_activity", start);

  const clientSessions = sessions?.filter((s) => !s.is_admin) || [];
  const totalMessages = clientSessions.reduce((s, sess) => s + (sess.message_count || 0), 0);
  const totalInputTokens = clientSessions.reduce((s, sess) => s + (sess.total_input_tokens || 0), 0);
  const totalOutputTokens = clientSessions.reduce((s, sess) => s + (sess.total_output_tokens || 0), 0);

  // Estimate cost (Claude Sonnet 4 pricing approximate)
  const inputCost = (totalInputTokens / 1_000_000) * 3;
  const outputCost = (totalOutputTokens / 1_000_000) * 15;
  const estimatedCost = Math.round((inputCost + outputCost) * 100) / 100;

  // Tools distribution
  const toolCounts = new Map<string, number>();
  clientSessions.forEach((s) => {
    (s.tools_used || []).forEach((tool: string) => {
      toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
    });
  });

  return {
    period: params.period,
    sessions_count: clientSessions.length,
    total_messages: totalMessages,
    avg_session_length: clientSessions.length > 0
      ? Math.round(totalMessages / clientSessions.length * 10) / 10
      : 0,
    estimated_cost_usd: estimatedCost,
    total_tokens: { input: totalInputTokens, output: totalOutputTokens },
    tools_distribution: Object.fromEntries(
      [...toolCounts.entries()].sort((a, b) => b[1] - a[1]),
    ),
  };
}

// ────── 12. Admin Consumables Analytics ──────

async function adminConsumablesAnalytics(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("consumables")
    .select("product_name, product_sku, cycle_days, telegram_id")
    .eq("is_active", true);

  if (!data || data.length === 0) {
    return { total_active: 0, items: [], message: "Жоден клієнт ще не налаштував витратні матеріали." };
  }

  // Group by product
  const byProduct = new Map<string, { name: string; sku: string | null; clients: Set<number>; totalCycle: number; count: number }>();
  data.forEach((c: Record<string, unknown>) => {
    const key = String(c.product_sku || c.product_name);
    const existing = byProduct.get(key);
    if (existing) {
      existing.clients.add(c.telegram_id as number);
      existing.totalCycle += Number(c.cycle_days);
      existing.count++;
    } else {
      byProduct.set(key, {
        name: String(c.product_name),
        sku: c.product_sku as string | null,
        clients: new Set([c.telegram_id as number]),
        totalCycle: Number(c.cycle_days),
        count: 1,
      });
    }
  });

  const items = [...byProduct.values()]
    .map((v) => ({
      product_name: v.name,
      product_sku: v.sku,
      clients_count: v.clients.size,
      avg_cycle_days: Math.round(v.totalCycle / v.count),
    }))
    .sort((a, b) => b.clients_count - a.clients_count)
    .slice(0, 20);

  const uniqueClients = new Set(data.map((c: Record<string, unknown>) => c.telegram_id));

  return {
    total_active: data.length,
    unique_clients: uniqueClients.size,
    top_products: items,
  };
}

// ────── 13. Admin Create Reminder ──────

async function adminCreateReminder(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const telegramId = params._telegram_id as number | undefined;

  if (!telegramId) {
    return { error: "Нагадування доступні тільки в Telegram." };
  }

  const delayMinutes = Number(params.delay_minutes) || 60;
  const remindAt = new Date(Date.now() + delayMinutes * 60 * 1000);

  const { error } = await supabase.from("reminders").insert({
    telegram_id: telegramId,
    message: String(params.message),
    remind_at: remindAt.toISOString(),
  });

  if (error) return { error: "Не вдалось створити нагадування" };

  const hours = Math.floor(delayMinutes / 60);
  const mins = delayMinutes % 60;
  let timeStr = "";
  if (hours > 0) timeStr += `${hours} год `;
  if (mins > 0) timeStr += `${mins} хв`;
  if (!timeStr) timeStr = "менше хвилини";

  return {
    success: true,
    remind_at: remindAt.toISOString(),
    time_str: timeStr.trim(),
    message: String(params.message),
  };
}
