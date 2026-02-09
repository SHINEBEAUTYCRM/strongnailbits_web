import { createAdminClient } from "@/lib/supabase/admin";

/* ─── Dashboard Stats ─── */
export async function getDashboardStats() {
  const supabase = createAdminClient();
  const [products, orders, profiles, todayOrders, revenue] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabase.from("orders").select("total"),
  ]);
  const totalRevenue = revenue.data?.reduce((sum, o) => sum + Number(o.total || 0), 0) ?? 0;
  return { productCount: products.count ?? 0, orderCount: orders.count ?? 0, clientCount: profiles.count ?? 0, todayOrderCount: todayOrders.count ?? 0, totalRevenue };
}

export async function getRecentOrders(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select("id, order_number, status, total, created_at, profile_id, profiles(first_name, last_name, email, phone)").order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

export async function getLowStockProducts(limit = 10) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("id, name_uk, slug, quantity, sku, main_image_url").eq("status", "active").gt("quantity", 0).lt("quantity", 5).order("quantity", { ascending: true }).limit(limit);
  return data ?? [];
}

/* ─── Orders ─── */
export async function getOrders(params: { page?: number; limit?: number; status?: string; search?: string }) {
  const { page = 1, limit = 25, status, search } = params;
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase.from("orders").select("id, order_number, status, payment_status, total, shipping_cost, discount, created_at, payment_method, shipping_method, ttn, notes, profile_id, items, profiles(first_name, last_name, email, phone)", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`order_number.ilike.%${search}%,ttn.ilike.%${search}%`);
  const { data, count } = await query;
  return { orders: data ?? [], total: count ?? 0 };
}

export async function getOrderById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("*, profiles(id, first_name, last_name, email, phone, company, type)")
    .eq("id", id)
    .single();
  return data;
}

/* ─── Products ─── */
export async function getProducts(params: { page?: number; limit?: number; status?: string; search?: string }) {
  const { page = 1, limit = 25, status, search } = params;
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase.from("products").select("id, cs_cart_id, name_uk, slug, sku, price, old_price, wholesale_price, quantity, status, main_image_url, is_featured, is_new, created_at, updated_at, categories(name_uk), brands(name)", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`name_uk.ilike.%${search}%,sku.ilike.%${search}%`);
  const { data, count } = await query;
  return { products: data ?? [], total: count ?? 0 };
}

export async function getProductById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("*").eq("id", id).single();
  return data;
}

/* ─── Categories ─── */
export async function getCategories() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("categories").select("id, cs_cart_id, parent_cs_cart_id, name_uk, slug, status, product_count, position, image_url, description_uk").order("position", { ascending: true });
  return data ?? [];
}

export async function getCategoryList() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("categories").select("id, name_uk").eq("status", "active").order("name_uk", { ascending: true });
  return data ?? [];
}

export async function getCategoryById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("categories").select("*").eq("id", id).single();
  return data;
}

export async function getCategoryProductCount(categoryId: string) {
  const supabase = createAdminClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("category_id", categoryId);
  return count ?? 0;
}

/* ─── Brands ─── */
export async function getBrands() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("brands").select("id, cs_cart_id, name, slug, logo_url, is_featured, position, country").order("position", { ascending: true });
  return data ?? [];
}

export async function getBrandList() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("brands").select("id, name").order("name", { ascending: true });
  return data ?? [];
}

/* ─── Clients ─── */
export async function getClients(params: { page?: number; limit?: number; search?: string; type?: string }) {
  const { page = 1, limit = 25, search, type } = params;
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase.from("profiles").select("id, email, phone, first_name, last_name, company, type, discount_percent, is_active, total_orders, total_spent, created_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (type && type !== "all") query = query.eq("type", type);
  if (search) query = query.or(`email.ilike.%${search}%,first_name.ilike.%${search}%,last_name.ilike.%${search}%,phone.ilike.%${search}%,company.ilike.%${search}%`);
  const { data, count } = await query;
  return { clients: data ?? [], total: count ?? 0 };
}

/* ─── Sync Logs ─── */
export async function getSyncLogs(limit = 20) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("sync_log").select("*").order("started_at", { ascending: false }).limit(limit);
  return data ?? [];
}
