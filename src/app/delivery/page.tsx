import type { Metadata } from "next";
import {
  Truck,
  MapPin,
  CreditCard,
  Banknote,
  Clock,
  Gift,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Доставка та оплата",
  description:
    "Доставка Новою Поштою, УкрПоштою, самовивіз з магазину в Одесі. Оплата при отриманні, безготівковий розрахунок, передплата.",
};

const DELIVERY_METHODS = [
  {
    icon: Truck,
    title: "Нова Пошта",
    desc: "Доставка у відділення або адресна доставка кур'єром. Термін: 1-2 дні по Україні.",
    price: "За тарифами Нової Пошти",
  },
  {
    icon: Truck,
    title: "УкрПошта",
    desc: "Економічна доставка у відділення або поштомат. Термін: 3-5 днів.",
    price: "За тарифами УкрПошти",
  },
  {
    icon: MapPin,
    title: "Самовивіз",
    desc: "Забрати замовлення в нашому магазині: м. Одеса, Грецька площа 3/4, ТЦ \"Афіна\", 4 поверх.",
    price: "Безкоштовно",
  },
];

const PAYMENT_METHODS = [
  {
    icon: Banknote,
    title: "Накладений платіж",
    desc: "Оплата при отриманні у відділенні Нової Пошти. Комісія за тарифами перевізника.",
  },
  {
    icon: CreditCard,
    title: "Передплата на карту",
    desc: "Переказ на карту ПриватБанку. Реквізити надсилаємо після підтвердження замовлення.",
  },
  {
    icon: ShieldCheck,
    title: "Безготівковий розрахунок",
    desc: "Для юридичних осіб та ФОП. Виставляємо рахунок-фактуру з ПДВ.",
  },
];

export default function DeliveryPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
        Доставка та оплата
      </h1>
      <p className="mt-2 text-sm text-[var(--t2)]">
        Відправляємо замовлення щодня (Пн-Пт). Замовлення до 15:00 —
        відправка в той же день.
      </p>

      {/* Free shipping banner */}
      <div className="mt-6 flex items-center gap-3 rounded-2xl bg-green/5 border border-green/20 p-4">
        <Gift size={20} className="shrink-0 text-green" />
        <p className="text-sm font-medium text-green">
          Безкоштовна доставка Новою Поштою при замовленні від 2 000 ₴
        </p>
      </div>

      {/* Delivery methods */}
      <section className="mt-10">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Способи доставки
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {DELIVERY_METHODS.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-[var(--border)] bg-white p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <m.icon size={20} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-dark">{m.title}</h3>
              <p className="mt-1 text-sm text-[var(--t2)]">{m.desc}</p>
              <div className="mt-3 inline-block rounded-full bg-sand px-3 py-1 text-xs font-medium text-dark">
                {m.price}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Payment methods */}
      <section className="mt-10">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Способи оплати
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {PAYMENT_METHODS.map((m) => (
            <div
              key={m.title}
              className="rounded-2xl border border-[var(--border)] bg-white p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
                <m.icon size={20} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-dark">{m.title}</h3>
              <p className="mt-1 text-sm text-[var(--t2)]">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Timing */}
      <section className="mt-10">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="flex items-center gap-3">
              <Clock size={20} className="text-coral" />
              <h3 className="text-sm font-bold text-dark">Терміни обробки</h3>
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--t2)]">
              <li>Замовлення до 15:00 — відправка в той же день</li>
              <li>Замовлення після 15:00 — відправка наступного робочого дня</li>
              <li>
                Обробка замовлень: Пн-Пт 9:00-18:00, Сб 10:00-15:00
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-white p-5">
            <div className="flex items-center gap-3">
              <RotateCcw size={20} className="text-coral" />
              <h3 className="text-sm font-bold text-dark">
                Повернення та обмін
              </h3>
            </div>
            <ul className="mt-3 flex flex-col gap-2 text-sm text-[var(--t2)]">
              <li>Повернення протягом 14 днів з моменту отримання</li>
              <li>Товар повинен бути в оригінальній упаковці, не використаний</li>
              <li>
                Для оформлення повернення зв&apos;яжіться з нами за телефоном
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
