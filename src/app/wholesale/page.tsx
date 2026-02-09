import type { Metadata } from "next";
import Link from "next/link";
import {
  Percent,
  Users,
  Truck,
  FileText,
  Phone,
  ChevronRight,
  BadgeCheck,
  Zap,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Оптовим клієнтам",
  description:
    "Оптові ціни на nail-косметику від 1 одиниці. Спеціальні умови для салонів, майстрів та дистриб'юторів.",
};

const BENEFITS = [
  {
    icon: Percent,
    title: "Оптові ціни від 1 шт",
    desc: "Спеціальні ціни без мінімального замовлення. Додаткові знижки залежно від обсягу.",
  },
  {
    icon: Zap,
    title: "Персональний менеджер",
    desc: "Закріплений менеджер допоможе з підбором товару та оформленням замовлення.",
  },
  {
    icon: Truck,
    title: "Безкоштовна доставка",
    desc: "Безкоштовна доставка Новою Поштою для замовлень від 2 000 ₴.",
  },
  {
    icon: FileText,
    title: "Документи для ФОП",
    desc: "Надаємо повний пакет документів: рахунок-фактура, видаткова накладна, сертифікати.",
  },
  {
    icon: BadgeCheck,
    title: "Оригінальна продукція",
    desc: "Працюємо напряму з виробниками. Гарантія оригінальності кожного товару.",
  },
  {
    icon: Users,
    title: "Програма лояльності",
    desc: "Накопичувальна система знижок: чим більше купуєте, тим вигідніше умови.",
  },
];

const DISCOUNT_TIERS = [
  { range: "від 5 000 ₴/міс", discount: "5%", bg: "bg-sand" },
  { range: "від 15 000 ₴/міс", discount: "8%", bg: "bg-coral/5" },
  { range: "від 30 000 ₴/міс", discount: "12%", bg: "bg-coral/10" },
  { range: "від 50 000 ₴/міс", discount: "15%", bg: "bg-coral/15" },
];

export default function WholesalePage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-dark to-[#2a2a2a] px-6 py-12 text-white md:px-12 md:py-16">
        <h1 className="font-unbounded text-2xl font-black leading-tight md:text-4xl">
          Оптовим клієнтам
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 md:text-base">
          Спеціальні умови для nail-майстрів, салонів краси та дистриб&apos;юторів.
          Оптові ціни від 1-ї одиниці. Більше 14 000 товарів від 80+ брендів.
        </p>
        <Link
          href="/register"
          className="mt-6 inline-flex items-center gap-2 rounded-pill bg-coral px-6 py-3 text-sm font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
        >
          Зареєструватись
          <ChevronRight size={16} />
        </Link>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full bg-coral/10" />
      </div>

      {/* Benefits */}
      <section className="mt-12">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Переваги співпраці
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-[var(--border)] bg-white p-5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <b.icon size={20} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-dark">{b.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--t2)]">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Discount tiers */}
      <section className="mt-12">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Накопичувальні знижки
        </h2>
        <p className="mt-2 text-sm text-[var(--t2)]">
          Знижка залежить від загальної суми покупок за місяць
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {DISCOUNT_TIERS.map((tier) => (
            <div
              key={tier.range}
              className={`rounded-2xl border border-[var(--border)] p-5 text-center ${tier.bg}`}
            >
              <div className="font-unbounded text-2xl font-black text-coral">
                {tier.discount}
              </div>
              <div className="mt-1 text-sm text-[var(--t2)]">{tier.range}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-12 rounded-2xl bg-sand/50 border border-[var(--border)] p-6 text-center md:p-10">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Готові співпрацювати?
        </h2>
        <p className="mt-2 text-sm text-[var(--t2)]">
          Зв&apos;яжіться з нами для обговорення індивідуальних умов
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/register"
            className="font-unbounded flex h-12 items-center gap-2 rounded-pill bg-coral px-8 text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
          >
            Зареєструватись
          </Link>
          <a
            href="tel:+380937443889"
            className="flex h-12 items-center gap-2 rounded-pill border border-[var(--border)] bg-white px-6 text-sm font-medium text-dark transition-colors hover:border-dark"
          >
            <Phone size={16} />
            +38 (093) 744-38-89
          </a>
        </div>
      </section>
    </div>
  );
}
