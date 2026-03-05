"use client";

// ================================================================
//  API Hub — Центр управління API та інтеграціями
//  Огляд всіх підсистем з поясненнями
// ================================================================

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Cable, BookOpen, Key, Webhook, Activity, RefreshCw, Plug,
  ArrowRight, CheckCircle2, AlertTriangle, Clock, Zap,
  Heart, Shield, FileText, Users, ShoppingBag, Package,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/* ─── Types ─── */
interface Section {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  href: string;
  icon: LucideIcon;
  color: string;
  features: string[];
}

interface QuickStat {
  label: string;
  value: string | number;
  color: string;
}

/* ─── Data ─── */
const SECTIONS: Section[] = [
  {
    id: "docs",
    title: "API Документація",
    description: "Інтерактивний довідник по всіх ендпоінтах",
    longDescription: "Тут описані всі 15 ендпоінтів API: що приймають, що повертають, приклади коду на cURL, JavaScript, Python та 1С. Є кнопка «Спробувати» — можна тестувати запити прямо з браузера.",
    href: "/admin/api-docs",
    icon: BookOpen,
    color: "purple",
    features: ["15 ендпоінтів з описом", "Приклади на 4 мовах", "Кнопка «Спробувати»", "Статус-коди та помилки"],
  },
  {
    id: "keys",
    title: "API Ключі",
    description: "Токени для 1С та зовнішніх систем",
    longDescription: "Кожен зовнішній сервіс (1С, бот, партнерський сайт) отримує свій унікальний Bearer-токен. Ви контролюєте: які дані він може читати/писати, скільки запитів на хвилину, з яких IP можна підключатись.",
    href: "/admin/api-keys",
    icon: Key,
    color: "amber",
    features: ["Створення токенів", "Права доступу (permissions)", "Rate limit на кожен токен", "IP Whitelist", "Лог всіх запитів"],
  },
  {
    id: "webhooks",
    title: "Вебхуки",
    description: "Автоматичні сповіщення при подіях",
    longDescription: "Коли на сайті відбувається подія (нове замовлення, оновлення товару, зміна статусу) — сайт відправляє POST-запит на вказаний URL. Підпис HMAC-SHA256 гарантує, що запит справжній. При помилці — до 3 повторних спроб.",
    href: "/admin/webhooks",
    icon: Webhook,
    color: "emerald",
    features: ["9 типів подій", "HMAC-SHA256 підпис", "Retry: 5с → 30с → 5хв", "Лог кожної доставки"],
  },
  {
    id: "1c",
    title: "Монітор 1С",
    description: "Статистика обміну даними з 1С",
    longDescription: "Дашборд реального часу: скільки запитів за 24 години та 7 днів, помилки, які сутності синхронізовані (товари, клієнти, замовлення, документи, бонуси, ціни). Коли була остання синхронізація.",
    href: "/admin/1c",
    icon: Activity,
    color: "blue",
    features: ["Запити за 24г / 7д", "Помилки та статуси", "Синхронізовані сутності", "Час останнього обміну"],
  },
  {
    id: "sync",
    title: "Синхронізація",
    description: "Ручна синхронізація даних з CS-Cart",
    longDescription: "Запуск ручної синхронізації товарів, категорій, брендів з CS-Cart API. Використовуйте, коли потрібно примусово оновити дані, не чекаючи автоматичного крону.",
    href: "/admin/sync",
    icon: RefreshCw,
    color: "cyan",
    features: ["Синхронізація товарів", "Синхронізація категорій", "Синхронізація брендів", "Статус кожної операції"],
  },
  {
    id: "integrations",
    title: "Інтеграції (47 сервісів)",
    description: "Підключення зовнішніх сервісів",
    longDescription: "Реєстр усіх 47 сервісів, які можна підключити до StrongNailBits OS: аналітика (GA4, Clarity, PostHog), реклама (Facebook, Google Ads), комунікації (TurboSMS, Telegram), платежі (Fondy, LiqPay), доставка (Нова Пошта) та інші.",
    href: "/admin/settings/integrations",
    icon: Plug,
    color: "rose",
    features: ["47 інтеграцій", "API-ключі для кожного", "Статус підключення", "Групування по категоріях"],
  },
];

const FLOW_STEPS = [
  { step: 1, title: "Створити токен", desc: "Перейдіть в API Ключі → Створити токен. Виберіть права та rate limit.", icon: Key },
  { step: 2, title: "Протестувати", desc: "Відкрийте Документацію → вставте токен → натисніть «Спробувати».", icon: Heart },
  { step: 3, title: "Інтегрувати", desc: "Скопіюйте приклад коду (cURL/JS/Python/1С) і використовуйте у своїй системі.", icon: Zap },
  { step: 4, title: "Моніторити", desc: "Слідкуйте за логами в API Ключі та статистикою в Моніторі 1С.", icon: Activity },
];

/* ─── Color helpers ─── */
function colorClasses(color: string) {
  const map: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    purple:  { bg: "bg-purple-500/5",  border: "border-purple-500/20",  text: "text-purple-400",  iconBg: "bg-purple-500/10" },
    amber:   { bg: "bg-amber-500/5",   border: "border-amber-500/20",   text: "text-amber-400",   iconBg: "bg-amber-500/10" },
    emerald: { bg: "bg-emerald-500/5", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/10" },
    blue:    { bg: "bg-blue-500/5",    border: "border-blue-500/20",    text: "text-blue-400",    iconBg: "bg-blue-500/10" },
    cyan:    { bg: "bg-cyan-500/5",    border: "border-cyan-500/20",    text: "text-cyan-400",    iconBg: "bg-cyan-500/10" },
    rose:    { bg: "bg-rose-500/5",    border: "border-rose-500/20",    text: "text-rose-400",    iconBg: "bg-rose-500/10" },
  };
  return map[color] || map.purple;
}

/* ─── Component ─── */

export default function ApiHubPage() {
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    // Fetch quick stats from 1c monitor
    fetch("/api/admin/1c-stats")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setStats([
            { label: "Запити (24г)", value: data.requests_24h ?? "—", color: "purple" },
            { label: "Помилки (24г)", value: data.errors_24h ?? 0, color: data.errors_24h > 0 ? "red" : "emerald" },
            { label: "Товарів синхр.", value: data.products_synced ?? "—", color: "blue" },
            { label: "Замовлень синхр.", value: data.orders_synced ?? "—", color: "amber" },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10">
            <Cable className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--a-text)" }}>API & Інтеграції</h1>
            <p className="text-sm" style={{ color: "var(--a-text-3)" }}>Центр управління зовнішніми підключеннями</p>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      {stats.length > 0 && (
        <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
              <p className="text-[10px] font-medium uppercase tracking-wide" style={{ color: "var(--a-text-4)" }}>{s.label}</p>
              <p className={`mt-1 text-2xl font-bold ${
                s.color === "red" ? "text-red-400" :
                s.color === "emerald" ? "text-emerald-400" :
                s.color === "blue" ? "text-blue-400" :
                s.color === "amber" ? "text-amber-400" :
                "text-purple-400"
              }`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* How it works */}
      <div className="mb-8 rounded-2xl p-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--a-text)" }}>Як підключити зовнішню систему за 4 кроки</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {FLOW_STEPS.map(step => (
            <div key={step.step} className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                <step.icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "var(--a-text)" }}>{step.step}. {step.title}</p>
                <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: "var(--a-text-3)" }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sections grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SECTIONS.map(section => {
          const c = colorClasses(section.color);
          const isExpanded = expanded === section.id;
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className={`group rounded-2xl border transition-all duration-200 ${c.border} ${c.bg} hover:border-opacity-50`}
            >
              <div className="p-5">
                {/* Card header */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${c.iconBg}`}>
                    <Icon className={`h-5 w-5 ${c.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold" style={{ color: "var(--a-text)" }}>{section.title}</h3>
                    <p className="text-xs mt-0.5" style={{ color: "var(--a-text-3)" }}>{section.description}</p>
                  </div>
                </div>

                {/* Expandable description */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : section.id)}
                  className="mb-3 text-[11px] transition-colors" style={{ color: "var(--a-text-4)" }}
                >
                  {isExpanded ? "Сховати деталі ▲" : "Детальніше ▼"}
                </button>

                {isExpanded && (
                  <p className="mb-3 text-xs leading-relaxed bg-black/20 rounded-lg p-3" style={{ color: "var(--a-text-2)" }}>
                    {section.longDescription}
                  </p>
                )}

                {/* Features */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {section.features.map(f => (
                    <span key={f} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${c.iconBg} ${c.text}`}>
                      <CheckCircle2 className="h-2.5 w-2.5" />
                      {f}
                    </span>
                  ))}
                </div>

                {/* Go button */}
                <Link
                  href={section.href}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${c.text} hover:bg-white/5`}
                >
                  Перейти <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture hint */}
      <div className="mt-8 rounded-2xl p-6" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--a-text)" }}>
          <Shield className="h-4 w-4 text-purple-400" />
          Архітектура безпеки
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[11px]" style={{ color: "var(--a-text-3)" }}>
          <div className="flex items-start gap-2">
            <Key className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: "var(--a-text)" }}>Bearer Token + SHA-256</p>
              <p className="mt-0.5">Кожен токен хешується. Оригінал показується тільки один раз при створенні.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Shield className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: "var(--a-text)" }}>Permissions + IP Whitelist</p>
              <p className="mt-0.5">Кожен токен бачить тільки те, що дозволено. Можна обмежити по IP.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Activity className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium" style={{ color: "var(--a-text)" }}>Rate Limit + Логування</p>
              <p className="mt-0.5">10–300 запитів/хв на токен. Кожен запит логується з IP та часом відповіді.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
