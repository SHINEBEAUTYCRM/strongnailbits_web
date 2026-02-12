/**
 * Telegram Proactive Notifications — ShineShop
 *
 * Two-way notifications:
 * 1. Client notifications: order shipped, product available, abandoned cart
 * 2. Admin notifications: new orders, critical stock, client requests, daily reports
 *
 * Each notification is fire-and-forget (non-blocking).
 */

import { TelegramBot, escHtml, getBot } from "./bot";
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtMoney, fmtNum } from "./formatters";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://shineshopb2b.com";
const ADMIN_URL = `${SITE_URL}/admin`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLIENT NOTIFICATIONS (бот → клієнт)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Order confirmed */
export async function notifyClientOrderConfirmed(data: {
  telegramChatId: number;
  orderNumber: string;
  total: number;
}) {
  const bot = safeGetBot();
  if (!bot) return;

  await bot.sendMessage(
    data.telegramChatId,
    `✅ Замовлення #${escHtml(data.orderNumber)} підтверджено!\n💰 ${fmtMoney(data.total)}\nОчікуйте відправку протягом доби.`,
  );
}

/** Order shipped with TTN */
export async function notifyClientOrderShipped(data: {
  telegramChatId: number;
  orderNumber: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}) {
  const bot = safeGetBot();
  if (!bot) return;

  const lines = [
    `🚚 Замовлення #${escHtml(data.orderNumber)} відправлено!`,
    ``,
    `📋 ТТН: <code>${escHtml(data.trackingNumber)}</code>`,
  ];

  if (data.estimatedDelivery) {
    lines.push(`📅 Очікувана доставка: ${escHtml(data.estimatedDelivery)}`);
  }

  await bot.sendMessage(data.telegramChatId, lines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "📍 Трекінг",
            url: `https://novaposhta.ua/tracking/?cargo_number=${data.trackingNumber}`,
          },
        ],
      ],
    },
  });
}

/** Order delivered */
export async function notifyClientOrderDelivered(data: {
  telegramChatId: number;
  orderNumber: string;
}) {
  const bot = safeGetBot();
  if (!bot) return;

  await bot.sendMessage(
    data.telegramChatId,
    `📬 Замовлення #${escHtml(data.orderNumber)} доставлено!\n\nДякуємо за покупку! Будемо раді вашому відгуку 🙌`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "⭐ Залишити відгук",
              url: `${SITE_URL}/review/${data.orderNumber}`,
            },
            {
              text: "♻️ Замовити ще",
              callback_data: `reorder:${data.orderNumber}`,
            },
          ],
        ],
      },
    },
  );
}

/** Product from waitlist is available */
export async function notifyClientProductAvailable(data: {
  telegramChatId: number;
  productName: string;
  productSlug: string;
  price: number;
  imageUrl?: string;
}) {
  const bot = safeGetBot();
  if (!bot) return;

  if (data.imageUrl && !data.imageUrl.includes("placeholder")) {
    await bot.sendPhoto(data.telegramChatId, data.imageUrl, {
      caption: `🔔 ${escHtml(data.productName)} знову в наявності!\n💰 ${fmtMoney(data.price)}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🛒 Купити",
              url: `${SITE_URL}/product/${data.productSlug}`,
            },
          ],
        ],
      },
    });
  } else {
    await bot.sendMessage(
      data.telegramChatId,
      `🔔 ${escHtml(data.productName)} знову в наявності!\n💰 ${fmtMoney(data.price)}`,
      {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "🛒 Купити",
                url: `${SITE_URL}/product/${data.productSlug}`,
              },
            ],
          ],
        },
      },
    );
  }
}

/** Abandoned cart reminder (after 2 hours) */
export async function notifyClientAbandonedCart(data: {
  telegramChatId: number;
  itemsCount: number;
  total: number;
}) {
  const bot = safeGetBot();
  if (!bot) return;

  await bot.sendMessage(
    data.telegramChatId,
    `🛒 У вас ${data.itemsCount} товарів в кошику на ${fmtMoney(data.total)}. Оформити?`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Оформити", url: `${SITE_URL}/checkout` },
            { text: "🛒 Переглянути", callback_data: "quick:cart" },
          ],
        ],
      },
    },
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ADMIN NOTIFICATIONS (бот → адмін)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Helper: send to all active admins */
async function sendToAdmins(
  text: string,
  options?: { reply_markup?: Record<string, unknown>; priority?: "critical" | "high" | "medium" | "info" },
): Promise<void> {
  const bot = safeGetBot();
  if (!bot) return;

  const supabase = createAdminClient();
  const { data: admins } = await supabase
    .from("admin_users")
    .select("telegram_id, admin_notification_settings(*)")
    .eq("is_active", true);

  if (!admins?.length) return;

  const priority = options?.priority || "info";

  for (const admin of admins) {
    // Check quiet hours for non-critical
    if (priority !== "critical") {
      const settings = admin.admin_notification_settings as Record<string, unknown> | null;
      if (settings && isQuietHours(settings)) continue;
    }

    try {
      await bot.sendMessage(admin.telegram_id as number, text, {
        parse_mode: "HTML",
        reply_markup: options?.reply_markup,
      });
    } catch (err) {
      console.error(`[Notify] Failed to send to admin ${admin.telegram_id}:`, err);
    }
  }
}

/** New order (large or all depending on settings) */
export async function notifyAdminNewOrder(data: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  itemsCount: number;
  isWholesale?: boolean;
  paymentMethod?: string;
  shippingMethod?: string;
}) {
  const b2bTag = data.isWholesale ? " 🏢 ОПТ" : "";

  const lines = [
    `🛒 <b>Нове замовлення #${escHtml(data.orderNumber)}</b>${b2bTag}`,
    ``,
    `👤 ${escHtml(data.customerName)}`,
    data.customerPhone ? `📱 ${escHtml(data.customerPhone)}` : null,
    `💰 <b>${fmtMoney(data.total)}</b> (${data.itemsCount} товарів)`,
    data.paymentMethod ? `💳 ${escHtml(data.paymentMethod)}` : null,
    data.shippingMethod ? `🚚 ${escHtml(data.shippingMethod)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, {
    priority: data.total >= 5000 ? "high" : "medium",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "✅ Підтвердити", callback_data: `confirm_order:${data.orderId}` },
          { text: "👁 Деталі", callback_data: `order_detail:${data.orderId}` },
        ],
      ],
    },
  });
}

/** Order status changed (by Nova Poshta tracking) */
export async function notifyAdminOrderStatusChanged(data: {
  orderNumber: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  ttn?: string;
  npStatus?: string;
  customerName: string;
}) {
  const emoji: Record<string, string> = {
    new: "🆕", processing: "⚙️", shipped: "🚚", delivered: "✅", cancelled: "❌",
  };
  const e = emoji[data.newStatus] || "📋";

  const lines = [
    `${e} <b>Статус #${escHtml(data.orderNumber)}</b>`,
    ``,
    `🔄 ${escHtml(data.oldStatus)} → <b>${escHtml(data.newStatus)}</b>`,
    data.ttn ? `📦 ТТН: <code>${escHtml(data.ttn)}</code>` : null,
    data.npStatus ? `📍 ${escHtml(data.npStatus)}` : null,
    `👤 ${escHtml(data.customerName)}`,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, { priority: "info" });
}

/** Stock critical — product almost out */
export async function notifyAdminStockCritical(data: {
  productName: string;
  sku?: string;
  currentStock: number;
  dailyRate?: number;
  daysLeft?: number;
}) {
  const lines = [
    `⚠️ <b>Критичний залишок!</b>`,
    ``,
    `📦 ${escHtml(data.productName)}`,
    data.sku ? `🏷️ ${escHtml(data.sku)}` : null,
    `📊 Залишок: <b>${data.currentStock} шт</b>`,
    data.dailyRate ? `📈 Темп: ${data.dailyRate} шт/день` : null,
    data.daysLeft ? `⏱️ Вистачить на: ~${data.daysLeft} дні` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, { priority: "high" });
}

/** Product completely out of stock */
export async function notifyAdminOutOfStock(data: {
  productName: string;
  sku?: string;
}) {
  await sendToAdmins(
    `🔴 <b>ЗАКІНЧИВСЯ!</b>\n\n📦 ${escHtml(data.productName)}${data.sku ? ` (${escHtml(data.sku)})` : ""}\nЗалишок: 0 шт`,
    { priority: "critical" },
  );
}

/** Client requests a manager */
export async function notifyAdminClientNeedsManager(data: {
  clientName: string;
  clientId: string;
  message: string;
  channel: "telegram" | "site";
  lastOrderNumber?: string;
}) {
  const lines = [
    `💬 <b>Клієнт потребує менеджера</b>`,
    ``,
    `👤 ${escHtml(data.clientName)}`,
    `📱 ${data.channel === "telegram" ? "Telegram" : "Сайт"}`,
    ``,
    `"${escHtml(data.message.slice(0, 200))}"`,
    data.lastOrderNumber ? `\n📋 Останнє замовлення: #${escHtml(data.lastOrderNumber)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, {
    priority: "medium",
    reply_markup: {
      inline_keyboard: [
        [
          { text: "💬 Відповісти", callback_data: `reply_client:${data.clientId}` },
        ],
      ],
    },
  });
}

/** New customer registered */
export async function notifyAdminNewCustomer(data: {
  name: string;
  phone?: string;
  company?: string;
}) {
  const lines = [
    `👤 <b>Новий клієнт</b>`,
    ``,
    `📱 ${escHtml(data.phone || "Не вказано")}`,
    `👤 ${escHtml(data.name)}`,
    data.company ? `🏢 ${escHtml(data.company)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, { priority: "info" });
}

/** Client linked Telegram */
export async function notifyAdminTelegramLinked(data: {
  name: string;
  phone: string;
  telegramUsername?: string;
}) {
  await sendToAdmins(
    [
      `🤖 <b>Клієнт підключив Telegram</b>`,
      ``,
      `👤 ${escHtml(data.name)}`,
      `📱 ${escHtml(data.phone)}`,
      data.telegramUsername ? `💬 @${escHtml(data.telegramUsername)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    { priority: "info" },
  );
}

/** Payment received */
export async function notifyAdminPaymentReceived(data: {
  orderNumber: string;
  orderId: string;
  amount: number;
  method: string;
  customerName: string;
}) {
  await sendToAdmins(
    [
      `💳 <b>Оплата отримана</b>`,
      ``,
      `📦 Замовлення #${escHtml(data.orderNumber)}`,
      `💰 <b>${fmtMoney(data.amount)}</b>`,
      `💳 ${escHtml(data.method)}`,
      `👤 ${escHtml(data.customerName)}`,
      ``,
      `<a href="${ADMIN_URL}/orders/${data.orderId}">Деталі →</a>`,
    ].join("\n"),
    { priority: "info" },
  );
}

/** System error */
export async function notifyAdminSystemError(data: {
  title: string;
  error: string;
  context?: string;
}) {
  const lines = [
    `🚨 <b>${escHtml(data.title)}</b>`,
    ``,
    `❌ ${escHtml(data.error)}`,
    data.context ? `📍 ${escHtml(data.context)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await sendToAdmins(lines, { priority: "critical" });
}

/** Daily report */
export async function notifyAdminDailyReport(data: {
  date: string;
  ordersCount: number;
  totalRevenue: number;
  newCustomers: number;
  topProducts: { name: string; qty: number }[];
  avgCheck?: number;
}) {
  const lines = [
    `📊 <b>Звіт за ${escHtml(data.date)}</b>`,
    ``,
    `🛒 Замовлень: <b>${data.ordersCount}</b>`,
    `💰 Виручка: <b>${fmtMoney(data.totalRevenue)}</b>`,
    `👤 Нових клієнтів: <b>${data.newCustomers}</b>`,
    data.avgCheck ? `🧾 Середній чек: <b>${fmtMoney(data.avgCheck)}</b>` : null,
  ]
    .filter(Boolean);

  if (data.topProducts.length > 0) {
    lines.push(``);
    lines.push(`🏆 <b>Топ товари:</b>`);
    data.topProducts.slice(0, 5).forEach((p, i) => {
      lines.push(`  ${i + 1}. ${escHtml(p.name)} × ${p.qty}`);
    });
  }

  lines.push(``);
  lines.push(`<a href="${ADMIN_URL}">Адмінка →</a>`);

  await sendToAdmins(lines.join("\n"), { priority: "info" });
}

/** Low stock report */
export async function notifyAdminLowStock(
  products: { name: string; stock: number; sku?: string }[],
) {
  if (products.length === 0) return;

  const lines = [
    `📦 <b>Мало на складі (${products.length} товарів)</b>`,
    ``,
  ];

  products.slice(0, 10).forEach((p) => {
    lines.push(
      `• ${escHtml(p.name)}${p.sku ? ` (${escHtml(p.sku)})` : ""} — <b>${p.stock} шт</b>`,
    );
  });

  if (products.length > 10) {
    lines.push(`... та ще ${products.length - 10} товарів`);
  }

  await sendToAdmins(lines.join("\n"), { priority: "medium" });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function safeGetBot(): TelegramBot | null {
  try {
    return getBot();
  } catch {
    return null;
  }
}

function isQuietHours(settings: Record<string, unknown>): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  const startStr = String(settings.quiet_hours_start || "23:00");
  const endStr = String(settings.quiet_hours_end || "08:00");

  const [startH, startM] = startStr.split(":").map(Number);
  const [endH, endM] = endStr.split(":").map(Number);

  const start = startH * 60 + (startM || 0);
  const end = endH * 60 + (endM || 0);

  if (start > end) {
    // Overnight (e.g., 23:00 - 08:00)
    return currentTime >= start || currentTime < end;
  }
  return currentTime >= start && currentTime < end;
}
