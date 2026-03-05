import type { Metadata } from "next";
import { Store, Truck, Users, Award, Heart, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Про нас",
  description:
    "STRONG NAIL BITS — інтернет-магазин професійної nail-косметики. Оптові ціни, доставка по Україні, більше 14 000 товарів від 80+ брендів.",
};

const VALUES = [
  {
    icon: Award,
    title: "Оригінальна продукція",
    desc: "Працюємо напряму з виробниками та офіційними дистриб'юторами. Кожен товар сертифікований.",
  },
  {
    icon: Truck,
    title: "Швидка доставка",
    desc: "Відправляємо замовлення щодня. Нова Пошта, УкрПошта, самовивіз з магазину в Одесі.",
  },
  {
    icon: Users,
    title: "Оптові ціни",
    desc: "Спеціальні ціни для майстрів та салонів від 1-ї одиниці. Додаткові знижки для постійних клієнтів.",
  },
  {
    icon: Heart,
    title: "Турбота про клієнтів",
    desc: "Допоможемо підібрати товар, проконсультуємо з використання та відповімо на будь-які питання.",
  },
  {
    icon: Store,
    title: "14 000+ товарів",
    desc: "Найширший асортимент nail-косметики в Україні: гель-лаки, бази, топи, інструменти, декор.",
  },
  {
    icon: Shield,
    title: "80+ брендів",
    desc: "Kodi, OXXI, NeoNail, Komilfo, GGA Professional, Couture Colour та десятки інших.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-coral to-[#ff6b81] px-6 py-12 text-white md:px-12 md:py-16">
        <h1 className="font-unbounded text-2xl font-black leading-tight md:text-4xl">
          Про STRONG NAIL BITS
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 md:text-base">
          Ми — команда ентузіастів nail-індустрії з Одеси. Наша мета — зробити
          професійну косметику доступною для кожного майстра в Україні. Працюємо
          з 2018 року та обслуговуємо тисячі клієнтів по всій країні.
        </p>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-8 right-8 h-32 w-32 rounded-full bg-white/5" />
      </div>

      {/* Values grid */}
      <div className="mt-12">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Чому обирають нас
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VALUES.map((v) => (
            <div
              key={v.title}
              className="rounded-2xl border border-[var(--border)] bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/10 text-coral">
                <v.icon size={20} />
              </div>
              <h3 className="mt-3 text-sm font-bold text-dark">{v.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--t2)]">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact block */}
      <div className="mt-12 rounded-2xl border border-[var(--border)] bg-sand/50 p-6 md:p-8">
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Наш магазин
        </h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <div className="flex flex-col gap-3 text-sm text-[var(--t2)]">
            <p>
              <strong className="text-dark">Адреса:</strong>
              <br />
              м. Одеса, Грецька площа 3/4, ТЦ &quot;Афіна&quot;, 4 поверх
            </p>
            <p>
              <strong className="text-dark">Телефон:</strong>
              <br />
              <a href="tel:+380937443889" className="text-coral hover:text-coral-2">
                +38 (093) 744-38-89
              </a>
            </p>
            <p>
              <strong className="text-dark">Email:</strong>
              <br />
              <a
                href="mailto:shine.shop.od@gmail.com"
                className="text-coral hover:text-coral-2"
              >
                shine.shop.od@gmail.com
              </a>
            </p>
            <p>
              <strong className="text-dark">Графік роботи:</strong>
              <br />
              Пн-Пт: 9:00 — 18:00
              <br />
              Сб: 10:00 — 15:00
              <br />
              Нд: вихідний
            </p>
          </div>
          <div className="flex items-center justify-center rounded-xl bg-[var(--border)] text-sm text-[var(--t3)]">
            <span>Карта скоро буде додана</span>
          </div>
        </div>
      </div>
    </div>
  );
}
