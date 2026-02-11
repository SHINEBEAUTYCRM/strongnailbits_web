import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendFBServerPurchaseEvent } from "@/lib/analytics/fb-capi-server";
import { notifyNewOrder } from "@/lib/telegram/notify";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface OrderItem {
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  weight: number | null;
  total: number;
}

interface OrderBody {
  items: OrderItem[];
  contact: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    noCall: boolean;
  };
  shipping: {
    method: string;
    city: string;
    warehouse: string;
    street: string;
    house: string;
    country: string;
    address: string;
    postcode: string;
    intlPhone: string;
  };
  payment: {
    method: string;
    companyName: string;
    edrpou: string;
  };
  comment: string;
  totals: {
    subtotal: number;
    total: number;
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function generateOrderNumber(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SHINE-${rand}`;
}

function validateOrder(body: OrderBody): string | null {
  if (!body.items || body.items.length === 0) return "Кошик порожній";

  const { contact, shipping } = body;
  if (!contact.firstName?.trim()) return "Введіть ім'я";
  if (!contact.lastName?.trim()) return "Введіть прізвище";
  if (!contact.phone || contact.phone.replace(/\D/g, "").length < 10)
    return "Некоректний телефон";

  const m = shipping.method;
  if (!m) return "Оберіть спосіб доставки";

  if (m === "np_warehouse" || m === "np_parcel" || m === "ukrposhta") {
    if (!shipping.city?.trim()) return "Введіть місто";
    if (!shipping.warehouse?.trim()) return "Введіть відділення";
  }
  if (m === "np_address") {
    if (!shipping.city?.trim()) return "Введіть місто";
    if (!shipping.street?.trim()) return "Введіть вулицю";
  }
  if (m === "np_intl") {
    if (!shipping.country) return "Оберіть країну";
    if (!shipping.address?.trim()) return "Введіть адресу доставки";
  }
  if (m === "ukrposhta_intl") {
    if (!shipping.country) return "Оберіть країну";
    if (!shipping.address?.trim()) return "Введіть адресу доставки";
    if (!shipping.postcode?.trim()) return "Введіть поштовий індекс";
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  POST handler                                                       */
/* ------------------------------------------------------------------ */

export async function POST(req: NextRequest) {
  try {
    const body: OrderBody = await req.json();

    // Validate
    const validationError = validateOrder(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify product availability
    const productIds = body.items.map((i) => i.product_id);
    const { data: dbProducts } = await supabase
      .from("products")
      .select("id, quantity, price, name_uk")
      .in("id", productIds);

    if (!dbProducts || dbProducts.length === 0) {
      return NextResponse.json(
        { error: "Товари не знайдено" },
        { status: 400 },
      );
    }

    const productMap = new Map(dbProducts.map((p) => [p.id, p]));

    // Check availability
    for (const item of body.items) {
      const dbProduct = productMap.get(item.product_id);
      if (!dbProduct) {
        return NextResponse.json(
          { error: `Товар "${item.name}" не знайдено` },
          { status: 400 },
        );
      }
      if (dbProduct.quantity < item.quantity) {
        return NextResponse.json(
          {
            error: `Товар "${dbProduct.name_uk}" — залишок ${dbProduct.quantity} шт.`,
          },
          { status: 400 },
        );
      }
    }

    // Recalculate total server-side
    let subtotal = 0;
    const verifiedItems = body.items.map((item) => {
      const dbProduct = productMap.get(item.product_id)!;
      const itemTotal = Number(dbProduct.price) * item.quantity;
      subtotal += itemTotal;
      return {
        ...item,
        price: Number(dbProduct.price),
        total: itemTotal,
      };
    });

    // Generate order number
    const orderNumber = generateOrderNumber();

    // Calculate total weight
    const totalWeight = verifiedItems.reduce(
      (sum, i) => sum + (i.weight ?? 0) * i.quantity,
      0,
    );

    // Build shipping address
    const shippingAddress: Record<string, string> = {};
    const m = body.shipping.method;
    if (m === "np_warehouse" || m === "np_parcel" || m === "ukrposhta") {
      shippingAddress.city = body.shipping.city;
      shippingAddress.warehouse = body.shipping.warehouse;
    } else if (m === "np_address") {
      shippingAddress.city = body.shipping.city;
      shippingAddress.street = body.shipping.street;
      shippingAddress.house = body.shipping.house;
    } else if (m === "np_intl" || m === "ukrposhta_intl") {
      shippingAddress.country = body.shipping.country;
      shippingAddress.city = body.shipping.city;
      shippingAddress.address = body.shipping.address;
      if (body.shipping.postcode)
        shippingAddress.postcode = body.shipping.postcode;
      if (body.shipping.intlPhone)
        shippingAddress.phone = body.shipping.intlPhone;
    }

    // Insert order
    const { error: insertError } = await supabase.from("orders").insert({
      order_number: orderNumber,
      status: "new",
      payment_status: "pending",
      items: verifiedItems,
      subtotal,
      discount: 0,
      shipping_cost: 0,
      total: subtotal,
      payment_method: body.payment.method,
      shipping_method: body.shipping.method,
      shipping_address: {
        ...shippingAddress,
        recipient: `${body.contact.firstName} ${body.contact.lastName}`,
        phone: body.contact.phone,
        email: body.contact.email,
        noCall: body.contact.noCall,
        ...(body.payment.method === "invoice"
          ? {
              companyName: body.payment.companyName,
              edrpou: body.payment.edrpou,
            }
          : {}),
      },
      notes: body.comment || null,
    });

    if (insertError) {
      console.error("Order insert error:", insertError);
      return NextResponse.json(
        { error: "Помилка збереження замовлення" },
        { status: 500 },
      );
    }

    // Send Telegram notification (non-blocking)
    notifyNewOrder({
      orderId: orderNumber,
      orderNumber,
      customerName: `${body.contact.firstName} ${body.contact.lastName}`,
      customerPhone: body.contact.phone,
      totalAmount: subtotal,
      itemCount: verifiedItems.length,
      paymentMethod: body.payment.method,
      deliveryMethod: body.shipping.method,
      comment: body.comment || undefined,
    });

    // Send FB Conversions API event (server-side, non-blocking)
    sendFBServerPurchaseEvent({
      orderNumber,
      total: subtotal,
      items: verifiedItems.map((i) => ({
        id: i.product_id,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
      })),
      email: body.contact.email,
      phone: body.contact.phone,
      firstName: body.contact.firstName,
      lastName: body.contact.lastName,
      clientIP:
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    // Decrease product quantities
    for (const item of verifiedItems) {
      const dbProduct = productMap.get(item.product_id)!;
      const newQty = Math.max(0, dbProduct.quantity - item.quantity);
      await supabase
        .from("products")
        .update({ quantity: newQty })
        .eq("id", item.product_id);
    }

    return NextResponse.json({
      orderNumber,
      total: subtotal,
      weight: totalWeight,
    });
  } catch (err) {
    console.error("Order error:", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
