/**
 * StrongNailBits Telegram Notifications
 *
 * All notification types with beautiful formatted messages.
 * Each function is fire-and-forget (non-blocking, errors logged silently).
 *
 * Two categories:
 * 1. Admin notifications — sent to configured admin chat_id (sendMessage)
 * 2. Client notifications — sent to individual client telegram_chat_id (bot.sendMessage)
 */

import { sendMessage, escHtml, isTelegramConfigured, getBot, TelegramBot } from "./bot";
import { fmtMoney } from "./formatters";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://strongnailbitsb2b.com";
const ADMIN_URL = `${SITE_URL}/admin`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🛒 ЗАМОВЛЕННЯ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface OrderNotifyData {
  orderId: string;
  orderNumber?: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  itemCount: number;
  paymentMethod?: string;
  deliveryMethod?: string;
  comment?: string;
}

/** New order notification */
export async function notifyNewOrder(data: OrderNotifyData) {
  if (!(await isTelegramConfigured())) return;

  const lines = [
    `🛒 <b>Нове замовлення${data.orderNumber ? ` #${escHtml(data.orderNumber)}` : ""}</b>`,
    ``,
    `👤 ${escHtml(data.customerName)}`,
    `📱 ${escHtml(data.customerPhone)}`,
    `💰 <b>${data.totalAmount.toLocaleString("uk-UA")} ₴</b> (${data.itemCount} товарів)`,
  ];

  if (data.paymentMethod) {
    lines.push(`💳 ${escHtml(data.paymentMethod)}`);
  }
  if (data.deliveryMethod) {
    lines.push(`🚚 ${escHtml(data.deliveryMethod)}`);
  }
  if (data.comment) {
    lines.push(`💬 ${escHtml(data.comment)}`);
  }

  lines.push(``);
  lines.push(`<a href="${ADMIN_URL}/orders/${data.orderId}">Відкрити в адмінці →</a>`);

  await sendMessage(lines.join("\n"));
}

/** Order status changed */
export async function notifyOrderStatusChange(data: {
  orderNumber: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  customerName: string;
}) {
  if (!(await isTelegramConfigured())) return;

  const statusEmoji: Record<string, string> = {
    pending: "⏳",
    processing: "⚙️",
    shipped: "📦",
    delivered: "✅",
    cancelled: "❌",
    returned: "↩️",
  };

  const emoji = statusEmoji[data.newStatus] || "📋";

  await sendMessage(
    [
      `${emoji} <b>Статус замовлення #${escHtml(data.orderNumber)}</b>`,
      ``,
      `${escHtml(data.oldStatus)} → <b>${escHtml(data.newStatus)}</b>`,
      `👤 ${escHtml(data.customerName)}`,
      ``,
      `<a href="${ADMIN_URL}/orders/${data.orderId}">Деталі →</a>`,
    ].join("\n"),
  );
}

/** Order status changed by Nova Poshta tracking */
export async function notifyOrderStatusChanged(data: {
  orderNumber: string;
  oldStatus: string;
  newStatus: string;
  ttn: string;
  npStatus: string;
  customerName: string;
}) {
  if (!(await isTelegramConfigured())) return;

  const statusEmoji: Record<string, string> = {
    new: "🆕",
    processing: "⚙️",
    shipped: "🚚",
    delivered: "✅",
    cancelled: "❌",
  };

  const emoji = statusEmoji[data.newStatus] || "📋";

  await sendMessage(
    [
      `${emoji} <b>НП оновлення: #${escHtml(data.orderNumber)}</b>`,
      ``,
      `📦 ТТН: <code>${escHtml(data.ttn)}</code>`,
      `🔄 ${escHtml(data.oldStatus)} → <b>${escHtml(data.newStatus)}</b>`,
      `📍 ${escHtml(data.npStatus)}`,
      `👤 ${escHtml(data.customerName)}`,
    ].join("\n"),
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  👤 КЛІЄНТИ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** New customer registration */
export async function notifyNewCustomer(data: {
  name: string;
  phone: string;
  company?: string;
  linkedTo1C?: boolean;
}) {
  if (!(await isTelegramConfigured())) return;

  const lines = [
    `👤 <b>Новий клієнт зареєструвався</b>`,
    ``,
    `📱 ${escHtml(data.phone)}`,
    `👤 ${escHtml(data.name)}`,
  ];

  if (data.company) {
    lines.push(`🏢 ${escHtml(data.company)}`);
  }

  if (data.linkedTo1C) {
    lines.push(`🔗 Автоматично прив'язано до 1С`);
  }

  lines.push(``);
  lines.push(`<a href="${ADMIN_URL}/clients">Клієнти →</a>`);

  await sendMessage(lines.join("\n"));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  ⚠️ ПОМИЛКИ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** SMS send error */
export async function notifySmsError(data: {
  phone: string;
  error: string;
  provider: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `⚠️ <b>Помилка відправки SMS</b>`,
      ``,
      `📱 ${escHtml(data.phone)}`,
      `🔌 ${escHtml(data.provider)}`,
      `❌ ${escHtml(data.error)}`,
    ].join("\n"),
  );
}

/** 1C sync error */
export async function notify1CError(data: {
  endpoint: string;
  error: string;
  method?: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `🔴 <b>Помилка синхронізації 1С</b>`,
      ``,
      `📡 ${data.method || "API"} ${escHtml(data.endpoint)}`,
      `❌ ${escHtml(data.error)}`,
      ``,
      `<a href="${ADMIN_URL}/1c">Монітор 1С →</a>`,
    ].join("\n"),
  );
}

/** General system error */
export async function notifySystemError(data: {
  title: string;
  error: string;
  context?: string;
}) {
  if (!(await isTelegramConfigured())) return;

  const lines = [
    `🚨 <b>${escHtml(data.title)}</b>`,
    ``,
    `❌ ${escHtml(data.error)}`,
  ];

  if (data.context) {
    lines.push(`📍 ${escHtml(data.context)}`);
  }

  await sendMessage(lines.join("\n"));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  💰 ОПЛАТА
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Payment received */
export async function notifyPaymentReceived(data: {
  orderNumber: string;
  orderId: string;
  amount: number;
  method: string;
  customerName: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `💳 <b>Оплата отримана</b>`,
      ``,
      `📦 Замовлення #${escHtml(data.orderNumber)}`,
      `💰 <b>${data.amount.toLocaleString("uk-UA")} ₴</b>`,
      `💳 ${escHtml(data.method)}`,
      `👤 ${escHtml(data.customerName)}`,
      ``,
      `<a href="${ADMIN_URL}/orders/${data.orderId}">Деталі →</a>`,
    ].join("\n"),
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  📊 ЗВІТИ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface DailyReportData {
  date: string;
  ordersCount: number;
  totalRevenue: number;
  newCustomers: number;
  topProducts: { name: string; qty: number }[];
  smsBalance?: number;
}

/** Daily evening report */
export async function notifyDailyReport(data: DailyReportData) {
  if (!(await isTelegramConfigured())) return;

  const lines = [
    `📊 <b>Звіт за ${escHtml(data.date)}</b>`,
    ``,
    `🛒 Замовлень: <b>${data.ordersCount}</b>`,
    `💰 Виручка: <b>${data.totalRevenue.toLocaleString("uk-UA")} ₴</b>`,
    `👤 Нових клієнтів: <b>${data.newCustomers}</b>`,
  ];

  if (data.topProducts.length > 0) {
    lines.push(``);
    lines.push(`🏆 <b>Топ товари:</b>`);
    data.topProducts.slice(0, 5).forEach((p, i) => {
      lines.push(`  ${i + 1}. ${escHtml(p.name)} × ${p.qty}`);
    });
  }

  if (data.smsBalance !== undefined && data.smsBalance !== null) {
    lines.push(``);
    lines.push(`📱 SMS баланс: ${data.smsBalance.toFixed(2)} грн`);
    if (data.smsBalance < 50) {
      lines.push(`⚠️ <b>Баланс SMS низький! Поповніть AlphaSMS</b>`);
    }
  }

  lines.push(``);
  lines.push(`<a href="${ADMIN_URL}">Адмінка →</a>`);

  await sendMessage(lines.join("\n"));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🎯 ВОРОНКИ
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Funnel conversion (contact reached last stage) */
export async function notifyFunnelConversion(data: {
  funnelName: string;
  contactName: string;
  contactPhone?: string;
  stageName: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `🎯 <b>Конверсія у воронці!</b>`,
      ``,
      `📊 ${escHtml(data.funnelName)}`,
      `👤 ${escHtml(data.contactName)}${data.contactPhone ? ` (${escHtml(data.contactPhone)})` : ""}`,
      `✅ Досяг етапу: <b>${escHtml(data.stageName)}</b>`,
      ``,
      `<a href="${ADMIN_URL}/funnels">SmartЛійки →</a>`,
    ].join("\n"),
  );
}

/** Funnel stage movement (non-conversion) */
export async function notifyFunnelStageMove(data: {
  funnelName: string;
  contactName: string;
  contactPhone?: string;
  fromStage: string;
  toStage: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `📊 <b>Рух у воронці</b>`,
      ``,
      `🔄 ${escHtml(data.funnelName)}`,
      `👤 ${escHtml(data.contactName)}${data.contactPhone ? ` (${escHtml(data.contactPhone)})` : ""}`,
      `${escHtml(data.fromStage)} → <b>${escHtml(data.toStage)}</b>`,
    ].join("\n"),
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  🤖 TELEGRAM BOT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Client linked Telegram */
export async function notifyTelegramLinked(data: {
  name: string;
  phone: string;
  telegramUsername?: string;
}) {
  if (!(await isTelegramConfigured())) return;

  await sendMessage(
    [
      `🤖 <b>Клієнт підключив Telegram</b>`,
      ``,
      `👤 ${escHtml(data.name)}`,
      `📱 ${escHtml(data.phone)}`,
      data.telegramUsername ? `💬 @${escHtml(data.telegramUsername)}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  📦 СКЛАД
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Low stock warning */
export async function notifyLowStock(products: { name: string; stock: number; sku?: string }[]) {
  if (!(await isTelegramConfigured())) return;
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

  lines.push(``);
  lines.push(`<a href="${ADMIN_URL}/inventory">Склад →</a>`);

  await sendMessage(lines.join("\n"));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  📱 CLIENT NOTIFICATIONS (бот → клієнт)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Safe get bot instance (non-throwing) */
async function safeGetBot(): Promise<TelegramBot | null> {
  try {
    return await getBot();
  } catch (err) {
    console.error("[Telegram:Notify] Bot init failed:", err);
    return null;
  }
}

/** Order confirmed → client */
export async function notifyClientOrderConfirmed(data: {
  telegramChatId: number;
  orderNumber: string;
  total: number;
}) {
  const bot = await safeGetBot();
  if (!bot) return;

  await bot.sendMessage(
    data.telegramChatId,
    `✅ Замовлення #${escHtml(data.orderNumber)} підтверджено!\n💰 ${fmtMoney(data.total)}\nОчікуйте відправку протягом доби.`,
  );
}

/** Order shipped with TTN → client */
export async function notifyClientOrderShipped(data: {
  telegramChatId: number;
  orderNumber: string;
  trackingNumber: string;
  estimatedDelivery?: string;
}) {
  const bot = await safeGetBot();
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

/** Order delivered → client */
export async function notifyClientOrderDelivered(data: {
  telegramChatId: number;
  orderNumber: string;
}) {
  const bot = await safeGetBot();
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

/** Product available from waitlist → client */
export async function notifyClientProductAvailable(data: {
  telegramChatId: number;
  productName: string;
  productSlug: string;
  price: number;
  imageUrl?: string;
}) {
  const bot = await safeGetBot();
  if (!bot) return;

  const text = `🔔 ${escHtml(data.productName)} знову в наявності!\n💰 ${fmtMoney(data.price)}`;
  const keyboard = {
    inline_keyboard: [
      [{ text: "🛒 Купити", url: `${SITE_URL}/product/${data.productSlug}` }],
    ],
  };

  if (data.imageUrl && !data.imageUrl.includes("placeholder")) {
    await bot.sendPhoto(data.telegramChatId, data.imageUrl, {
      caption: text,
      reply_markup: keyboard,
    });
  } else {
    await bot.sendMessage(data.telegramChatId, text, { reply_markup: keyboard });
  }
}

/** Abandoned cart reminder → client */
export async function notifyClientAbandonedCart(data: {
  telegramChatId: number;
  itemsCount: number;
  total: number;
}) {
  const bot = await safeGetBot();
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
