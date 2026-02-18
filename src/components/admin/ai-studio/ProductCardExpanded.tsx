"use client";

import { useState } from "react";
import { Save, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { AiGeneratePanel } from "./AiGeneratePanel";
import { CompletenessIndicator } from "./CompletenessIndicator";
import { SourceImagePicker } from "@/components/admin/SourceImagePicker";
import type { ProductStatusItem } from "./ProductCard";

interface ProductCardExpandedProps {
  product: ProductStatusItem;
  brandSourceUrls?: string[];
  onSave: (id: string, data: Partial<ProductStatusItem>) => void;
  onCollapse: () => void;
}

export function ProductCardExpanded({ product: p, brandSourceUrls = [], onSave, onCollapse }: ProductCardExpandedProps) {
  const [descUk, setDescUk] = useState(p.description_uk || "");
  const [descRu, setDescRu] = useState(p.description_ru || "");
  const [metaTitle, setMetaTitle] = useState(p.meta_title || "");
  const [metaDesc, setMetaDesc] = useState(p.meta_description || "");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [toast, setToast] = useState("");
  const [seoLoading, setSeoLoading] = useState(false);
  const [mainImageUrl, setMainImageUrl] = useState(p.main_image_url);

  const markDirty = () => setDirty(true);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: p.id,
          description_uk: descUk,
          description_ru: descRu,
          meta_title: metaTitle,
          meta_description: metaDesc,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setDirty(false);
        setToast("Збережено");
        setTimeout(() => setToast(""), 2000);
        onSave(p.id, { description_uk: descUk, description_ru: descRu, meta_title: metaTitle, meta_description: metaDesc });
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const generateSeo = async () => {
    setSeoLoading(true);
    try {
      const res = await fetch("/api/admin/ai/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: p.name_uk || p.name_ru,
          brand: p.brand_name,
          category: p.category_path,
          description: descUk || descRu,
          targetLang: "uk",
        }),
      });
      const data = await res.json();
      if (data.meta_title) { setMetaTitle(data.meta_title); markDirty(); }
      if (data.meta_description) { setMetaDesc(data.meta_description); markDirty(); }
    } catch { /* ignore */ }
    setSeoLoading(false);
  };

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "var(--a-bg-card)", border: "1px solid #7c3aed40", boxShadow: "0 4px 24px #0004" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--a-border)" }}>
        {mainImageUrl ? (
          <img src={mainImageUrl} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#1c0f06" }}>
            <span className="text-xs" style={{ color: "#f97316" }}>—</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--a-text)" }}>{p.name_uk}</p>
          <p className="text-[11px] mt-0.5" style={{ color: "var(--a-text-5)" }}>
            {p.brand_name && <span>{p.brand_name} · </span>}
            {p.category_path || "—"} · {p.sku || "—"} · {p.price.toLocaleString("uk-UA")} ₴
          </p>
          <CompletenessIndicator {...p.completeness} />
        </div>
        <a href={`/admin/products/${p.id}`} target="_blank" className="p-1.5 rounded-md" style={{ color: "var(--a-text-4)" }} title="Відкрити картку">
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
        {/* Description UK */}
        <AiGeneratePanel
          productName={p.name_uk || p.name_ru}
          brand={p.brand_name || undefined}
          brandId={p.brand_id || undefined}
          category={p.category_path || undefined}
          price={p.price}
          sku={p.sku || undefined}
          currentDescription={descUk}
          otherLangDescription={descRu}
          targetLang="uk"
          label="Опис (UK)"
          onAccept={(html) => { setDescUk(html); markDirty(); }}
        />

        {/* Description RU */}
        <AiGeneratePanel
          productName={p.name_ru || p.name_uk}
          brand={p.brand_name || undefined}
          brandId={p.brand_id || undefined}
          category={p.category_path || undefined}
          price={p.price}
          sku={p.sku || undefined}
          currentDescription={descRu}
          otherLangDescription={descUk}
          targetLang="ru"
          label="Опис (RU)"
          onAccept={(html) => { setDescRu(html); markDirty(); }}
        />
      </div>

      {/* Photo picker */}
      <div className="px-4 pb-4">
        <div className="rounded-lg p-3" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
          <p className="text-[11px] font-medium mb-2" style={{ color: "var(--a-text-3)" }}>
            Фото з сайту бренду
          </p>
          <SourceImagePicker
            productId={p.id}
            productName={p.name_uk || p.name_ru}
            productSku={p.sku || undefined}
            brandSourceUrls={brandSourceUrls}
            currentMainImage={mainImageUrl || undefined}
            onImagesDownloaded={(newMain, gallery) => {
              if (newMain) {
                setMainImageUrl(newMain);
                onSave(p.id, { main_image_url: newMain, photo_count: (p.photo_count || 0) + 1 + gallery.length });
              } else {
                onSave(p.id, { photo_count: (p.photo_count || 0) + gallery.length });
              }
              setToast(`Фото збережено`);
              setTimeout(() => setToast(""), 3000);
            }}
          />
        </div>
      </div>

      {/* SEO */}
      <div className="px-4 pb-4">
        <div className="rounded-lg p-3" style={{ background: "var(--a-bg-input)", border: "1px solid var(--a-border-sub)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium" style={{ color: "var(--a-text-3)" }}>SEO</span>
            <button
              onClick={generateSeo}
              disabled={seoLoading}
              className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium disabled:opacity-40"
              style={{ background: "#1a0f2e", color: "#a78bfa", border: "1px solid #7c3aed40" }}
            >
              {seoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              AI SEO
            </button>
          </div>
          <input
            value={metaTitle}
            onChange={e => { setMetaTitle(e.target.value); markDirty(); }}
            placeholder="Meta Title"
            className="w-full px-2.5 py-1.5 rounded text-xs outline-none mb-2"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
          />
          <textarea
            value={metaDesc}
            onChange={e => { setMetaDesc(e.target.value); markDirty(); }}
            placeholder="Meta Description"
            rows={2}
            className="w-full px-2.5 py-1.5 rounded text-xs outline-none resize-none"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)", color: "var(--a-text-body)" }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2.5" style={{ borderTop: "1px solid var(--a-border)", background: "var(--a-bg-muted)" }}>
        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#f59e0b", background: "#f59e0b18" }}>
              Є зміни
            </span>
          )}
          {toast && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ color: "#4ade80", background: "#4ade8018" }}>
              {toast}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onCollapse} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "var(--a-text-4)" }}>
            Згорнути
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white disabled:opacity-40"
            style={{ background: "#7c3aed" }}
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}
