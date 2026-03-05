/**
 * Telegram Formatters — format products, orders, etc. for Telegram messages.
 */

import { escHtml } from "./bot";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://strongnailbitsb2b.com";

// ────── Product Formatting ──────

interface ProductData {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  wholesale_price?: number;
  old_price?: number;
  image_url?: string;
  in_stock: boolean;
  amount?: number;
  brand?: string;
  url?: string;
}

/** Format product as Telegram photo caption */
export function formatProductCaption(product: ProductData): string {
  const stock = product.in_stock
    ? `✅ В наявності${product.amount ? ` (${product.amount} шт)` : ""}`
    : "❌ Немає в наявності";

  let price = `💰 ${product.price}₴`;
  if (product.wholesale_price && product.wholesale_price < product.price) {
    price += ` (опт: ${product.wholesale_price}₴)`;
  }
  if (product.old_price && product.old_price > product.price) {
    price += ` <s>${product.old_price}₴</s>`;
  }

  const lines = [`<b>${escHtml(product.name)}</b>`];
  if (product.sku) lines.push(`🏷️ ${escHtml(product.sku)}`);
  lines.push(price);
  lines.push(stock);

  return lines.join("\n");
}

/** Build inline keyboard for a product card */
export function buildProductKeyboard(product: ProductData): {
  inline_keyboard: Record<string, unknown>[][];
} {
  const buttons: Record<string, unknown>[][] = [];

  const row1: Record<string, unknown>[] = [];
  if (product.in_stock) {
    row1.push({
      text: "🛒 В кошик",
      callback_data: `add_cart:${product.id}`,
    });
  } else {
    row1.push({
      text: "🔔 Повідомити",
      callback_data: `notify_stock:${product.id}`,
    });
  }

  const productUrl = product.slug
    ? `${SITE_URL}/product/${product.slug}`
    : product.url
      ? `${SITE_URL}${product.url}`
      : `${SITE_URL}/catalog`;

  row1.push({ text: "📄 На сайті", url: productUrl });
  buttons.push(row1);

  const row2: Record<string, unknown>[] = [
    { text: "🔗 Схожі товари", callback_data: `similar:${product.id}` },
  ];
  if (product.brand) {
    row2.push({
      text: `🛍️ ${product.brand}`,
      callback_data: `brand:${product.brand}`,
    });
  }
  buttons.push(row2);

  return { inline_keyboard: buttons };
}

/** Format product list as text (when photos not available) */
export function formatProductListText(
  products: ProductData[],
  title?: string,
): string {
  const lines: string[] = [];
  if (title) lines.push(`<b>${escHtml(title)}</b>\n`);

  products.forEach((p, i) => {
    const stock = p.in_stock ? "✅" : "❌";
    let price = `${p.price}₴`;
    if (p.wholesale_price && p.wholesale_price < p.price) {
      price += ` (опт: ${p.wholesale_price}₴)`;
    }
    lines.push(
      `${i + 1}. ${escHtml(p.name)} — ${price} ${stock}`,
    );
  });

  return lines.join("\n");
}

/** Build inline keyboard for product list (number buttons) */
export function buildProductListKeyboard(
  products: ProductData[],
  hasMore?: boolean,
): { inline_keyboard: Record<string, unknown>[][] } {
  const buttons: Record<string, unknown>[][] = [];

  // Number buttons for each product (rows of 5)
  const numberButtons: Record<string, unknown>[] = [];
  products.forEach((p, i) => {
    if (p.in_stock) {
      numberButtons.push({
        text: `${i + 1}️⃣`,
        callback_data: `detail:${p.id}`,
      });
    }
  });

  // Split into rows of 5
  for (let i = 0; i < numberButtons.length; i += 5) {
    buttons.push(numberButtons.slice(i, i + 5));
  }

  // "Show more" and "Catalog" buttons
  const bottomRow: Record<string, unknown>[] = [];
  if (hasMore) {
    bottomRow.push({ text: "Ще →", callback_data: "more_results" });
  }
  bottomRow.push({
    text: "🔗 Каталог на сайті",
    url: `${SITE_URL}/catalog`,
  });
  buttons.push(bottomRow);

  return { inline_keyboard: buttons };
}

// ────── Order Formatting ──────

interface OrderData {
  order_number: string;
  status: string;
  status_label?: string;
  tracking_number?: string;
  tracking_url?: string;
  carrier?: string;
  total: number;
  items?: { name: string; quantity: number; price: number }[];
  created_at?: string;
  np_status_text?: string;
  np_estimated_delivery?: string;
}

/** Format order status for Telegram */
export function formatOrderForTelegram(order: OrderData): string {
  const emoji: Record<string, string> = {
    new: "📋",
    pending: "⏳",
    processing: "⚙️",
    confirmed: "✅",
    paid: "💳",
    shipped: "🚚",
    delivered: "📬",
    cancelled: "❌",
  };

  const e = emoji[order.status] || "📋";
  const statusLabel = order.status_label || order.status;

  const lines = [
    `📦 <b>Замовлення #${escHtml(order.order_number)}</b>`,
    ``,
    `Статус: ${e} ${escHtml(statusLabel)}`,
  ];

  if (order.tracking_number) {
    lines.push(`📋 ТТН: <code>${escHtml(order.tracking_number)}</code>`);
    lines.push(`🚚 ${escHtml(order.carrier || "Нова Пошта")}`);
  }

  if (order.np_estimated_delivery) {
    lines.push(`📅 Очікувана доставка: ${escHtml(order.np_estimated_delivery)}`);
  }

  if (order.np_status_text) {
    lines.push(`📍 ${escHtml(order.np_status_text)}`);
  }

  if (order.items && order.items.length > 0) {
    lines.push(``);
    lines.push(`Товари:`);
    order.items.slice(0, 10).forEach((item) => {
      lines.push(
        `• ${escHtml(item.name)} × ${item.quantity} — ${(item.price * item.quantity).toLocaleString("uk-UA")}₴`,
      );
    });
    if (order.items.length > 10) {
      lines.push(`... ще ${order.items.length - 10} позицій`);
    }
  }

  lines.push(``);
  lines.push(`💰 Разом: <b>${Number(order.total).toLocaleString("uk-UA")}₴</b>`);

  return lines.join("\n");
}

/** Build inline keyboard for order */
export function buildOrderKeyboard(order: OrderData): {
  inline_keyboard: Record<string, unknown>[][];
} {
  const buttons: Record<string, unknown>[][] = [];

  if (order.tracking_url) {
    buttons.push([{ text: "📍 Трекінг НП", url: order.tracking_url }]);
  }

  buttons.push([
    {
      text: "♻️ Повторити замовлення",
      callback_data: `reorder:${order.order_number}`,
    },
    {
      text: "📋 На сайті",
      url: `${SITE_URL}/account/orders`,
    },
  ]);

  return { inline_keyboard: buttons };
}

// ────── Cart Formatting ──────

interface CartData {
  items: {
    name: string;
    sku?: string;
    price: number;
    quantity: number;
    subtotal: number;
    in_stock: boolean;
  }[];
  total: number;
  item_count: number;
}

/** Format cart for Telegram */
export function formatCartForTelegram(cart: CartData): string {
  if (cart.item_count === 0) {
    return "🛒 Ваш кошик порожній.\n\nШукаєте щось конкретне? Просто напишіть!";
  }

  const lines = [
    `🛒 <b>Ваш кошик</b> (${cart.item_count} товарів)`,
    ``,
  ];

  cart.items.forEach((item, i) => {
    const stock = item.in_stock ? "" : " ❌";
    lines.push(
      `${i + 1}. ${escHtml(item.name)} × ${item.quantity} — ${item.subtotal.toLocaleString("uk-UA")}₴${stock}`,
    );
  });

  lines.push(``);
  lines.push(
    `💰 Разом: <b>${cart.total.toLocaleString("uk-UA")}₴</b>`,
  );

  if (cart.total >= 1500) {
    lines.push(`🚚 Доставка: <b>безкоштовно</b>`);
  } else {
    lines.push(`🚚 Доставка: ~70₴ (безкоштовно від 1 500₴)`);
  }

  return lines.join("\n");
}

// ────── Quick Order Formatting ──────

interface QuickOrderData {
  items: {
    sku: string;
    name?: string;
    quantity: number;
    price?: number;
    subtotal?: number;
    error?: string;
  }[];
  total: number;
  has_errors: boolean;
}

/** Format quick order result for Telegram */
export function formatQuickOrderForTelegram(order: QuickOrderData): string {
  const lines = [`📋 <b>Швидке замовлення:</b>`, ``];

  order.items.forEach((item) => {
    if (item.error) {
      lines.push(
        `❌ ${escHtml(item.sku)} — ${escHtml(item.error)}`,
      );
    } else {
      lines.push(
        `✅ ${escHtml(item.sku)} × ${item.quantity} — ${(item.subtotal || 0).toLocaleString("uk-UA")}₴`,
      );
      if (item.name) {
        lines.push(`   ${escHtml(item.name)}`);
      }
    }
  });

  lines.push(``);
  lines.push(
    `💰 Разом: <b>${order.total.toLocaleString("uk-UA")}₴</b>`,
  );

  if (order.total >= 1500) {
    lines.push(`🚚 Доставка: безкоштовно`);
  }

  return lines.join("\n");
}

// ────── Admin Order Formatting ──────

interface AdminOrderData {
  order_number: string;
  status: string;
  total: number;
  items_count?: number;
  customer_name: string;
  customer_phone?: string;
  customer_type?: string;
  shipping_method?: string;
  payment_method?: string;
  created_at: string;
}

/** Format order for admin view */
export function formatAdminOrderBrief(order: AdminOrderData): string {
  const e =
    order.customer_type === "wholesale" ? " 🏢 ОПТ" : "";

  const timeAgo = getTimeAgo(new Date(order.created_at));

  return [
    `#${escHtml(order.order_number)} — ${escHtml(order.customer_name)}${e}`,
    `💰 ${Number(order.total).toLocaleString("uk-UA")}₴ | ${order.items_count || "?"} товарів | ${escHtml(order.shipping_method || "НП")}`,
    `⏱️ ${timeAgo}`,
  ].join("\n");
}

/** Build admin order action buttons */
export function buildAdminOrderKeyboard(
  orderId: string,
): { inline_keyboard: Record<string, unknown>[][] } {
  return {
    inline_keyboard: [
      [
        { text: "✅ Підтвердити", callback_data: `confirm_order:${orderId}` },
        { text: "👁 Деталі", callback_data: `order_detail:${orderId}` },
        { text: "❌ Скасувати", callback_data: `cancel_order:${orderId}` },
      ],
    ],
  };
}

// ────── Helpers ──────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "щойно";
  if (diffMin < 60) return `${diffMin} хв тому`;
  if (diffHours < 24) return `${diffHours} год тому`;
  if (diffDays < 7) return `${diffDays} дн тому`;
  return date.toLocaleDateString("uk-UA");
}

/** Format number with spaces: 1240000 → "1 240 000" */
export function fmtNum(n: number): string {
  return n.toLocaleString("uk-UA");
}

/** Format money: 1240000 → "1 240 000₴" */
export function fmtMoney(n: number): string {
  return `${fmtNum(n)}₴`;
}
