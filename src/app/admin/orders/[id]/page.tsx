import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, User, MapPin, CreditCard, Package } from "lucide-react";
import { getOrderById } from "@/lib/admin/data";
import { OrderActions } from "./OrderActions";

function fmt(v: number) { return v.toLocaleString("uk-UA"); }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("uk-UA", {
    day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_MAP: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "Нове", color: "#60a5fa", bg: "#172554" },
  processing: { label: "В обробці", color: "#fbbf24", bg: "#422006" },
  shipped: { label: "Відправлено", color: "#a78bfa", bg: "#2e1065" },
  delivered: { label: "Доставлено", color: "#4ade80", bg: "#052e16" },
  cancelled: { label: "Скасовано", color: "#f87171", bg: "#450a0a" },
};

const SHIPPING_MAP: Record<string, string> = {
  np_warehouse: "Нова Пошта — Відділення",
  np_parcel: "Нова Пошта — Поштомат",
  np_address: "Нова Пошта — Адресна доставка",
  ukrposhta: "Укрпошта",
};

const PAYMENT_MAP: Record<string, string> = {
  card: "Оплата картою",
  cod: "Накладений платіж",
  invoice: "Рахунок-фактура",
};

interface OrderItem {
  product_id: string;
  name: string;
  sku: string | null;
  price: number;
  quantity: number;
  weight: number | null;
  total: number;
}

interface ShippingAddress {
  city?: string;
  warehouse?: string;
  street?: string;
  house?: string;
  recipient?: string;
  phone?: string;
  email?: string;
  country?: string;
  address?: string;
  companyName?: string;
  edrpou?: string;
}

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();

  const profile = order.profiles as { id: string; first_name: string; last_name: string; email: string; phone: string; company: string | null; type: string } | null;
  const items = (order.items as OrderItem[]) || [];
  const shipping = (order.shipping_address as ShippingAddress) || {};
  const st = STATUS_MAP[order.status] ?? { label: order.status, color: "#71717a", bg: "#18181b" };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/orders" className="p-2 rounded-lg" style={{ color: "var(--a-text-3)" }}><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>Замовлення #{order.order_number}</h1>
              <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ color: st.color, background: st.bg }}>{st.label}</span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>{fmtDate(order.created_at)}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold font-mono tabular-nums" style={{ color: "var(--a-text)" }}>{fmt(Number(order.total))} ₴</p>
          {(Number(order.discount) > 0 || Number(order.shipping_cost) > 0) && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-4)" }}>
              Товари: {fmt(Number(order.subtotal))} ₴
              {Number(order.shipping_cost) > 0 && ` + доставка ${fmt(Number(order.shipping_cost))} ₴`}
              {Number(order.discount) > 0 && ` − знижка ${fmt(Number(order.discount))} ₴`}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — order info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="rounded-xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid var(--a-border)" }}>
              <Package className="w-4 h-4" style={{ color: "var(--a-text-3)" }} />
              <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Товари ({items.length})</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                  <th className="text-left px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Товар</th>
                  <th className="text-right px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Ціна</th>
                  <th className="text-center px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Кіл.</th>
                  <th className="text-right px-5 py-2 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--a-text-6)" }}>Сума</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--a-bg-card)" }}>
                    <td className="px-5 py-3">
                      <p style={{ color: "var(--a-text-body)" }}>{item.name}</p>
                      {item.sku && <p className="text-[11px] font-mono mt-0.5" style={{ color: "var(--a-text-5)" }}>SKU: {item.sku}</p>}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums" style={{ color: "var(--a-text-2)" }}>{fmt(item.price)} ₴</td>
                    <td className="px-5 py-3 text-center font-mono tabular-nums" style={{ color: "var(--a-text-3)" }}>×{item.quantity}</td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums font-medium" style={{ color: "var(--a-text-body)" }}>{fmt(item.total)} ₴</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "1px solid var(--a-border)" }}>
                  <td colSpan={3} className="px-5 py-2 text-right text-xs" style={{ color: "var(--a-text-4)" }}>Підсумок:</td>
                  <td className="px-5 py-2 text-right font-mono tabular-nums font-semibold" style={{ color: "var(--a-text)" }}>{fmt(Number(order.subtotal))} ₴</td>
                </tr>
                {Number(order.shipping_cost) > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-1 text-right text-xs" style={{ color: "var(--a-text-4)" }}>Доставка:</td>
                    <td className="px-5 py-1 text-right font-mono tabular-nums text-xs" style={{ color: "var(--a-text-2)" }}>+{fmt(Number(order.shipping_cost))} ₴</td>
                  </tr>
                )}
                {Number(order.discount) > 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-1 text-right text-xs" style={{ color: "var(--a-text-4)" }}>Знижка:</td>
                    <td className="px-5 py-1 text-right font-mono tabular-nums text-xs" style={{ color: "#4ade80" }}>−{fmt(Number(order.discount))} ₴</td>
                  </tr>
                )}
                <tr style={{ borderTop: "1px solid var(--a-border)" }}>
                  <td colSpan={3} className="px-5 py-3 text-right text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Всього:</td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums text-lg font-bold" style={{ color: "var(--a-text)" }}>{fmt(Number(order.total))} ₴</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Client */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <User className="w-4 h-4" style={{ color: "var(--a-text-3)" }} />
              <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Клієнт</h3>
            </div>
            {profile ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow label="Ім'я" value={`${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "—"} />
                <InfoRow label="Email" value={profile.email || "—"} />
                <InfoRow label="Телефон" value={profile.phone || "—"} />
                <InfoRow label="Тип" value={profile.type === "wholesale" ? "Оптовий" : "Роздріб"} />
                {profile.company && <InfoRow label="Компанія" value={profile.company} />}
              </div>
            ) : <p className="text-sm" style={{ color: "var(--a-text-5)" }}>Гостьове замовлення</p>}
          </div>

          {/* Shipping */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" style={{ color: "var(--a-text-3)" }} />
              <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Доставка</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Спосіб" value={SHIPPING_MAP[order.shipping_method] || order.shipping_method || "—"} />
              {shipping.city && <InfoRow label="Місто" value={shipping.city} />}
              {shipping.warehouse && <InfoRow label="Відділення" value={shipping.warehouse} />}
              {shipping.street && <InfoRow label="Вулиця" value={`${shipping.street}${shipping.house ? `, ${shipping.house}` : ""}`} />}
              {shipping.recipient && <InfoRow label="Отримувач" value={shipping.recipient} />}
              {shipping.phone && <InfoRow label="Телефон отримувача" value={shipping.phone} />}
              {order.ttn && <InfoRow label="ТТН" value={order.ttn} mono />}
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="w-4 h-4" style={{ color: "var(--a-text-3)" }} />
              <h3 className="text-sm font-medium" style={{ color: "var(--a-text-2)" }}>Оплата</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Спосіб" value={PAYMENT_MAP[order.payment_method] || order.payment_method || "—"} />
              <InfoRow label="Статус" value={order.payment_status === "paid" ? "Оплачено" : order.payment_status === "failed" ? "Помилка" : "Очікує"} />
              {shipping.companyName && <InfoRow label="Компанія" value={shipping.companyName} />}
              {shipping.edrpou && <InfoRow label="ЄДРПОУ" value={shipping.edrpou} mono />}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl p-5" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
              <h3 className="text-sm font-medium mb-2" style={{ color: "var(--a-text-2)" }}>Примітки</h3>
              <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--a-text-3)" }}>{order.notes}</p>
            </div>
          )}
        </div>

        {/* Right column — actions */}
        <div>
          <OrderActions
            orderId={order.id}
            currentStatus={order.status}
            currentPaymentStatus={order.payment_status}
            currentTtn={order.ttn || ""}
            currentNotes={order.notes || ""}
            currentShippingCost={String(order.shipping_cost || 0)}
            currentDiscount={String(order.discount || 0)}
          />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider mb-0.5" style={{ color: "var(--a-text-5)" }}>{label}</p>
      <p className={`text-sm ${mono ? "font-mono" : ""}`} style={{ color: "var(--a-text-body)" }}>{value}</p>
    </div>
  );
}
