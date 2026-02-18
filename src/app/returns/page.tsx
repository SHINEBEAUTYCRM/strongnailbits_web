import type { Metadata } from "next";
import { RotateCcw, Clock, AlertCircle, CheckCircle, Phone, Mail, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "Повернення і обмін",
  description:
    "Умови повернення і обміну товарів в SHINE SHOP. 14 днів на повернення, безкоштовний обмін, гарантія на всі товари.",
};

const RETURN_RULES = [
  {
    icon: Clock,
    title: "14 днів на повернення",
    desc: "Ви можете повернути товар належної якості протягом 14 днів з моменту отримання. Товар має бути в оригінальній упаковці, не використаний.",
  },
  {
    icon: RotateCcw,
    title: "Обмін товару",
    desc: "Обміняємо товар на інший розмір, колір або артикул. Різницю в ціні перераховуємо або повертаємо.",
  },
  {
    icon: AlertCircle,
    title: "Товари, що не підлягають поверненню",
    desc: "Відкриті косметичні засоби, товари індивідуального використання (пилки, фрези, кисті — після використання), товари зі слідами використання.",
  },
  {
    icon: CheckCircle,
    title: "Гарантія якості",
    desc: "На все обладнання (лампи, фрезери, стерилізатори) діє гарантія виробника від 6 до 24 місяців. Гарантійний талон додається до товару.",
  },
];

const RETURN_STEPS = [
  {
    step: "1",
    title: "Зв'яжіться з нами",
    desc: "Напишіть в Telegram, Viber або зателефонуйте. Повідомте номер замовлення та причину повернення.",
  },
  {
    step: "2",
    title: "Відправте товар",
    desc: "Після підтвердження менеджером — відправте товар Новою Поштою на нашу адресу. Вкладіть копію чека або номер замовлення.",
  },
  {
    step: "3",
    title: "Отримайте кошти",
    desc: "Після отримання та перевірки товару повертаємо кошти протягом 3-5 робочих днів на вашу карту або гаманець Нової Пошти.",
  },
];

export default function ReturnsPage() {
  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
        Повернення і обмін
      </h1>
      <p className="mt-2 text-sm text-[var(--t2)]">
        Ми цінуємо кожного клієнта. Якщо товар не підійшов — повернемо гроші або обміняємо.
      </p>

      {/* Умови повернення */}
      <section className="mt-10">
        <h2 className="font-unbounded mb-6 text-lg font-bold text-dark">
          Умови повернення
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {RETURN_RULES.map((rule) => (
            <div
              key={rule.title}
              className="flex gap-4 rounded-2xl border border-[var(--border)] bg-white p-5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral/5">
                <rule.icon className="h-5 w-5 text-coral" />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-dark">{rule.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--t2)]">{rule.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Як повернути */}
      <section className="mt-12">
        <h2 className="font-unbounded mb-6 text-lg font-bold text-dark">
          Як повернути товар
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {RETURN_STEPS.map((s) => (
            <div
              key={s.step}
              className="rounded-2xl border border-[var(--border)] bg-white p-5 text-center"
            >
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-violet/10 font-unbounded text-base font-bold text-violet">
                {s.step}
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-dark">{s.title}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--t2)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Контакти для повернення */}
      <section className="mt-12 rounded-2xl bg-[#fafafa] p-6 sm:p-8">
        <h2 className="font-unbounded mb-4 text-lg font-bold text-dark">
          Контакти для повернення
        </h2>
        <div className="flex flex-col gap-3 text-sm text-[var(--t2)]">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-coral" />
            <a href="tel:+380937443889" className="hover:text-coral">+38 (093) 744-38-89</a>
          </div>
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-coral" />
            <a href="mailto:shine.shop.od@gmail.com" className="hover:text-coral">shine.shop.od@gmail.com</a>
          </div>
          <div className="flex items-center gap-3">
            <Truck className="h-4 w-4 text-coral" />
            <span>Адреса для повернення: м. Одеса, Грецька площа 3/4, ТЦ &quot;Афіна&quot;, 4 поверх</span>
          </div>
        </div>
      </section>
    </div>
  );
}
