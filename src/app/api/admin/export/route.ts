import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function toCsv(rows: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map((c) => c.label).join(";");
  const lines = rows.map((row) =>
    columns.map((c) => {
      let val = row[c.key];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") val = JSON.stringify(val);
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(";")
  );
  return "\uFEFF" + [header, ...lines].join("\n");
}

export async function GET(request: NextRequest) {
  const entity = request.nextUrl.searchParams.get("entity");
  const supabase = createAdminClient();

  if (entity === "orders") {
    const { data } = await supabase
      .from("orders")
      .select("order_number, status, payment_status, total, discount, shipping_cost, payment_method, shipping_method, ttn, notes, created_at, profiles(first_name, last_name, email, phone)")
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((o) => {
      const p = o.profiles as { first_name?: string; last_name?: string; email?: string; phone?: string } | null;
      return {
        order_number: o.order_number,
        date: new Date(o.created_at).toLocaleDateString("uk-UA"),
        client: [p?.first_name, p?.last_name].filter(Boolean).join(" ") || "",
        email: p?.email || "",
        phone: p?.phone || "",
        status: o.status,
        payment_status: o.payment_status,
        total: o.total,
        discount: o.discount,
        shipping_cost: o.shipping_cost,
        payment_method: o.payment_method || "",
        shipping_method: o.shipping_method || "",
        ttn: o.ttn || "",
        notes: o.notes || "",
      };
    });

    const csv = toCsv(rows, [
      { key: "order_number", label: "Номер" },
      { key: "date", label: "Дата" },
      { key: "client", label: "Клієнт" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Телефон" },
      { key: "status", label: "Статус" },
      { key: "payment_status", label: "Оплата" },
      { key: "total", label: "Сума" },
      { key: "discount", label: "Знижка" },
      { key: "shipping_cost", label: "Доставка" },
      { key: "payment_method", label: "Спосіб оплати" },
      { key: "shipping_method", label: "Спосіб доставки" },
      { key: "ttn", label: "ТТН" },
      { key: "notes", label: "Примітки" },
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="orders_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (entity === "products") {
    const { data } = await supabase
      .from("products")
      .select("name_uk, sku, price, old_price, wholesale_price, quantity, status, slug, categories(name_uk), brands(name)")
      .order("name_uk", { ascending: true });

    const rows = (data ?? []).map((p) => ({
      name: p.name_uk,
      sku: p.sku || "",
      category: (p.categories as { name_uk?: string } | null)?.name_uk || "",
      brand: (p.brands as { name?: string } | null)?.name || "",
      price: p.price,
      old_price: p.old_price || "",
      wholesale_price: p.wholesale_price || "",
      quantity: p.quantity,
      status: p.status,
      slug: p.slug,
    }));

    const csv = toCsv(rows, [
      { key: "name", label: "Назва" },
      { key: "sku", label: "SKU" },
      { key: "category", label: "Категорія" },
      { key: "brand", label: "Бренд" },
      { key: "price", label: "Ціна" },
      { key: "old_price", label: "Стара ціна" },
      { key: "wholesale_price", label: "Оптова ціна" },
      { key: "quantity", label: "Залишок" },
      { key: "status", label: "Статус" },
      { key: "slug", label: "Slug" },
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="products_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  if (entity === "clients") {
    const { data } = await supabase
      .from("profiles")
      .select("email, phone, first_name, last_name, company, type, discount_percent, total_orders, total_spent, created_at")
      .order("created_at", { ascending: false });

    const rows = (data ?? []).map((c) => ({
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "",
      email: c.email,
      phone: c.phone || "",
      company: c.company || "",
      type: c.type,
      discount: c.discount_percent,
      orders: c.total_orders,
      spent: c.total_spent,
      date: new Date(c.created_at).toLocaleDateString("uk-UA"),
    }));

    const csv = toCsv(rows, [
      { key: "name", label: "Ім'я" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Телефон" },
      { key: "company", label: "Компанія" },
      { key: "type", label: "Тип" },
      { key: "discount", label: "Знижка %" },
      { key: "orders", label: "Замовлень" },
      { key: "spent", label: "Витрачено" },
      { key: "date", label: "Дата реєстрації" },
    ]);

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="clients_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "entity must be: orders, products, clients" }, { status: 400 });
}
