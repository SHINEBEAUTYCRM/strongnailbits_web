import Link from "next/link";
import { CheckCircle } from "lucide-react";

interface SuccessPageProps {
  searchParams: Promise<{ order?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: SuccessPageProps) {
  const { order } = await searchParams;

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-6 py-20 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green/10">
        <CheckCircle size={40} className="text-green" />
      </div>

      <h1 className="font-unbounded mt-6 text-2xl font-black text-dark">
        Замовлення оформлено!
      </h1>

      {order && (
        <p className="mt-2 text-sm text-[var(--t2)]">
          Номер замовлення: <span className="font-price font-bold text-dark">{order}</span>
        </p>
      )}

      <p className="mt-4 text-sm leading-relaxed text-[var(--t2)]">
        Дякуємо за замовлення! Ми зв&apos;яжемося з вами найближчим часом для підтвердження.
      </p>

      <div className="mt-8 flex gap-3">
        <Link
          href="/catalog"
          className="font-unbounded rounded-pill bg-coral px-6 py-3 text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
        >
          Продовжити покупки
        </Link>
        <Link
          href="/"
          className="rounded-pill border border-[var(--border)] px-6 py-3 text-[13px] font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
        >
          На головну
        </Link>
      </div>
    </div>
  );
}
