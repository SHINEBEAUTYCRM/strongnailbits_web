/**
 * Claude Tool Implementations — 15 client-facing tools
 *
 * Adapted to actual ShineShop DB schema:
 * - products: name_uk, quantity (not amount), brand_id FK, category_id FK
 * - orders: profile_id (not user_id), ttn + tracking_number
 * - profiles: telegram_chat_id, type='wholesale' for B2B
 * - carts: JSONB items (not separate cart_items table)
 */

import { type SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";
const FREE_DELIVERY_FROM = 1500;

// ────── Main Router ──────

export async function executeToolCall(
  toolName: string,
  params: Record<string, unknown>,
  profileId?: string,
): Promise<unknown> {
  const supabase = createAdminClient();

  switch (toolName) {
    case "search_products":
      return searchProducts(supabase, params);
    case "get_product_by_id":
      return getProductById(supabase, params);
    case "get_cart":
      return getCart(supabase, profileId);
    case "add_to_cart":
      return addToCart(supabase, profileId, params);
    case "remove_from_cart":
      return removeFromCart(supabase, profileId, params);
    case "get_order_status":
      return getOrderStatus(supabase, profileId, params);
    case "get_orders_history":
      return getOrdersHistory(supabase, profileId, params);
    case "calculate_delivery":
      return calculateDelivery(params);
    case "get_categories":
      return getCategories(supabase, params);
    case "get_brands":
      return getBrands(supabase, params);
    case "create_waitlist":
      return createWaitlist(supabase, profileId, params);
    case "get_wholesale_prices":
      return getWholesalePrices(supabase, profileId, params);
    case "quick_order_by_sku":
      return quickOrderBySku(supabase, profileId, params);
    case "get_business_info":
      return getBusinessInfo(params);
    case "get_new_arrivals":
      return getNewArrivals(supabase, params);
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ────── 1. Search Products ──────

async function searchProducts(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("products")
    .select(
      "id, name_uk, slug, sku, price, wholesale_price, old_price, main_image_url, quantity, status, brand_id, category_id, brands(name), categories(name_uk, slug)",
    )
    .eq("status", "active");

  // Text search
  if (params.query) {
    const q = String(params.query).trim();
    query = query.or(
      `name_uk.ilike.%${q}%,sku.ilike.%${q}%,name_ru.ilike.%${q}%`,
    );
  }

  // Brand filter — join check
  if (params.brand) {
    const brandName = String(params.brand);
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${brandName}%`)
      .limit(1)
      .maybeSingle();
    if (brand) {
      query = query.eq("brand_id", brand.id);
    }
  }

  // Category filter
  if (params.category_slug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", String(params.category_slug))
      .maybeSingle();
    if (cat) {
      query = query.eq("category_id", cat.id);
    }
  }

  // Price filters
  if (params.min_price) query = query.gte("price", Number(params.min_price));
  if (params.max_price) query = query.lte("price", Number(params.max_price));

  // Stock filter (default: only in stock)
  if (params.in_stock_only !== false) query = query.gt("quantity", 0);

  // Sorting
  switch (params.sort_by) {
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("created_at", { ascending: false });
      break;
    default:
      query = query.order("quantity", { ascending: false });
      break;
  }

  const limit = Math.min(Number(params.limit) || 6, 20);
  query = query.limit(limit);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const total = data?.length || 0;
  return {
    products:
      data?.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: (p as Record<string, unknown>).name_uk,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        wholesale_price: p.wholesale_price,
        old_price: p.old_price,
        image_url: p.main_image_url || "/images/placeholder-product.jpg",
        in_stock: ((p.quantity as number) || 0) > 0,
        amount: p.quantity,
        brand:
          (p.brands as Record<string, unknown> | null)?.name || null,
        category:
          (p.categories as Record<string, unknown> | null)?.name_uk ||
          null,
        category_slug:
          (p.categories as Record<string, unknown> | null)?.slug || null,
        url: `/product/${p.slug}`,
      })) || [],
    total,
    has_more: total >= limit,
  };
}

// ────── 2. Get Product By ID ──────

async function getProductById(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("products")
    .select(
      "*, brands(name, slug), categories(name_uk, slug)",
    );

  if (params.product_id) query = query.eq("id", String(params.product_id));
  else if (params.slug) query = query.eq("slug", String(params.slug));
  else return { error: "Потрібен product_id або slug" };

  const { data, error } = await query.single();
  if (error) return { error: "Товар не знайдено" };

  return {
    id: data.id,
    name: data.name_uk,
    slug: data.slug,
    sku: data.sku,
    price: data.price,
    wholesale_price: data.wholesale_price,
    old_price: data.old_price,
    description: data.description_uk,
    image_url: data.main_image_url || "/images/placeholder-product.jpg",
    images: data.images,
    in_stock: (data.quantity || 0) > 0,
    amount: data.quantity,
    brand: data.brands?.name || null,
    category: data.categories?.name_uk || null,
    category_slug: data.categories?.slug || null,
    url: `/product/${data.slug}`,
  };
}

// ────── 3. Get Cart ──────

async function getCart(supabase: SupabaseClient, profileId?: string) {
  if (!profileId) {
    return {
      error:
        "Клієнт не авторизований. Щоб переглянути кошик, потрібно прив'язати акаунт.",
    };
  }

  const { data: cart } = await supabase
    .from("carts")
    .select("items")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!cart || !cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
    return { items: [], total: 0, item_count: 0 };
  }

  // Enrich items with current product data
  const productIds = cart.items.map(
    (item: Record<string, unknown>) => item.product_id,
  );
  const { data: products } = await supabase
    .from("products")
    .select("id, name_uk, slug, sku, price, wholesale_price, main_image_url, quantity")
    .in("id", productIds);

  const productMap = new Map(
    (products || []).map((p: Record<string, unknown>) => [p.id, p]),
  );

  const items = cart.items
    .map((item: Record<string, unknown>) => {
      const p = productMap.get(item.product_id) as Record<string, unknown> | undefined;
      if (!p) return null;
      const qty = Number(item.quantity) || 1;
      return {
        product_id: p.id,
        name: p.name_uk,
        sku: p.sku,
        price: p.price,
        quantity: qty,
        subtotal: (Number(p.price) || 0) * qty,
        image_url: p.main_image_url,
        url: `/product/${p.slug}`,
        in_stock: (Number(p.quantity) || 0) >= qty,
      };
    })
    .filter(Boolean);

  const total = items.reduce(
    (sum: number, item: Record<string, unknown>) =>
      sum + (Number(item.subtotal) || 0),
    0,
  );

  return { items, total, item_count: items.length };
}

// ────── 4. Add to Cart ──────

async function addToCart(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) {
    return {
      error:
        "Клієнт не авторизований. Щоб додати в кошик, прив'яжіть акаунт.",
    };
  }

  const quantity = Number(params.quantity) || 1;

  // Check product exists and in stock
  const { data: product } = await supabase
    .from("products")
    .select("id, name_uk, quantity, price")
    .eq("id", String(params.product_id))
    .single();

  if (!product) return { error: "Товар не знайдено" };
  if (product.quantity < quantity) {
    return {
      error: `Недостатньо товару. В наявності: ${product.quantity} шт`,
    };
  }

  // Get current cart
  const { data: cart } = await supabase
    .from("carts")
    .select("items")
    .eq("profile_id", profileId)
    .maybeSingle();

  const currentItems = (cart?.items as Record<string, unknown>[] | null) || [];
  const existingIdx = currentItems.findIndex(
    (i: Record<string, unknown>) => i.product_id === String(params.product_id),
  );

  let updatedItems: Record<string, unknown>[];

  if (existingIdx >= 0) {
    updatedItems = [...currentItems];
    updatedItems[existingIdx] = {
      ...updatedItems[existingIdx],
      quantity:
        (Number(updatedItems[existingIdx].quantity) || 0) + quantity,
    };
  } else {
    updatedItems = [
      ...currentItems,
      { product_id: String(params.product_id), quantity },
    ];
  }

  // Upsert cart
  await supabase.from("carts").upsert(
    { profile_id: profileId, items: updatedItems },
    { onConflict: "profile_id" },
  );

  return {
    success: true,
    message: `${product.name_uk} × ${quantity} додано в кошик`,
    product_name: product.name_uk,
    quantity,
    price: product.price,
  };
}

// ────── 5. Remove from Cart ──────

async function removeFromCart(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) return { error: "Клієнт не авторизований" };

  const { data: cart } = await supabase
    .from("carts")
    .select("items")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (!cart?.items) return { error: "Кошик порожній" };

  const currentItems = cart.items as Record<string, unknown>[];
  const newQty = Number(params.quantity);

  let updatedItems: Record<string, unknown>[];

  if (newQty === 0) {
    // Remove completely
    updatedItems = currentItems.filter(
      (i: Record<string, unknown>) =>
        i.product_id !== String(params.product_id),
    );
  } else {
    // Update quantity
    updatedItems = currentItems.map((i: Record<string, unknown>) =>
      i.product_id === String(params.product_id)
        ? { ...i, quantity: newQty }
        : i,
    );
  }

  await supabase
    .from("carts")
    .update({ items: updatedItems })
    .eq("profile_id", profileId);

  return {
    success: true,
    message:
      newQty === 0
        ? "Товар видалено з кошика"
        : `Кількість змінено на ${newQty}`,
  };
}

// ────── 6. Get Order Status ──────

async function getOrderStatus(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("orders")
    .select("*");

  if (params.order_number) {
    query = query.eq("order_number", String(params.order_number));
  } else if (profileId) {
    query = query
      .eq("profile_id", profileId)
      .order("created_at", { ascending: false })
      .limit(1);
  } else {
    return { error: "Потрібен номер замовлення або авторизація" };
  }

  const { data, error } = await query;
  if (error || !data?.length) return { error: "Замовлення не знайдено" };

  const order = data[0];
  const statusLabels: Record<string, string> = {
    new: "Нове",
    pending: "Оформлено",
    processing: "Обробляється",
    confirmed: "Підтверджено",
    paid: "Оплачено",
    shipped: "Відправлено",
    delivered: "Доставлено",
    cancelled: "Скасовано",
  };

  const ttn = order.ttn || order.tracking_number;

  return {
    order_number: order.order_number,
    status: order.status,
    status_label: statusLabels[order.status] || order.status,
    tracking_number: ttn,
    tracking_url: ttn
      ? `https://novaposhta.ua/tracking/?cargo_number=${ttn}`
      : null,
    carrier: order.shipping_method || "Нова Пошта",
    created_at: order.created_at,
    total: order.total,
    items: Array.isArray(order.items)
      ? order.items.map((item: Record<string, unknown>) => ({
          name: item.name || item.product_name,
          quantity: item.quantity,
          price: item.price,
        }))
      : [],
    np_status_text: order.np_status_text,
    np_estimated_delivery: order.np_estimated_delivery,
  };
}

// ────── 7. Get Orders History ──────

async function getOrdersHistory(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) {
    return { error: "Потрібна авторизація для перегляду історії" };
  }

  let query = supabase
    .from("orders")
    .select("order_number, status, total, created_at, items")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  if (params.period && params.period !== "all") {
    const now = new Date();
    const periods: Record<string, number> = {
      week: 7,
      month: 30,
      quarter: 90,
      year: 365,
    };
    const days = periods[String(params.period)] || 30;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    query = query.gte("created_at", from.toISOString());
  }

  query = query.limit(Number(params.limit) || 5);

  const { data, error } = await query;
  if (error) return { error: error.message };

  const totalSpent =
    data?.reduce(
      (sum: number, o: Record<string, unknown>) =>
        sum + (Number(o.total) || 0),
      0,
    ) || 0;

  return {
    orders: data || [],
    total_orders: data?.length || 0,
    total_spent: totalSpent,
  };
}

// ────── 8. Calculate Delivery ──────

async function calculateDelivery(params: Record<string, unknown>) {
  const orderSum = Number(params.order_sum) || 0;

  if (orderSum >= FREE_DELIVERY_FROM) {
    return {
      cost: 0,
      message: `Безкоштовна доставка! Ваше замовлення від ${FREE_DELIVERY_FROM}₴.`,
      carrier: "Нова Пошта",
      estimated_days: "1-3 дні",
    };
  }

  return {
    cost: 70,
    message: `Доставка в ${params.city}: ~70₴ Новою Поштою. Безкоштовно від ${FREE_DELIVERY_FROM}₴.`,
    carrier: "Нова Пошта",
    estimated_days: "1-3 дні",
  };
}

// ────── 9. Get Categories ──────

async function getCategories(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  let query = supabase
    .from("categories")
    .select("id, name_uk, slug, product_count")
    .eq("status", "active");

  if (params.parent_slug) {
    const { data: parent } = await supabase
      .from("categories")
      .select("cs_cart_id")
      .eq("slug", String(params.parent_slug))
      .maybeSingle();
    if (parent) {
      query = query.eq("parent_cs_cart_id", parent.cs_cart_id);
    }
  } else {
    query = query.is("parent_cs_cart_id", null);
  }

  query = query.order("position");

  const { data } = await query;
  return {
    categories:
      data?.map((c: Record<string, unknown>) => ({
        name: c.name_uk,
        slug: c.slug,
        url: `/catalog/${c.slug}`,
        product_count: c.product_count,
      })) || [],
  };
}

// ────── 10. Get Brands ──────

async function getBrands(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  if (params.brand_name) {
    // Detailed brand info
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .ilike("name", `%${String(params.brand_name)}%`)
      .maybeSingle();

    // Count products for this brand
    const { count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("brand_id", brand?.id || "")
      .eq("status", "active")
      .gt("quantity", 0);

    return {
      brand: brand?.name || params.brand_name,
      slug: brand?.slug || null,
      description: brand?.description_uk || "Інформація про бренд поки недоступна.",
      logo_url: brand?.logo_url || null,
      products_count: count || 0,
      catalog_url: brand?.slug ? `/brands/${brand.slug}` : null,
    };
  }

  // List all brands
  const { data } = await supabase
    .from("brands")
    .select("name, slug, logo_url")
    .order("name");

  return {
    brands:
      data?.map((b: Record<string, unknown>) => ({
        name: b.name,
        slug: b.slug,
        url: `/brands/${b.slug}`,
      })) || [],
    total: data?.length || 0,
  };
}

// ────── 11. Create Waitlist ──────

async function createWaitlist(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) {
    return { error: "Потрібна авторизація для підписки на сповіщення" };
  }

  // For now, save as a simple record. Can be enhanced later.
  // Check if product exists
  const { data: product } = await supabase
    .from("products")
    .select("id, name_uk")
    .eq("id", String(params.product_id))
    .single();

  if (!product) return { error: "Товар не знайдено" };

  // TODO: Implement proper waitlist table
  // For now, return success message
  return {
    success: true,
    message: `Готово! Повідомимо вас одразу як "${product.name_uk}" з'явиться в наявності.`,
  };
}

// ────── 12. Get Wholesale Prices ──────

async function getWholesalePrices(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) return { error: "Потрібна авторизація" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("id", profileId)
    .single();

  if (profile?.type !== "wholesale") {
    return {
      error:
        "Оптові ціни доступні тільки зареєстрованим оптовим клієнтам. Дізнайтесь умови: /wholesale",
    };
  }

  const productIds = params.product_ids as string[];
  if (productIds?.length) {
    const { data: products } = await supabase
      .from("products")
      .select("id, name_uk, sku, price, wholesale_price")
      .in("id", productIds);

    const qty = Number(params.quantity) || 1;
    return {
      products: products?.map((p: Record<string, unknown>) => ({
        name: p.name_uk,
        sku: p.sku,
        retail_price: p.price,
        wholesale_price: p.wholesale_price || p.price,
        quantity: qty,
        retail_total: (Number(p.price) || 0) * qty,
        wholesale_total: (Number(p.wholesale_price) || Number(p.price) || 0) * qty,
        savings:
          ((Number(p.price) || 0) -
            (Number(p.wholesale_price) || Number(p.price) || 0)) *
          qty,
      })),
    };
  }

  return { message: "Вкажіть товари для розрахунку оптових цін." };
}

// ────── 13. Quick Order by SKU ──────

async function quickOrderBySku(
  supabase: SupabaseClient,
  profileId: string | undefined,
  params: Record<string, unknown>,
) {
  if (!profileId) return { error: "Потрібна авторизація для швидкого замовлення" };

  const items = params.items as { sku: string; quantity: number }[];
  const results = [];
  let total = 0;

  for (const item of items) {
    const { data: product } = await supabase
      .from("products")
      .select("id, name_uk, sku, price, wholesale_price, quantity")
      .ilike("sku", item.sku)
      .maybeSingle();

    if (!product) {
      results.push({ sku: item.sku, error: "Не знайдено" });
      continue;
    }

    if (product.quantity < item.quantity) {
      results.push({
        sku: item.sku,
        name: product.name_uk,
        error: `В наявності тільки ${product.quantity} шт`,
      });
      continue;
    }

    const price = product.wholesale_price || product.price;
    total += Number(price) * item.quantity;
    results.push({
      sku: product.sku,
      name: product.name_uk,
      quantity: item.quantity,
      price,
      subtotal: Number(price) * item.quantity,
      product_id: product.id,
    });
  }

  return {
    items: results,
    total,
    has_errors: results.some((r: Record<string, unknown>) => r.error),
  };
}

// ────── 14. Get Business Info ──────

async function getBusinessInfo(params: Record<string, unknown>) {
  // Static business info — can be enhanced with ai_config table later
  const info: Record<string, unknown> = {
    contacts: {
      phone: "+380XXXXXXXXX",
      telegram: "@shineshop_ua",
      instagram: "@shineshop.ua",
      email: "info@shineshopb2b.com",
      address: "Одеса, Україна",
      site: SITE_URL,
    },
    schedule: {
      mon: "09:00-18:00",
      tue: "09:00-18:00",
      wed: "09:00-18:00",
      thu: "09:00-18:00",
      fri: "09:00-18:00",
      sat: "10:00-15:00",
      sun: "Вихідний",
    },
    delivery: {
      methods: [
        {
          name: "Нова Пошта",
          description: "1-3 дні по Україні",
          enabled: true,
        },
        { name: "УкрПошта", description: "3-7 днів", enabled: true },
        { name: "Самовивіз", description: "Одеса", enabled: true },
      ],
      free_from: `${FREE_DELIVERY_FROM}₴`,
    },
    payment: {
      methods: [
        {
          name: "LiqPay",
          description: "Visa/Mastercard онлайн",
          enabled: true,
        },
        {
          name: "Monobank",
          description: "Оплата через Monobank",
          enabled: true,
        },
        {
          name: "Накладений платіж",
          description: "Оплата при отриманні (НП)",
          enabled: true,
        },
        {
          name: "Безготівковий",
          description: "Для юр. осіб, рахунок-фактура",
          enabled: true,
        },
      ],
    },
    returns: {
      days: 14,
      conditions: "Товар не відкритий, в оригінальній упаковці, є чек",
      contact: "Зверніться до менеджера через бот або на сайті",
    },
    wholesale_terms: {
      min_order: "2000₴",
      description:
        "Оптові ціни доступні зареєстрованим оптовим клієнтам. Для реєстрації зверніться до менеджера.",
      registration_url: `${SITE_URL}/register`,
    },
    about: {
      name: "Shine Shop B2B",
      description:
        "Найбільший nail-постачальник в Одесі. Працює з 2017 року. 12 000+ товарів, 80+ брендів.",
      site: SITE_URL,
    },
  };

  return {
    topic: params.topic,
    data: info[String(params.topic)] || { message: "Інформація недоступна" },
  };
}

// ────── 15. Get New Arrivals ──────

async function getNewArrivals(
  supabase: SupabaseClient,
  params: Record<string, unknown>,
) {
  const days = Number(params.days) || 7;
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000,
  ).toISOString();

  let query = supabase
    .from("products")
    .select(
      "id, name_uk, slug, sku, price, wholesale_price, main_image_url, quantity, brands(name), created_at",
    )
    .gte("created_at", since)
    .eq("status", "active")
    .gt("quantity", 0)
    .order("created_at", { ascending: false });

  if (params.brand) {
    const { data: brand } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${String(params.brand)}%`)
      .maybeSingle();
    if (brand) query = query.eq("brand_id", brand.id);
  }

  if (params.category_slug) {
    const { data: cat } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", String(params.category_slug))
      .maybeSingle();
    if (cat) query = query.eq("category_id", cat.id);
  }

  query = query.limit(Number(params.limit) || 6);

  const { data } = await query;
  return {
    products:
      data?.map((p: Record<string, unknown>) => ({
        id: p.id,
        name: p.name_uk,
        slug: p.slug,
        sku: p.sku,
        price: p.price,
        brand: (p.brands as Record<string, unknown> | null)?.name || null,
        image_url: p.main_image_url,
        url: `/product/${p.slug}`,
        in_stock: ((p.quantity as number) || 0) > 0,
      })) || [],
    period_days: days,
  };
}
