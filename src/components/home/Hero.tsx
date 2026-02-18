import Link from "next/link";

export function Hero() {
  return (
    <section className="relative overflow-hidden py-16 md:py-24 lg:py-32">
      {/* Decorative glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-32 h-[400px] w-[400px] rounded-full bg-coral opacity-[0.04] blur-[120px]" />
        <div className="absolute -right-24 top-20 h-[350px] w-[350px] rounded-full bg-violet opacity-[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1280px] px-6">
        <div className="max-w-2xl">
          {/* Label */}
          <span className="font-unbounded mb-4 inline-block text-[10px] font-extrabold uppercase tracking-[4px] text-coral">
            PROFESSIONAL NAIL SUPPLY
          </span>

          {/* Heading */}
          <h1 className="font-unbounded text-[clamp(32px,5.5vw,64px)] font-black leading-[1.05] text-dark">
            Все для nail-майстрів{" "}
            <span className="gradient-text">в одному місці</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-lg text-base leading-relaxed text-[var(--t2)] sm:text-lg">
            14 800+ товарів від 90+ офіційних брендів. Оптові ціни від 1-ї одиниці.
            Безкоштовна доставка від 3 000 ₴.
          </p>

          {/* Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/catalog"
              className="font-unbounded inline-flex h-12 items-center gap-2 rounded-pill bg-coral px-7 text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
            >
              Перейти до каталогу →
            </Link>
            <Link
              href="/wholesale"
              className="font-unbounded inline-flex h-12 items-center gap-2 rounded-pill border border-[var(--border)] px-7 text-[13px] font-bold text-dark transition-all hover:border-dark"
            >
              Стати оптовиком
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { num: "14 800+", label: "товарів" },
              { num: "90+", label: "брендів" },
              { num: "7 000+", label: "клієнтів" },
              { num: "8", label: "років" },
            ].map((stat) => (
              <div key={stat.label}>
                <span className="font-price text-[28px] font-bold text-dark">
                  {stat.num}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--t3)]">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
