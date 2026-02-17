"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Trash2, ArrowLeft, Search, Eye } from "lucide-react";
import { createAdminBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Types ─── */

interface RuleData {
  sort?: string;
  has_discount?: boolean;
  is_new?: boolean;
  filter_mode?: "all" | "category" | "brand";
  category_id?: string;
  category_ids?: string[];
  root_category_id?: string;
  brand_id?: string;
  brand_ids?: string[];
}

interface RootCategory {
  id: string;
  name_uk: string;
  cs_cart_id: string;
  slug: string;
  product_count: number;
}

interface SubCategory {
  id: string;
  name_uk: string;
  cs_cart_id: string;
  parent_cs_cart_id: string;
  slug: string;
  product_count: number;
}

interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

interface CatalogData {
  rootCategories: RootCategory[];
  subCategories: SubCategory[];
  brands: Brand[];
}

interface ShowcaseData {
  id?: string;
  code: string;
  title_uk: string;
  title_ru: string;
  subtitle_uk: string;
  subtitle_ru: string;
  source_type: string;
  rule: RuleData | null;
  sku_list: string[] | null;
  product_limit: number;
  cta_text_uk: string;
  cta_text_ru: string;
  cta_url: string;
  sort_order: number;
  is_enabled: boolean;
}

const EMPTY: ShowcaseData = {
  code: "",
  title_uk: "",
  title_ru: "",
  subtitle_uk: "",
  subtitle_ru: "",
  source_type: "rule",
  rule: { sort: "popular", has_discount: false, is_new: false, filter_mode: "all" },
  sku_list: null,
  product_limit: 14,
  cta_text_uk: "",
  cta_text_ru: "",
  cta_url: "",
  sort_order: 0,
  is_enabled: true,
};

/* ─── Helpers ─── */

function parseRule(rule: unknown): RuleData {
  if (rule && typeof rule === "object") return rule as RuleData;
  return { sort: "popular", has_discount: false, is_new: false, filter_mode: "all" };
}

function skuListToText(list: string[] | null): string {
  if (!list || !Array.isArray(list)) return "";
  return list.join("\n");
}

function textToSkuList(text: string): string[] | null {
  const items = text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

const FILTER_TABS = [
  { key: "all" as const, label: "Всі товари" },
  { key: "category" as const, label: "За категорією" },
  { key: "brand" as const, label: "За брендом" },
];

/* ─── Component ─── */

export function ShowcaseForm({
  initial,
  catalogData = { rootCategories: [], subCategories: [], brands: [] },
}: {
  initial?: ShowcaseData;
  catalogData?: CatalogData;
}) {
  const router = useRouter();
  const isEdit = !!initial?.id;

  const [form, setForm] = useState<ShowcaseData>(() => {
    if (initial) {
      return {
        ...initial,
        rule: parseRule(initial.rule),
        title_ru: initial.title_ru ?? "",
        subtitle_uk: initial.subtitle_uk ?? "",
        subtitle_ru: initial.subtitle_ru ?? "",
        cta_text_uk: initial.cta_text_uk ?? "",
        cta_text_ru: initial.cta_text_ru ?? "",
        cta_url: initial.cta_url ?? "",
      };
    }
    return EMPTY;
  });

  const [skuText, setSkuText] = useState(() => skuListToText(initial?.sku_list ?? null));
  const [brandSearch, setBrandSearch] = useState("");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* Generic setter */
  const set = <K extends keyof ShowcaseData>(key: K, val: ShowcaseData[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  /* Rule field setter */
  const setRule = (key: keyof RuleData, val: unknown) =>
    setForm((f) => ({
      ...f,
      rule: { ...parseRule(f.rule), [key]: val },
    }));

  const currentRule = parseRule(form.rule);
  const filterMode = currentRule.filter_mode || "all";

  /* Category helpers */
  const selectedRootId = currentRule.root_category_id || "";
  const selectedRoot = catalogData.rootCategories.find((c) => c.id === selectedRootId);

  const visibleSubs = useMemo(() => {
    if (!selectedRoot) return [];
    return catalogData.subCategories.filter(
      (sc) => sc.parent_cs_cart_id === selectedRoot.cs_cart_id
    );
  }, [selectedRoot, catalogData.subCategories]);

  const selectedCategoryIds = currentRule.category_ids || [];

  const toggleCategoryId = (id: string) => {
    const next = selectedCategoryIds.includes(id)
      ? selectedCategoryIds.filter((x) => x !== id)
      : [...selectedCategoryIds, id];
    setRule("category_ids", next);
  };

  const selectAllSubs = () => {
    setRule("category_ids", visibleSubs.map((s) => s.id));
  };

  const deselectAllSubs = () => {
    setRule("category_ids", []);
  };

  /* Brand helpers */
  const selectedBrandIds = currentRule.brand_ids || [];

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return catalogData.brands;
    const q = brandSearch.toLowerCase();
    return catalogData.brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brandSearch, catalogData.brands]);

  const toggleBrandId = (id: string) => {
    const next = selectedBrandIds.includes(id)
      ? selectedBrandIds.filter((x) => x !== id)
      : [...selectedBrandIds, id];
    setRule("brand_ids", next);
  };

  /* Total product count for selected root */
  const rootSubTotal = useMemo(() => {
    return visibleSubs.reduce((sum, s) => sum + (s.product_count || 0), 0);
  }, [visibleSubs]);

  /* ─── Product Preview ─── */
  const [previewProducts, setPreviewProducts] = useState<
    { id: string; name_uk: string; price: number; main_image_url: string | null }[]
  >([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewTotal, setPreviewTotal] = useState(0);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadPreview = useCallback(async () => {
    if (form.source_type !== "rule") {
      setPreviewProducts([]);
      setPreviewTotal(0);
      return;
    }

    setPreviewLoading(true);
    try {
      const sb = createAdminBrowserClient();
      let query = sb
        .from("products")
        .select("id, name_uk, price, main_image_url", { count: "exact" })
        .eq("status", "active")
        .gt("quantity", 0);

      const rule = parseRule(form.rule);

      if (rule.filter_mode === "category" && selectedCategoryIds.length > 0) {
        const { data: parentCats } = await sb
          .from("categories")
          .select("cs_cart_id")
          .in("id", selectedCategoryIds);
        const parentCsCartIds = parentCats?.map((c: { cs_cart_id: string }) => c.cs_cart_id).filter(Boolean) || [];

        let childIds: string[] = [];
        if (parentCsCartIds.length > 0) {
          const { data: childCats } = await sb
            .from("categories")
            .select("id")
            .in("parent_cs_cart_id", parentCsCartIds)
            .eq("status", "active");
          childIds = childCats?.map((c: { id: string }) => c.id) || [];
        }
        const allCatIds = [...selectedCategoryIds, ...childIds];
        query = query.in("category_id", allCatIds);
      } else if (rule.filter_mode === "category" && selectedRoot) {
        const { data: childCats } = await sb
          .from("categories")
          .select("id")
          .eq("parent_cs_cart_id", selectedRoot.cs_cart_id)
          .eq("status", "active");
        const childIds = childCats?.map((c: { id: string }) => c.id) || [];
        if (childIds.length > 0) query = query.in("category_id", childIds);
      }

      if (rule.filter_mode === "brand" && selectedBrandIds.length > 0) {
        query = query.in("brand_id", selectedBrandIds);
      }

      if (rule.has_discount) query = query.gt("old_price", 0);
      if (rule.is_new) query = query.eq("is_new", true);

      query = query.order("quantity", { ascending: false }).limit(8);
      const { data, count } = await query;
      setPreviewProducts(data || []);
      setPreviewTotal(count ?? data?.length ?? 0);
    } catch {
      setPreviewProducts([]);
      setPreviewTotal(0);
    }
    setPreviewLoading(false);
  }, [form.source_type, form.rule, selectedCategoryIds, selectedBrandIds, selectedRoot]);

  useEffect(() => {
    if (previewTimer.current) clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(loadPreview, 600);
    return () => {
      if (previewTimer.current) clearTimeout(previewTimer.current);
    };
  }, [loadPreview]);

  /* ─── Save ─── */
  const handleSave = async () => {
    if (!form.code) {
      setError("Код обов'язковий");
      return;
    }
    if (!form.title_uk) {
      setError("Назва (UK) обов'язкова");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, unknown> = {
        ...form,
        sku_list: form.source_type === "manual" ? textToSkuList(skuText) : null,
        rule: form.source_type === "rule" ? form.rule : null,
      };

      if (isEdit) payload.id = initial?.id;

      const res = await fetch("/api/admin/homepage/showcases", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        setError(data.error || "Помилка збереження");
        setSaving(false);
        return;
      }

      if (!isEdit && data.showcase?.id) {
        router.push(`/admin/homepage/showcases/${data.showcase.id}`);
      } else {
        setSuccess("Збережено");
        setTimeout(() => setSuccess(""), 3000);
        router.refresh();
      }
    } catch (err) {
      console.error("[ShowcaseForm] Save failed:", err);
      setError("Network error");
    }
    setSaving(false);
  };

  /* ─── Delete ─── */
  const handleDelete = async () => {
    if (!confirm("Видалити вітрину? Цю дію не можна відмінити.")) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage/showcases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: initial?.id }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        router.push("/admin/homepage/showcases");
      } else {
        setError(data.error || "Помилка видалення");
      }
    } catch (err) {
      console.error("[ShowcaseForm] Delete failed:", err);
      setError("Network error");
    }
    setDeleting(false);
  };

  /* ─── Render ─── */
  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/homepage/showcases"
            className="p-2 rounded-lg"
            style={{ color: "var(--a-text-3)" }}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
              {isEdit ? "Редагувати вітрину" : "Нова вітрина"}
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isEdit && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ color: "var(--a-danger, #f87171)", background: "var(--a-danger-bg, #1c1017)", border: "1px solid var(--a-danger-border, #7f1d1d)" }}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}{" "}
              Видалити
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--a-accent-btn)" }}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{" "}
            Зберегти
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ color: "var(--a-danger, #f87171)", background: "var(--a-danger-bg, #450a0a)", border: "1px solid var(--a-danger-border, #7f1d1d)" }}
        >
          {error}
        </div>
      )}
      {success && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-sm"
          style={{ color: "var(--a-success, #4ade80)", background: "var(--a-success-bg, #052e16)", border: "1px solid var(--a-success-border, #166534)" }}
        >
          {success}
        </div>
      )}

      {/* Form grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Основне */}
          <Section title="Основне">
            <Field label="Код *" value={form.code} onChange={(v) => set("code", v)} placeholder="popular_products" />
            <Field label="Назва (UK) *" value={form.title_uk} onChange={(v) => set("title_uk", v)} />
            <Field label="Назва (RU)" value={form.title_ru} onChange={(v) => set("title_ru", v)} />
            <Field label="Підзаголовок (UK)" value={form.subtitle_uk} onChange={(v) => set("subtitle_uk", v)} />
            <Field label="Підзаголовок (RU)" value={form.subtitle_ru} onChange={(v) => set("subtitle_ru", v)} />
          </Section>

          {/* Наповнення */}
          <Section title="Наповнення">
            <Select
              label="Тип джерела"
              value={form.source_type}
              onChange={(v) => set("source_type", v)}
              options={[
                { v: "rule", l: "Правило (rule)" },
                { v: "manual", l: "Вручну (manual)" },
              ]}
            />

            {form.source_type === "rule" && (
              <div className="space-y-4 mt-3">
                <Select
                  label="Сортування"
                  value={currentRule.sort || "popular"}
                  onChange={(v) => setRule("sort", v)}
                  options={[
                    { v: "popular", l: "Популярні" },
                    { v: "newest", l: "Найновіші" },
                    { v: "discount", l: "Зі знижкою" },
                    { v: "featured", l: "Рекомендовані" },
                    { v: "random", l: "Випадкові" },
                  ]}
                />

                {/* ─── Filter mode tabs ─── */}
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: "var(--a-text-3)" }}>
                    Джерело товарів
                  </label>
                  <div
                    className="flex rounded-lg overflow-hidden"
                    style={{ border: "1px solid var(--a-border)" }}
                  >
                    {FILTER_TABS.map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setRule("filter_mode", tab.key)}
                        className="flex-1 px-3 py-2 text-xs font-medium transition-colors"
                        style={{
                          background: filterMode === tab.key ? "var(--a-accent-btn)" : "transparent",
                          color: filterMode === tab.key ? "#fff" : "var(--a-text-3)",
                        }}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ─── Category picker ─── */}
                {filterMode === "category" && (
                  <div className="space-y-3">
                    {/* Root category chips */}
                    <div>
                      <label className="block text-xs font-medium mb-2" style={{ color: "var(--a-text-3)" }}>
                        Розділ
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {catalogData.rootCategories.map((rc) => {
                          const isActive = selectedRootId === rc.id;
                          return (
                            <button
                              key={rc.id}
                              onClick={() => {
                                setRule("root_category_id", isActive ? "" : rc.id);
                                if (!isActive) setRule("category_ids", []);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                              style={{
                                background: isActive ? "var(--a-accent-btn)" : "transparent",
                                color: isActive ? "#fff" : "var(--a-text-2)",
                                border: isActive
                                  ? "1px solid var(--a-accent-btn)"
                                  : "1px solid var(--a-border)",
                              }}
                            >
                              {rc.name_uk}
                              <span className="ml-1 opacity-60">({rc.product_count})</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Subcategories */}
                    {selectedRoot && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>
                            Підкатегорії ({visibleSubs.length} шт, {rootSubTotal} товарів)
                          </label>
                          <div className="flex gap-2">
                            <button
                              onClick={selectAllSubs}
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{ color: "var(--a-accent-btn)", border: "1px solid var(--a-border)" }}
                            >
                              Всі
                            </button>
                            <button
                              onClick={deselectAllSubs}
                              className="text-[10px] px-2 py-0.5 rounded"
                              style={{ color: "var(--a-text-4)", border: "1px solid var(--a-border)" }}
                            >
                              Скинути
                            </button>
                          </div>
                        </div>
                        <div
                          className="rounded-lg p-3 max-h-60 overflow-y-auto space-y-1"
                          style={{ background: "var(--a-bg)", border: "1px solid var(--a-border)" }}
                        >
                          {visibleSubs.length === 0 ? (
                            <p className="text-xs py-2 text-center" style={{ color: "var(--a-text-5)" }}>
                              Немає підкатегорій з товарами
                            </p>
                          ) : (
                            visibleSubs.map((sc) => (
                              <label
                                key={sc.id}
                                className="flex items-center gap-2.5 py-1 px-1.5 rounded hover:opacity-80 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCategoryIds.includes(sc.id)}
                                  onChange={() => toggleCategoryId(sc.id)}
                                  className="w-3.5 h-3.5 rounded accent-purple-500 flex-shrink-0"
                                />
                                <span className="text-xs flex-1" style={{ color: "var(--a-text-2)" }}>
                                  {sc.name_uk}
                                </span>
                                <span className="text-[10px]" style={{ color: "var(--a-text-5)" }}>
                                  {sc.product_count}
                                </span>
                              </label>
                            ))
                          )}
                        </div>
                        {selectedCategoryIds.length > 0 && (
                          <p className="text-[11px] mt-1.5" style={{ color: "var(--a-accent-btn)" }}>
                            Обрано: {selectedCategoryIds.length} категорій
                          </p>
                        )}
                        {selectedCategoryIds.length === 0 && selectedRoot && (
                          <p className="text-[11px] mt-1.5" style={{ color: "var(--a-text-5)" }}>
                            Не обрано підкатегорій — буде взято весь розділ &quot;{selectedRoot.name_uk}&quot;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ─── Brand picker ─── */}
                {filterMode === "brand" && (
                  <div className="space-y-3">
                    {/* Search */}
                    <div className="relative">
                      <Search
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                        style={{ color: "var(--a-text-5)" }}
                      />
                      <input
                        type="text"
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        placeholder="Пошук бренду..."
                        className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none"
                        style={{
                          background: "var(--a-bg)",
                          border: "1px solid var(--a-border)",
                          color: "var(--a-text-body)",
                        }}
                      />
                    </div>

                    {/* Brand list */}
                    <div
                      className="rounded-lg p-3 max-h-72 overflow-y-auto space-y-0.5"
                      style={{ background: "var(--a-bg)", border: "1px solid var(--a-border)" }}
                    >
                      {filteredBrands.length === 0 ? (
                        <p className="text-xs py-2 text-center" style={{ color: "var(--a-text-5)" }}>
                          Бренди не знайдено
                        </p>
                      ) : (
                        filteredBrands.map((b) => {
                          const isChecked = selectedBrandIds.includes(b.id);
                          return (
                            <label
                              key={b.id}
                              className="flex items-center gap-2.5 py-1.5 px-1.5 rounded cursor-pointer transition-colors"
                              style={{
                                background: isChecked ? "var(--a-accent-btn)10" : "transparent",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleBrandId(b.id)}
                                className="w-3.5 h-3.5 rounded accent-purple-500 flex-shrink-0"
                              />
                              {b.logo_url && (
                                <img
                                  src={b.logo_url}
                                  alt=""
                                  className="w-5 h-5 object-contain rounded flex-shrink-0"
                                  style={{ background: "#fff" }}
                                />
                              )}
                              <span className="text-xs flex-1" style={{ color: "var(--a-text-2)" }}>
                                {b.name}
                              </span>
                            </label>
                          );
                        })
                      )}
                    </div>
                    {selectedBrandIds.length > 0 && (
                      <p className="text-[11px]" style={{ color: "var(--a-accent-btn)" }}>
                        Обрано: {selectedBrandIds.length} брендів
                      </p>
                    )}
                  </div>
                )}

                {/* Toggles */}
                <div className="flex gap-6">
                  <Toggle
                    label="Зі знижкою"
                    checked={currentRule.has_discount ?? false}
                    onChange={(v) => setRule("has_discount", v)}
                  />
                  <Toggle
                    label="Новинки"
                    checked={currentRule.is_new ?? false}
                    onChange={(v) => setRule("is_new", v)}
                  />
                </div>
              </div>
            )}

            {form.source_type === "manual" && (
              <div className="mt-3">
                <TextArea
                  label="SKU список (один на рядок)"
                  value={skuText}
                  onChange={setSkuText}
                  rows={6}
                />
              </div>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* CTA та ліміт */}
          <Section title="CTA та ліміт">
            <Field
              label="Ліміт товарів"
              value={String(form.product_limit)}
              onChange={(v) => set("product_limit", Number(v) || 0)}
              type="number"
            />
            <Field label="CTA текст (UK)" value={form.cta_text_uk} onChange={(v) => set("cta_text_uk", v)} placeholder="Дивитись все" />
            <Field label="CTA текст (RU)" value={form.cta_text_ru} onChange={(v) => set("cta_text_ru", v)} placeholder="Смотреть все" />
            <Field label="CTA URL" value={form.cta_url} onChange={(v) => set("cta_url", v)} placeholder="/catalog?sort=popular" />
          </Section>

          {/* Налаштування */}
          <Section title="Налаштування">
            <Field
              label="Порядок сортування"
              value={String(form.sort_order)}
              onChange={(v) => set("sort_order", Number(v) || 0)}
              type="number"
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--a-text-5)" }}>
              Менше число = вище в списку
            </p>
            <Toggle
              label="Увімкнено"
              checked={form.is_enabled}
              onChange={(v) => set("is_enabled", v)}
            />
          </Section>

          {/* Summary */}
          {form.source_type === "rule" && (
            <Section title="Підсумок фільтрів">
              <div className="text-xs space-y-1.5" style={{ color: "var(--a-text-3)" }}>
                <p>Сортування: <b>{currentRule.sort || "popular"}</b></p>
                <p>
                  Фільтр:{" "}
                  <b>
                    {filterMode === "all" && "Всі товари"}
                    {filterMode === "category" && (
                      selectedCategoryIds.length > 0
                        ? `${selectedCategoryIds.length} категорій`
                        : selectedRoot
                          ? `Розділ "${selectedRoot.name_uk}"`
                          : "Не обрано"
                    )}
                    {filterMode === "brand" && (
                      selectedBrandIds.length > 0
                        ? `${selectedBrandIds.length} брендів`
                        : "Не обрано"
                    )}
                  </b>
                </p>
                {filterMode === "category" && selectedCategoryIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedCategoryIds.map((cid) => {
                      const cat = catalogData.subCategories.find((s) => s.id === cid);
                      if (!cat) return null;
                      return (
                        <span
                          key={cid}
                          className="text-[10px] px-1.5 py-0.5 rounded"
                          style={{ background: "var(--a-accent-btn)15", color: "var(--a-accent-btn)" }}
                        >
                          {cat.name_uk} ({cat.product_count})
                        </span>
                      );
                    })}
                  </div>
                )}
                {currentRule.has_discount && <p>+ Зі знижкою</p>}
                {currentRule.is_new && <p>+ Новинки</p>}
                <p>Ліміт: <b>{form.product_limit}</b> товарів</p>
                <div
                  className="mt-2 pt-2 flex items-center justify-between"
                  style={{ borderTop: "1px solid var(--a-border)" }}
                >
                  <span>Знайдено товарів:</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: previewTotal > 0 ? "var(--a-accent-btn)15" : "#f59e0b20",
                      color: previewTotal > 0 ? "var(--a-accent-btn)" : "#f59e0b",
                    }}
                  >
                    {previewLoading ? "..." : previewTotal}
                  </span>
                </div>
                {!previewLoading && previewTotal === 0 && (
                  <div
                    className="mt-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
                    style={{ background: "#f59e0b15", color: "#f59e0b", border: "1px solid #f59e0b30" }}
                  >
                    ⚠️ За поточними фільтрами товарів не знайдено. Вітрина не відображатиметься на сайті.
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Product Preview */}
          {form.source_type === "rule" && (
            <Section title="Попередній перегляд">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
                  <span className="text-[11px]" style={{ color: "var(--a-text-4)" }}>
                    Перші {Math.min(8, form.product_limit)} товарів
                  </span>
                </div>
                {previewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--a-text-5)" }} />}
              </div>

              {!previewLoading && previewProducts.length === 0 ? (
                <p className="text-[11px] py-4 text-center" style={{ color: "var(--a-text-5)" }}>
                  Немає товарів для показу
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {previewProducts.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      className="rounded-lg overflow-hidden"
                      style={{ border: "1px solid var(--a-border)" }}
                    >
                      {p.main_image_url ? (
                        <img
                          src={p.main_image_url}
                          alt=""
                          className="w-full h-14 object-contain"
                          style={{ background: "#fff" }}
                        />
                      ) : (
                        <div className="w-full h-14 flex items-center justify-center" style={{ background: "var(--a-bg)" }}>
                          <span className="text-[10px]" style={{ color: "var(--a-text-5)" }}>—</span>
                        </div>
                      )}
                      <div className="px-1.5 py-1" style={{ background: "var(--a-bg)" }}>
                        <p className="text-[9px] truncate" style={{ color: "var(--a-text-3)" }}>
                          {p.name_uk}
                        </p>
                        <p className="text-[10px] font-medium" style={{ color: "var(--a-text)" }}>
                          {p.price} ₴
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Reusable parts ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
    >
      <h3 className="text-sm font-medium mb-4" style={{ color: "var(--a-text-2)" }}>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 4,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-y transition-colors"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      />
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--a-text-3)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-colors cursor-pointer"
        style={{
          background: "var(--a-bg-card)",
          border: "1px solid var(--a-border)",
          color: "var(--a-text-body)",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--a-accent-btn)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--a-border)";
        }}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 rounded accent-purple-500"
      />
      <span className="text-sm" style={{ color: "var(--a-text-2)" }}>
        {label}
      </span>
    </label>
  );
}
