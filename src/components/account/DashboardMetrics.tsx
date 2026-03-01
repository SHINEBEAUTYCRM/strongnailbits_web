"use client";

import { useEffect, useState, useRef } from "react";

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  color?: string;
  delay?: number;
}

function AnimatedCounter({ label, value, suffix = "", color, delay = 0 }: MetricCardProps) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (hasAnimated.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          observer.disconnect();

          setTimeout(() => {
            const startTime = Date.now();
            const duration = 1200;

            function animate() {
              const elapsed = Date.now() - startTime;
              const t = Math.min(elapsed / duration, 1);
              const eased = 1 - Math.pow(1 - t, 3);
              setDisplay(Math.round(eased * value));
              if (t < 1) requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);
          }, delay);
        }
      },
      { threshold: 0.3 },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, delay]);

  const formatted = suffix === "₴"
    ? display.toLocaleString("uk-UA")
    : display.toString();

  return (
    <div ref={ref} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--t3)]">
        {label}
      </p>
      <p className="font-price mt-1 text-xl font-bold" style={{ color }}>
        {formatted}
        {suffix && <span className="ml-1 text-sm font-medium">{suffix}</span>}
      </p>
    </div>
  );
}

interface DashboardMetricsProps {
  ordersCount: number;
  totalSpent: number;
  bonusPoints: number;
  balance: number;
  discountPercent: number;
  creditLimit: number;
}

export function DashboardMetrics({
  ordersCount,
  totalSpent,
  bonusPoints,
  balance,
  discountPercent,
  creditLimit,
}: DashboardMetricsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      <AnimatedCounter
        label="Замовлень"
        value={ordersCount}
        color="var(--violet)"
        delay={0}
      />
      <AnimatedCounter
        label="Загальна сума"
        value={totalSpent}
        suffix="₴"
        color="var(--t)"
        delay={100}
      />
      <AnimatedCounter
        label="Бонуси"
        value={bonusPoints}
        color="var(--coral)"
        delay={200}
      />
      <AnimatedCounter
        label="Баланс"
        value={balance}
        suffix="₴"
        color={balance >= 0 ? "var(--green)" : "var(--red)"}
        delay={300}
      />
      {discountPercent > 0 && (
        <AnimatedCounter
          label="Знижка"
          value={discountPercent}
          suffix="%"
          color="var(--coral)"
          delay={400}
        />
      )}
      {creditLimit > 0 && (
        <AnimatedCounter
          label="Кредит ліміт"
          value={creditLimit}
          suffix="₴"
          color="var(--t)"
          delay={500}
        />
      )}
    </div>
  );
}
