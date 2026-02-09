"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Truck, CreditCard, Shield, RotateCcw, Banknote } from "lucide-react";

type Tab = "description" | "properties" | "delivery";

interface ProductInfoProps {
  name: string;
  sku: string | null;
  brand: { name: string; slug: string } | null;
  properties: Record<string, string>;
  description: string | null;
}

const TABS: { id: Tab; label: string }[] = [
  { id: "description", label: "Опис" },
  { id: "properties", label: "Характеристики" },
  { id: "delivery", label: "Доставка та оплата" },
];

export function ProductInfo({
  name,
  sku,
  brand,
  properties,
  description,
}: ProductInfoProps) {
  const [activeTab, setActiveTab] = useState<Tab>(
    description ? "description" : "properties",
  );
  const [descExpanded, setDescExpanded] = useState(false);
  const propertyEntries = Object.entries(properties);
  const descLong = description && description.length > 500;

  return (
    <div className="flex flex-col gap-5">
      {/* Brand */}
      {brand && (
        <Link
          href={`/catalog?brands=${brand.slug}`}
          className="inline-flex w-fit text-[13px] font-medium text-[#007aff] hover:underline"
        >
          {brand.name}
        </Link>
      )}

      {/* Product name */}
      <h1 className="text-[20px] font-bold leading-tight text-[#222] sm:text-[24px]">
        {name}
      </h1>

      {/* SKU + meta */}
      {sku && (
        <p className="text-[13px] text-[#999]">
          Артикул: <span className="font-price text-[#666]">{sku}</span>
        </p>
      )}

      {/* ── Tabs ── */}
      <div className="border-b border-[#f0f0f0]">
        <div className="scrollbar-none flex gap-0 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 border-b-2 px-4 py-3 text-[13px] font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-[#222] text-[#222]"
                  : "border-transparent text-[#999] hover:text-[#666]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab: Опис ── */}
      {activeTab === "description" && (
        <div>
          {description ? (
            <>
              <div
                className={`prose prose-sm max-w-none text-[13px] leading-relaxed text-[#555] ${
                  !descExpanded && descLong ? "line-clamp-[12]" : ""
                }`}
                dangerouslySetInnerHTML={{ __html: description }}
              />
              {descLong && (
                <button
                  onClick={() => setDescExpanded(!descExpanded)}
                  className="mt-3 flex items-center gap-1 text-[13px] font-medium text-[#007aff] hover:underline"
                >
                  {descExpanded ? "Згорнути" : "Читати повністю"}
                  <ChevronDown
                    size={14}
                    className={`transition-transform ${descExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              )}
            </>
          ) : (
            <p className="text-[13px] text-[#999]">Опис товару відсутній</p>
          )}
        </div>
      )}

      {/* ── Tab: Характеристики ── */}
      {activeTab === "properties" && (
        <div>
          {propertyEntries.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-[#f0f0f0]">
              {propertyEntries.map(([key, value], i) => (
                <div
                  key={key}
                  className={`flex gap-4 px-4 py-3 text-[13px] ${
                    i % 2 === 0 ? "bg-[#fafafa]" : "bg-white"
                  }`}
                >
                  <span className="w-2/5 shrink-0 text-[#999]">{key}</span>
                  <span className="min-w-0 break-words font-medium text-[#222]">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-[#999]">
              Характеристики не вказані
            </p>
          )}
        </div>
      )}

      {/* ── Tab: Доставка та оплата ── */}
      {activeTab === "delivery" && (
        <div className="flex flex-col gap-6">
          {/* Delivery */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#222]">
              <Truck size={16} className="text-[#00c853]" />
              Доставка
            </h3>
            <div className="overflow-hidden rounded-xl border border-[#f0f0f0]">
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] bg-white px-4 py-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00c853]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Нова Пошта — відділення
                  </p>
                  <p className="text-[12px] text-[#999]">
                    1-3 робочих дні. Вартість за тарифами перевізника.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00c853]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Нова Пошта — кур&apos;єр
                  </p>
                  <p className="text-[12px] text-[#999]">
                    1-3 робочих дні. Доставка до дверей.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] bg-white px-4 py-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#007aff]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Укрпошта
                  </p>
                  <p className="text-[12px] text-[#999]">
                    3-7 робочих днів. Економний варіант.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-[#f0faf0] px-4 py-3">
                <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[#00c853]" />
                <div>
                  <p className="text-[13px] font-semibold text-[#00c853]">
                    Безкоштовна доставка
                  </p>
                  <p className="text-[12px] text-[#666]">
                    При замовленні від 3 000 ₴ — Нова Пошта безкоштовно.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#222]">
              <CreditCard size={16} className="text-[#007aff]" />
              Оплата
            </h3>
            <div className="overflow-hidden rounded-xl border border-[#f0f0f0]">
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] bg-white px-4 py-3">
                <Banknote size={16} className="mt-0.5 shrink-0 text-[#00c853]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Оплата при отриманні (накладений платіж)
                  </p>
                  <p className="text-[12px] text-[#999]">
                    Оплатіть замовлення при отриманні на пошті або кур&apos;єру.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] bg-[#fafafa] px-4 py-3">
                <CreditCard size={16} className="mt-0.5 shrink-0 text-[#007aff]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Онлайн оплата карткою
                  </p>
                  <p className="text-[12px] text-[#999]">
                    Visa, Mastercard, Apple Pay, Google Pay. Безпечно через платіжну систему.
                  </p>
                  {/* Payment icons */}
                  <div className="mt-2 flex gap-2">
                    {["Visa", "MC", "GPay", "APay"].map((label) => (
                      <span
                        key={label}
                        className="rounded-md border border-[#e0e0e0] bg-white px-2 py-0.5 text-[10px] font-bold text-[#666]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 bg-white px-4 py-3">
                <Banknote size={16} className="mt-0.5 shrink-0 text-[#ff9500]" />
                <div>
                  <p className="text-[13px] font-medium text-[#222]">
                    Безготівковий розрахунок (для юр. осіб)
                  </p>
                  <p className="text-[12px] text-[#999]">
                    Оплата за рахунком-фактурою з ПДВ для B2B клієнтів.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Guarantees */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-bold text-[#222]">
              <Shield size={16} className="text-[#00c853]" />
              Гарантії
            </h3>
            <div className="overflow-hidden rounded-xl border border-[#f0f0f0] bg-white">
              <div className="flex items-start gap-3 border-b border-[#f0f0f0] px-4 py-3">
                <Shield size={16} className="mt-0.5 shrink-0 text-[#00c853]" />
                <p className="text-[13px] text-[#444]">
                  Всі товари мають сертифікати та гарантії від виробника.
                  100% оригінальна продукція.
                </p>
              </div>
              <div className="flex items-start gap-3 px-4 py-3">
                <RotateCcw size={16} className="mt-0.5 shrink-0 text-[#007aff]" />
                <p className="text-[13px] text-[#444]">
                  Повернути товар можна протягом 14 днів після покупки
                  відповідно до Закону України «Про захист прав споживачів».
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
