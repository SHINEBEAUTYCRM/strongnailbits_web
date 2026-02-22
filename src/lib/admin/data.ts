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
export async function getProducts(params: { page?: number; limit?: number; status?: string; search?: string; filter?: string }) {
  const { page = 1, limit = 25, status, search, filter } = params;
  const supabase = createAdminClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabase.from("products").select("id, cs_cart_id, name_uk, slug, sku, price, old_price, wholesale_price, quantity, status, main_image_url, description_uk, meta_title, meta_description, is_featured, is_new, created_at, updated_at, category_id, brand_id", { count: "exact" }).order("updated_at", { ascending: false }).range(from, to);
  if (status && status !== "all") query = query.eq("status", status);
  if (search) query = query.or(`name_uk.ilike.%${search}%,sku.ilike.%${search}%`);

  // Quality filters
  if (filter === "no_photo") {
    query = query.or("main_image_url.is.null,main_image_url.eq.");
  } else if (filter === "no_description") {
    query = query.or("description_uk.is.null,description_uk.eq.");
  } else if (filter === "no_seo") {
    query = query.or("meta_title.is.null,meta_title.eq.,meta_description.is.null,meta_description.eq.");
  } else if (filter === "no_category") {
    query = query.is("category_id", null);
  } else if (filter === "no_price") {
    query = query.or("price.is.null,price.eq.0");
  }

  const { data, count } = await query;
  return { products: data ?? [], total: count ?? 0 };
}

export async function getProductQualityCounts() {
  const supabase = createAdminClient();
  const [noPhoto, noDesc, noSeo, noCat, noPrice] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).or("main_image_url.is.null,main_image_url.eq."),
    supabase.from("products").select("id", { count: "exact", head: true }).or("description_uk.is.null,description_uk.eq."),
    supabase.from("products").select("id", { count: "exact", head: true }).or("meta_title.is.null,meta_title.eq.,meta_description.is.null,meta_description.eq."),
    supabase.from("products").select("id", { count: "exact", head: true }).is("category_id", null),
    supabase.from("products").select("id", { count: "exact", head: true }).or("price.is.null,price.eq.0"),
  ]);
  return {
    no_photo: noPhoto.count ?? 0,
    no_description: noDesc.count ?? 0,
    no_seo: noSeo.count ?? 0,
    no_category: noCat.count ?? 0,
    no_price: noPrice.count ?? 0,
  };
}

export async function getProductById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("products").select("id, name_uk, name_ru, slug, sku, description_uk, description_ru, price, old_price, wholesale_price, cost_price, quantity, status, main_image_url, images, weight, properties, meta_title, meta_description, is_featured, is_new, position, category_id, brand_id, cs_cart_id, external_id, enrichment_status, ai_metadata, photo_sources, created_at, updated_at").eq("id", id).single();
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
  const { data } = await supabase
    .from("categories")
    .select("id, name_uk, name_ru, cs_cart_id, parent_cs_cart_id, product_count, position")
    .eq("status", "active")
    .order("position", { ascending: true });
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
  const { data } = await supabase
    .from("brands")
    .select("id, cs_cart_id, name, slug, logo_url, banner_url, description_uk, is_featured, position, country, website_url, status")
    .order("position", { ascending: true });
  return data ?? [];
}

export async function getBrandById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("brands").select("*").eq("id", id).single();
  return data;
}

export async function getBrandProductCount(brandId: string): Promise<number> {
  const supabase = createAdminClient();
  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("brand_id", brandId);
  return count ?? 0;
}

export async function getBrandList() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("brands").select("id, name, source_urls").order("name", { ascending: true });
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

/* ─── Homepage Sections ─── */
export async function getHomepageSections() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("homepage_sections").select("*").order("sort_order");
  return data ?? [];
}

/* ─── Product Showcases ─── */
export async function getShowcases() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("product_showcases").select("*").order("sort_order");
  return data ?? [];
}

export async function getShowcaseByCode(code: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("product_showcases").select("*").eq("code", code).single();
  return data;
}

export async function getShowcaseById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("product_showcases").select("*").eq("id", id).single();
  return data;
}

/* ─── Deal of Day ─── */
export async function getDeals() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("deal_of_day").select("*").order("created_at", { ascending: false });
  return data ?? [];
}

export async function getActiveDeal() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("deal_of_day")
    .select("*")
    .eq("is_enabled", true)
    .gt("end_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

/* ─── Quick Categories ─── */
export async function getQuickCategories() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("quick_categories")
    .select("*, categories(id, name_uk, name_ru, slug, image_url)")
    .order("sort_order");
  return data ?? [];
}

/* ─── Service Features ─── */
export async function getServiceFeatures() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("service_features").select("*").eq("is_enabled", true).order("sort_order");
  return data ?? [];
}

export async function getAllServiceFeatures() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("service_features").select("*").order("sort_order");
  return data ?? [];
}

/* ─── Content Blocks ─── */
export async function getContentBlock(code: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("content_blocks").select("*").eq("code", code).single();
  return data;
}

/* ─── Top Bar Links ─── */
export async function getTopBarLinks() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("top_bar_links").select("*").eq("is_enabled", true).order("sort_order");
  return data ?? [];
}

export async function getAllTopBarLinks() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("top_bar_links").select("*").order("sort_order");
  return data ?? [];
}

/* ─── Banners ─── */
export async function getBanners(params?: { type?: string; status?: string }) {
  const supabase = createAdminClient();
  let query = supabase.from("banners").select("*").order("sort_order", { ascending: true }).order("priority", { ascending: false });
  if (params?.type && params.type !== "all") query = query.eq("type", params.type);
  if (params?.status === "active") query = query.eq("is_active", true);
  if (params?.status === "inactive") query = query.eq("is_active", false);
  const { data } = await query;
  return data ?? [];
}

export async function getBannerById(id: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("banners").select("*").eq("id", id).single();
  return data;
}
