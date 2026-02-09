import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["new", "processing", "shipped", "delivered", "cancelled"];
const VALID_PAYMENT = ["pending", "paid", "failed"];

/* ─── PUT — update order (status, TTN, payment_status, notes) ─── */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const supabase = createAdminClient();

    if (!body.id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: `Invalid status. Valid: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
      }
      update.status = body.status;
    }

    if (body.payment_status !== undefined) {
      if (!VALID_PAYMENT.includes(body.payment_status)) {
        return NextResponse.json({ error: `Invalid payment_status. Valid: ${VALID_PAYMENT.join(", ")}` }, { status: 400 });
      }
      update.payment_status = body.payment_status;
    }

    if (body.ttn !== undefined) update.ttn = body.ttn || null;
    if (body.notes !== undefined) update.notes = body.notes || null;
    if (body.shipping_cost !== undefined) update.shipping_cost = Number(body.shipping_cost) || 0;
    if (body.discount !== undefined) update.discount = Number(body.discount) || 0;

    // Recalculate total if shipping_cost or discount changed
    if (body.shipping_cost !== undefined || body.discount !== undefined) {
      const { data: order } = await supabase.from("orders").select("subtotal, shipping_cost, discount").eq("id", body.id).single();
      if (order) {
        const sub = Number(order.subtotal);
        const ship = body.shipping_cost !== undefined ? Number(body.shipping_cost) : Number(order.shipping_cost);
        const disc = body.discount !== undefined ? Number(body.discount) : Number(order.discount);
        update.total = sub + ship - disc;
      }
    }

    const { error } = await supabase.from("orders").update(update).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
