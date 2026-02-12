/**
 * Claude Tool Definitions — 15 client-facing tools
 *
 * Used by both website chat widget and Telegram bot.
 * Tools give Claude access to: products, cart, orders, delivery, brands, recommendations.
 */

// Generic tool schema type (compatible with Anthropic SDK)
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const chatTools: ToolDefinition[] = [
  {
    name: "search_products",
    description:
      "Пошук товарів по назві, бренду, категорії, артикулу, ціні. Використовуй ЗАВЖДИ коли клієнт питає про товари.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Текст пошуку (назва, бренд, артикул, опис)",
        },
        brand: {
          type: "string",
          description:
            "Фільтр по бренду (DARK, Siller, LUNA, Staleks, etc)",
        },
        category_slug: {
          type: "string",
          description:
            "Slug категорії (gel-laky, bazy, topy, frezy, lampy, dekor, etc)",
        },
        min_price: { type: "number", description: "Мінімальна ціна в ₴" },
        max_price: { type: "number", description: "Максимальна ціна в ₴" },
        in_stock_only: {
          type: "boolean",
          description: "Тільки товари в наявності (default: true)",
        },
        sort_by: {
          type: "string",
          enum: ["price_asc", "price_desc", "popular", "newest"],
          description: "Сортування",
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
      "Повна інформація про конкретний товар — фото, ціни, опис, наявність.",
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
    name: "get_cart",
    description:
      "Вміст кошика клієнта — товари, кількість, сума. Використовуй коли клієнт питає про кошик.",
    input_schema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "add_to_cart",
    description:
      "Додати товар в кошик. Якщо товар вже є — збільшити кількість.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID товару" },
        quantity: { type: "number", description: "Кількість (default: 1)" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "remove_from_cart",
    description: "Видалити товар з кошика або змінити кількість.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID товару" },
        quantity: {
          type: "number",
          description: "Нова кількість. 0 = видалити повністю.",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_order_status",
    description:
      "Статус замовлення — по номеру або останнє замовлення клієнта. Показує ТТН та трекінг.",
    input_schema: {
      type: "object",
      properties: {
        order_number: {
          type: "string",
          description: "Номер замовлення (наприклад 4521)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_orders_history",
    description:
      "Історія замовлень клієнта. Для повторних замовлень, аналітики витрат.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Кількість замовлень (default: 5)",
        },
        period: {
          type: "string",
          enum: ["week", "month", "quarter", "year", "all"],
          description: "Період",
        },
      },
      required: [],
    },
  },
  {
    name: "calculate_delivery",
    description:
      "Розрахунок вартості доставки Новою Поштою в конкретне місто.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Місто доставки" },
        order_sum: {
          type: "number",
          description:
            "Сума замовлення (для перевірки безкоштовної доставки)",
        },
      },
      required: ["city"],
    },
  },
  {
    name: "get_categories",
    description: "Список категорій каталогу. Для навігації та підказок.",
    input_schema: {
      type: "object",
      properties: {
        parent_slug: {
          type: "string",
          description: "Slug батьківської категорії для підкатегорій",
        },
      },
      required: [],
    },
  },
  {
    name: "get_brands",
    description:
      "Список всіх брендів або детальна інформація про конкретний бренд.",
    input_schema: {
      type: "object",
      properties: {
        brand_name: {
          type: "string",
          description: "Назва бренду для детальної інформації",
        },
      },
      required: [],
    },
  },
  {
    name: "create_waitlist",
    description:
      "Підписати клієнта на повідомлення про наявність товару.",
    input_schema: {
      type: "object",
      properties: {
        product_id: { type: "string", description: "UUID товару" },
        notify_method: {
          type: "string",
          enum: ["email", "telegram", "sms"],
          description: "Спосіб сповіщення",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_wholesale_prices",
    description:
      "Оптові ціни для конкретних товарів. Тільки для B2B клієнтів.",
    input_schema: {
      type: "object",
      properties: {
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "Масив UUID товарів",
        },
        quantity: {
          type: "number",
          description: "Кількість для розрахунку суми",
        },
      },
      required: [],
    },
  },
  {
    name: "quick_order_by_sku",
    description:
      "Швидке замовлення по списку артикулів. Для B2B клієнтів що знають артикули.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              sku: { type: "string", description: "Артикул товару" },
              quantity: { type: "number", description: "Кількість" },
            },
            required: ["sku", "quantity"],
          },
          description: "Список артикулів та кількостей",
        },
      },
      required: ["items"],
    },
  },
  {
    name: "get_business_info",
    description:
      "Інформація про магазин: контакти, графік, доставка, оплата, повернення, умови опту.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "contacts",
            "schedule",
            "delivery",
            "payment",
            "returns",
            "wholesale_terms",
            "about",
          ],
          description: "Тема запиту",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "get_new_arrivals",
    description: "Нові надходження за період. Для відповіді на 'що нового'.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "За скільки днів (default: 7)",
        },
        category_slug: {
          type: "string",
          description: "Фільтр по категорії",
        },
        brand: { type: "string", description: "Фільтр по бренду" },
        limit: { type: "number", description: "Кількість (default: 6)" },
      },
      required: [],
    },
  },
];
