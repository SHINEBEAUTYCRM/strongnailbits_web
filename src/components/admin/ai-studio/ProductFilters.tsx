"use client";

interface FilterOption { id: string; name: string; }

interface ProductFiltersProps {
  brands: FilterOption[];
  categories: FilterOption[];
  brandId: string;
  categoryId: string;
  status: string;
  sort: string;
  onBrandChange: (v: string) => void;
  onCategoryChange: (v: string) => void;
  onStatusChange: (v: string) => void;
  onSortChange: (v: string) => void;
}

const STATUSES = [
  { k: "", l: "Всі" },
  { k: "no_desc_uk", l: "Без описів UK" },
  { k: "no_desc_ru", l: "Без описів RU" },
  { k: "no_photo", l: "Без фото" },
  { k: "no_seo", l: "Без SEO" },
];

const SORTS = [
  { k: "name", l: "За назвою" },
  { k: "completeness_asc", l: "Заповненість ↑" },
  { k: "completeness_desc", l: "Заповненість ↓" },
  { k: "updated", l: "Оновлення" },
];

export function ProductFilters({
  brands, categories, brandId, categoryId, status, sort,
  onBrandChange, onCategoryChange, onStatusChange, onSortChange,
}: ProductFiltersProps) {
  const selStyle = {
    background: "var(--a-bg-input)",
    border: "1px solid var(--a-border)",
    color: "var(--a-text-body)",
  };

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <select value={brandId} onChange={e => onBrandChange(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={selStyle}>
          <option value="">Всі бренди</option>
          {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>

        <select value={categoryId} onChange={e => onCategoryChange(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={selStyle}>
          <option value="">Всі категорії</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select value={sort} onChange={e => onSortChange(e.target.value)} className="px-3 py-2 rounded-lg text-xs" style={selStyle}>
          {SORTS.map(s => <option key={s.k} value={s.k}>{s.l}</option>)}
        </select>

        <div />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {STATUSES.map(s => {
          const active = status === s.k;
          return (
            <button
              key={s.k}
              onClick={() => onStatusChange(s.k)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium"
              style={active
                ? { background: "#7c3aed20", color: "#a78bfa", border: "1px solid #7c3aed60" }
                : { background: "var(--a-bg-input)", color: "var(--a-text-3)", border: "1px solid var(--a-border)" }}
            >
              {s.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}
