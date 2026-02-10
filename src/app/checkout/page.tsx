"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Truck,
  CreditCard,
  MessageSquare,
  ChevronLeft,
  AlertCircle,
  MapPin,
  Building2,
  Globe,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { TrackCheckout } from "@/components/analytics/TrackCheckout";
import { trackPurchase } from "@/lib/analytics/tracker";

interface FormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  noCall: boolean;
  shippingMethod: string;
  city: string;
  warehouse: string;
  street: string;
  house: string;
  country: string;
  intlCity: string;
  intlAddress: string;
  intlPhone: string;
  intlPostcode: string;
  paymentMethod: string;
  companyName: string;
  edrpou: string;
  comment: string;
}

interface FormErrors {
  [key: string]: string;
}

const INITIAL_FORM: FormData = {
  firstName: "",
  lastName: "",
  phone: "+380",
  email: "",
  noCall: false,
  shippingMethod: "np_warehouse",
  city: "",
  warehouse: "",
  street: "",
  house: "",
  country: "",
  intlCity: "",
  intlAddress: "",
  intlPhone: "+",
  intlPostcode: "",
  paymentMethod: "cod",
  companyName: "",
  edrpou: "",
  comment: "",
};

const SHIPPING_METHODS = [
  { id: "np_warehouse", label: "Нова Пошта — відділення", icon: Truck },
  { id: "np_parcel", label: "Нова Пошта — поштомат", icon: MapPin },
  { id: "np_address", label: "Нова Пошта — адресна доставка", icon: Truck },
  { id: "ukrposhta", label: "УкрПошта", icon: Truck },
  { id: "pickup", label: "Самовивіз (Одеса)", icon: Building2 },
  { id: "np_intl", label: "Нова Пошта Інтернешнл", icon: Globe },
  { id: "ukrposhta_intl", label: "УкрПошта — міжнародна", icon: Globe },
] as const;

const COUNTRIES = [
  "Польща", "Німеччина", "Чехія", "Італія", "Іспанія", "Румунія",
  "Молдова", "Грузія", "Литва", "Латвія", "Естонія", "Великобританія",
  "США", "Канада", "Ізраїль", "Туреччина", "Франція", "Нідерланди",
  "Португалія", "Болгарія", "Інша країна",
];

interface PaymentMethodDef {
  id: string;
  label: string;
  domestic?: boolean;
  soon?: boolean;
}

const PAYMENT_METHODS: PaymentMethodDef[] = [
  { id: "cod", label: "Оплата при отриманні (накладений платіж)", domestic: true },
  { id: "liqpay", label: "Оплата онлайн (LiqPay)", soon: true },
  { id: "mono", label: "Оплата онлайн (Mono)", soon: true },
  { id: "invoice", label: "Безготівковий розрахунок (для юр. осіб)" },
];

function isInternationalMethod(m: string) {
  return m === "np_intl" || m === "ukrposhta_intl";
}

function formatPhone(value: string): string {
  const cleaned = value.replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+380")) return cleaned;
  const digits = cleaned.slice(4).replace(/\D/g, "");
  let formatted = "+380";
  if (digits.length > 0) formatted += " " + digits.slice(0, 2);
  if (digits.length > 2) formatted += " " + digits.slice(2, 5);
  if (digits.length > 5) formatted += " " + digits.slice(5, 7);
  if (digits.length > 7) formatted += " " + digits.slice(7, 9);
  return formatted;
}

function Section({
  icon: Icon,
  title,
  step,
  children,
}: {
  icon: React.ElementType;
  title: string;
  step: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="font-unbounded flex h-8 w-8 items-center justify-center rounded-full bg-coral text-xs font-bold text-white">
          {step}
        </div>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-coral" />
          <h2 className="font-unbounded text-sm font-bold text-dark">{title}</h2>
        </div>
      </div>
      {children}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = "text",
  required,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">
        {label}
        {required && <span className="ml-0.5 text-red">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`h-10 w-full rounded-[10px] border bg-white px-3 text-sm text-dark outline-none placeholder:text-[var(--t3)] transition-colors focus:border-coral/50 disabled:opacity-50 ${
          error ? "border-red/50" : "border-[var(--border)]"
        }`}
      />
      {error && (
        <p className="mt-1 flex items-center gap-1 text-[11px] text-red">
          <AlertCircle size={10} /> {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (mounted && items.length === 0) {
      router.replace("/catalog");
    }
  }, [mounted, items.length, router]);

  const isIntl = isInternationalMethod(form.shippingMethod);

  useEffect(() => {
    if (isIntl && form.paymentMethod === "cod") {
      setForm((f) => ({ ...f, paymentMethod: "invoice" }));
    }
  }, [isIntl, form.paymentMethod]);

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) {
      setErrors((e) => {
        const next = { ...e };
        delete next[key];
        return next;
      });
    }
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};
    if (!form.firstName.trim()) errs.firstName = "Введіть ім'я";
    if (!form.lastName.trim()) errs.lastName = "Введіть прізвище";

    if (isIntl) {
      if (!form.intlPhone || form.intlPhone.length < 5) errs.intlPhone = "Введіть телефон";
    } else {
      const phoneDigits = form.phone.replace(/\D/g, "");
      if (phoneDigits.length < 12) errs.phone = "Введіть коректний номер";
    }

    const m = form.shippingMethod;
    if (m === "np_warehouse" || m === "np_parcel") {
      if (!form.city.trim()) errs.city = "Введіть місто";
      if (!form.warehouse.trim()) errs.warehouse = "Введіть відділення";
    } else if (m === "np_address") {
      if (!form.city.trim()) errs.city = "Введіть місто";
      if (!form.street.trim()) errs.street = "Введіть вулицю";
      if (!form.house.trim()) errs.house = "Введіть будинок";
    } else if (m === "ukrposhta") {
      if (!form.city.trim()) errs.city = "Введіть місто";
      if (!form.warehouse.trim()) errs.warehouse = "Введіть відділення";
    } else if (m === "np_intl") {
      if (!form.country) errs.country = "Оберіть країну";
      if (!form.intlCity.trim()) errs.intlCity = "Введіть місто";
      if (!form.intlAddress.trim()) errs.intlAddress = "Введіть адресу";
    } else if (m === "ukrposhta_intl") {
      if (!form.country) errs.country = "Оберіть країну";
      if (!form.intlAddress.trim()) errs.intlAddress = "Введіть адресу";
      if (!form.intlPostcode.trim()) errs.intlPostcode = "Введіть індекс";
    }

    if (form.paymentMethod === "invoice") {
      if (!form.companyName.trim()) errs.companyName = "Введіть назву компанії";
      if (!form.edrpou.trim()) errs.edrpou = "Введіть ЄДРПОУ";
    }

    return errs;
  }

  const isValid = Object.keys(validate()).length === 0;

  async function handleSubmit() {
    const errs = validate();
    setErrors(errs);

    if (Object.keys(errs).length > 0) {
      const firstKey = Object.keys(errs)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            product_id: i.product_id,
            name: i.name,
            sku: i.sku,
            price: i.price,
            quantity: i.quantity,
            weight: i.weight,
            total: i.price * i.quantity,
          })),
          contact: {
            firstName: form.firstName,
            lastName: form.lastName,
            phone: isIntl ? form.intlPhone : form.phone,
            email: form.email,
            noCall: form.noCall,
          },
          shipping: {
            method: form.shippingMethod,
            city: form.city || form.intlCity,
            warehouse: form.warehouse,
            street: form.street,
            house: form.house,
            country: form.country,
            address: form.intlAddress,
            postcode: form.intlPostcode,
            intlPhone: form.intlPhone,
          },
          payment: {
            method: form.paymentMethod,
            companyName: form.companyName,
            edrpou: form.edrpou,
          },
          comment: form.comment,
          totals: { subtotal: getTotal(), total: getTotal() },
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Помилка оформлення");
      }

      const { orderNumber } = await res.json();

      // Track purchase event before clearing cart
      trackPurchase({
        transaction_id: orderNumber,
        value: getTotal(),
        currency: "UAH",
        items: items.map((i) => ({
          item_id: i.product_id,
          item_name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
      });

      clearCart();
      router.push(`/checkout/success?order=${orderNumber}`);
    } catch (err) {
      setErrors({
        _form: err instanceof Error ? err.message : "Помилка оформлення замовлення",
      });
      setSubmitting(false);
    }
  }

  if (!mounted || items.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-[var(--t2)]">Завантаження...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
      <TrackCheckout />
      <Link
        href="/catalog"
        className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--t2)] transition-colors hover:text-dark"
      >
        <ChevronLeft size={16} /> Продовжити покупки
      </Link>

      <h1 className="font-unbounded mb-8 text-2xl font-black text-dark sm:text-3xl">
        Оформлення замовлення
      </h1>

      {errors._form && (
        <div className="mb-6 rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          {errors._form}
        </div>
      )}

      <div ref={formRef} className="flex flex-col gap-8 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Contact */}
          <Section icon={User} title="Контактні дані" step={1}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div data-field="firstName">
                <Input label="Ім'я" required value={form.firstName} onChange={(v) => update("firstName", v)} error={errors.firstName} placeholder="Олена" />
              </div>
              <div data-field="lastName">
                <Input label="Прізвище" required value={form.lastName} onChange={(v) => update("lastName", v)} error={errors.lastName} placeholder="Іванова" />
              </div>
              <div data-field="phone">
                <Input
                  label="Телефон"
                  required
                  type="tel"
                  value={isIntl ? form.intlPhone : form.phone}
                  onChange={(v) => { if (isIntl) update("intlPhone", v); else update("phone", formatPhone(v)); }}
                  error={isIntl ? errors.intlPhone : errors.phone}
                  placeholder={isIntl ? "+48 ..." : "+380 XX XXX XX XX"}
                />
              </div>
              <Input label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} placeholder="email@example.com" />
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={form.noCall}
                onChange={(e) => update("noCall", e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer appearance-none rounded border border-[var(--border)] bg-white checked:border-coral checked:bg-coral"
              />
              <span className="text-xs text-[var(--t2)]">Не дзвонити, відправити SMS</span>
            </label>
          </Section>

          {/* Shipping */}
          <Section icon={Truck} title="Доставка" step={2}>
            <div className="flex flex-col gap-2">
              {SHIPPING_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <label
                    key={method.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-all ${
                      form.shippingMethod === method.id
                        ? "border-coral/40 bg-coral-light"
                        : "border-[var(--border)] bg-white hover:border-coral/20"
                    }`}
                  >
                    <input type="radio" name="shipping" value={method.id} checked={form.shippingMethod === method.id} onChange={() => update("shippingMethod", method.id)} className="sr-only" />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.shippingMethod === method.id ? "border-coral bg-coral" : "border-[var(--border)]"}`}>
                      {form.shippingMethod === method.id && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <Icon size={14} className={form.shippingMethod === method.id ? "text-coral" : "text-[var(--t3)]"} />
                    <span className="text-xs font-medium text-dark">{method.label}</span>
                  </label>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {(form.shippingMethod === "np_warehouse" || form.shippingMethod === "np_parcel" || form.shippingMethod === "ukrposhta") && (
                <>
                  <div data-field="city"><Input label="Місто" required value={form.city} onChange={(v) => update("city", v)} error={errors.city} placeholder="Київ" /></div>
                  <div data-field="warehouse"><Input label={form.shippingMethod === "np_parcel" ? "Поштомат" : "Відділення"} required value={form.warehouse} onChange={(v) => update("warehouse", v)} error={errors.warehouse} placeholder={form.shippingMethod === "np_parcel" ? "Поштомат №1234" : "Відділення №1"} /></div>
                </>
              )}
              {form.shippingMethod === "np_address" && (
                <>
                  <div data-field="city"><Input label="Місто" required value={form.city} onChange={(v) => update("city", v)} error={errors.city} placeholder="Київ" /></div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div data-field="street"><Input label="Вулиця" required value={form.street} onChange={(v) => update("street", v)} error={errors.street} placeholder="вул. Хрещатик" /></div>
                    <div data-field="house"><Input label="Будинок, квартира" required value={form.house} onChange={(v) => update("house", v)} error={errors.house} placeholder="1, кв. 2" /></div>
                  </div>
                </>
              )}
              {form.shippingMethod === "pickup" && (
                <div className="rounded-[10px] border border-[var(--border)] bg-sand p-4">
                  <p className="text-sm font-medium text-dark">м. Одеса, вул. Пантелеймонівська</p>
                  <p className="mt-1 text-xs text-[var(--t2)]">Пн-Пт: 10:00 — 18:00 | Сб: 10:00 — 15:00 | Нд: вихідний</p>
                </div>
              )}
              {form.shippingMethod === "np_intl" && (
                <>
                  <div data-field="country">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">Країна <span className="text-red">*</span></label>
                    <select value={form.country} onChange={(e) => update("country", e.target.value)} className={`h-10 w-full rounded-[10px] border bg-white px-3 text-sm text-dark outline-none focus:border-coral/50 ${errors.country ? "border-red/50" : "border-[var(--border)]"}`}>
                      <option value="">Оберіть країну</option>
                      {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    {errors.country && <p className="mt-1 flex items-center gap-1 text-[11px] text-red"><AlertCircle size={10} /> {errors.country}</p>}
                  </div>
                  <div data-field="intlCity"><Input label="Місто" required value={form.intlCity} onChange={(v) => update("intlCity", v)} error={errors.intlCity} placeholder="Warsaw" /></div>
                  <div data-field="intlAddress"><Input label="Адреса доставки" required value={form.intlAddress} onChange={(v) => update("intlAddress", v)} error={errors.intlAddress} placeholder="ul. Mokotowska 1/2" /></div>
                </>
              )}
              {form.shippingMethod === "ukrposhta_intl" && (
                <>
                  <div data-field="country">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">Країна <span className="text-red">*</span></label>
                    <select value={form.country} onChange={(e) => update("country", e.target.value)} className={`h-10 w-full rounded-[10px] border bg-white px-3 text-sm text-dark outline-none focus:border-coral/50 ${errors.country ? "border-red/50" : "border-[var(--border)]"}`}>
                      <option value="">Оберіть країну</option>
                      {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
                    </select>
                    {errors.country && <p className="mt-1 flex items-center gap-1 text-[11px] text-red"><AlertCircle size={10} /> {errors.country}</p>}
                  </div>
                  <div data-field="intlAddress">
                    <label className="mb-1.5 block text-xs font-medium text-[var(--t2)]">Повна адреса <span className="text-red">*</span></label>
                    <textarea value={form.intlAddress} onChange={(e) => update("intlAddress", e.target.value)} placeholder="Full delivery address..." rows={3} className={`w-full rounded-[10px] border bg-white px-3 py-2 text-sm text-dark outline-none placeholder:text-[var(--t3)] focus:border-coral/50 ${errors.intlAddress ? "border-red/50" : "border-[var(--border)]"}`} />
                    {errors.intlAddress && <p className="mt-1 flex items-center gap-1 text-[11px] text-red"><AlertCircle size={10} /> {errors.intlAddress}</p>}
                  </div>
                  <div data-field="intlPostcode"><Input label="Поштовий індекс" required value={form.intlPostcode} onChange={(v) => update("intlPostcode", v)} error={errors.intlPostcode} placeholder="00-001" /></div>
                </>
              )}
            </div>
          </Section>

          {/* Payment */}
          <Section icon={CreditCard} title="Оплата" step={3}>
            <div className="flex flex-col gap-2">
              {PAYMENT_METHODS.map((pm) => {
                if (pm.domestic && isIntl) return null;
                return (
                  <label
                    key={pm.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] border px-4 py-3 transition-all ${
                      pm.soon
                        ? "cursor-not-allowed opacity-50"
                        : form.paymentMethod === pm.id
                          ? "border-coral/40 bg-coral-light"
                          : "border-[var(--border)] bg-white hover:border-coral/20"
                    }`}
                  >
                    <input type="radio" name="payment" value={pm.id} checked={form.paymentMethod === pm.id} onChange={() => !pm.soon && update("paymentMethod", pm.id)} disabled={!!pm.soon} className="sr-only" />
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${form.paymentMethod === pm.id && !pm.soon ? "border-coral bg-coral" : "border-[var(--border)]"}`}>
                      {form.paymentMethod === pm.id && !pm.soon && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-xs font-medium text-dark">{pm.label}</span>
                    {pm.soon && <span className="ml-auto rounded-[6px] bg-sand px-2 py-0.5 text-[10px] font-medium text-[var(--t3)]">Скоро</span>}
                  </label>
                );
              })}
            </div>
            {form.paymentMethod === "invoice" && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div data-field="companyName"><Input label="Назва компанії" required value={form.companyName} onChange={(v) => update("companyName", v)} error={errors.companyName} placeholder="ТОВ «Назва»" /></div>
                <div data-field="edrpou"><Input label="ЄДРПОУ" required value={form.edrpou} onChange={(v) => update("edrpou", v)} error={errors.edrpou} placeholder="12345678" /></div>
              </div>
            )}
          </Section>

          {/* Comment */}
          <Section icon={MessageSquare} title="Коментар" step={4}>
            <textarea
              value={form.comment}
              onChange={(e) => update("comment", e.target.value)}
              placeholder="Коментар до замовлення (опціонально)"
              rows={3}
              className="w-full rounded-[10px] border border-[var(--border)] bg-white px-3 py-2.5 text-sm text-dark outline-none placeholder:text-[var(--t3)] focus:border-coral/50"
            />
          </Section>

          {/* Mobile submit */}
          <div className="lg:hidden">
            <OrderSummary isInternational={isIntl} onSubmit={handleSubmit} submitting={submitting} isValid={isValid} />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden w-[380px] shrink-0 lg:block">
          <div className="sticky top-[80px]">
            <OrderSummary isInternational={isIntl} onSubmit={handleSubmit} submitting={submitting} isValid={isValid} />
          </div>
        </div>
      </div>
    </div>
  );
}
