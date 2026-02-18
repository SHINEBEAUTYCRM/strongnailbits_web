"use client";

import { ImageOff, ChevronDown, ChevronUp, Sparkles, Camera, Search, Eye } from "lucide-react";
import { CompletenessIndicator } from "./CompletenessIndicator";

export interface ProductStatusItem {
  id: string;
  sku: string;
  name_uk: string;
  name_ru: string;
  slug: string;
  price: number;
  quantity: number;
  main_image_url: string | null;
  images: string[];
  description_uk: string | null;
  description_ru: string | null;
  meta_title: string | null;
  meta_description: string | null;
  brand_name: string | null;
  brand_id: string | null;
  category_path: string | null;
  category_id: string | null;
  photo_count: number;
  desc_uk_words: number;
  desc_ru_words: number;
  completeness: {
    photo: "none" | "few" | "full";
    descUk: "none" | "short" | "full";
    descRu: "none" | "short" | "full";
    seo: "none" | "partial" | "full";
  };
  completeness_score: number;
}

interface ProductCardProps {
  product: ProductStatusItem;
  selected: boolean;
  expanded: boolean;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onAction: (id: string, action: string) => void;
}

function fmt(v: number) {
  return v.toLocaleString("uk-UA");
}

export function ProductCard({ product: p, selected, expanded, onSelect, onToggleExpand, onAction }: ProductCardProps) {
  const c = p.completeness;

  return (
    <div
      className="rounded-xl transition-all"
      style={{
        background: "var(--a-bg-card)",
        border: selected ? "1px solid #7c3aed60" : "1px solid var(--a-border)",
        boxShadow: expanded ? "0 4px 24px #0004" : "none",
      }}
    >
      {/* Compact row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onSelect(p.id)}
          className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 transition-colors"
          style={{
            background: selected ? "#7c3aed" : "var(--a-bg-input)",
            border: `1px solid ${selected ? "#7c3aed" : "var(--a-border)"}`,
          }}
        >
          {selected && (
            <svg viewBox="0 0 12 12" className="w-3 h-3">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        {/* Photo */}
        {p.main_image_url ? (
          <img src={p.main_image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" style={{ background: "var(--a-bg-muted)" }} />
        ) : (
          <div className="w-12 h-12 rounded-lg shrink-0 flex items-center justify-center" style={{ background: "#1c0f06", border: "1px solid #431407" }}>
            <ImageOff className="w-4 h-4" style={{ color: "#f97316" }} />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" style={{ color: "var(--a-text-body)" }}>{p.name_uk}</p>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--a-text-5)" }}>
            {p.category_path || "—"} {p.sku && `· ${p.sku}`}
          </p>
        </div>

        {/* Price */}
        <span className="font-mono tabular-nums text-sm shrink-0 hidden sm:block" style={{ color: "var(--a-text-2)" }}>
          {fmt(p.price)} ₴
        </span>

        {/* Completeness dots */}
        <CompletenessIndicator {...c} compact />

        {/* Stats */}
        <div className="hidden md:flex items-center gap-3 text-[11px] shrink-0" style={{ color: "var(--a-text-4)" }}>
          <span title="Опис UK">{c.descUk === "none" ? "❌ UK" : `${p.desc_uk_words}w`}</span>
          <span title="Опис RU">{c.descRu === "none" ? "❌ RU" : `${p.desc_ru_words}w`}</span>
          <span title="Фото">{p.photo_count} фото</span>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 shrink-0">
          {c.descUk === "none" && (
            <button onClick={() => onAction(p.id, "generate_uk")} className="p-1.5 rounded-md" style={{ color: "#a78bfa", background: "#1a0f2e" }} title="Згенерувати опис UK">
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          {c.photo === "none" && (
            <button onClick={() => onAction(p.id, "find_photo")} className="p-1.5 rounded-md" style={{ color: "#f59e0b", background: "#1c1007" }} title="Знайти фото">
              <Camera className="w-3.5 h-3.5" />
            </button>
          )}
          {c.seo === "none" && (
            <button onClick={() => onAction(p.id, "generate_seo")} className="p-1.5 rounded-md" style={{ color: "#06b6d4", background: "#0c1a1f" }} title="Згенерувати SEO">
              <Search className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => onToggleExpand(p.id)} className="p-1.5 rounded-md" style={{ color: "var(--a-text-4)" }} title="Розгорнути">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded section */}
      {expanded && (
        <div className="px-4 pb-4" style={{ borderTop: "1px solid var(--a-border-sub)" }}>
          <div className="pt-3 text-[11px]" style={{ color: "var(--a-text-5)" }}>
            Розгорнутий вигляд — Phase 2
          </div>
        </div>
      )}
    </div>
  );
}
