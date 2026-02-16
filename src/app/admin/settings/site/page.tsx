"use client";

import { useState, useEffect, useCallback } from "react";
import { createAdminBrowserClient } from "@/lib/supabase/client";
import {
  Save,
  Loader2,
  Phone,
  Share2,
  Palette,
  Search,
  Star,
  BarChart3,
  Home,
  Truck,
  Percent,
  FileText,
  ArrowUp,
  ArrowDown,
  Plus,
  X,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SettingRow {
  key: string;
  value: unknown;
}

type TabId =
  | "contacts"
  | "social"
  | "theme"
  | "seo"
  | "features"
  | "stats"
  | "homepage"
  | "delivery"
  | "wholesale"
  | "footer";

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "contacts", label: "Контакти", icon: Phone },
  { id: "social", label: "Соцмережі", icon: Share2 },
  { id: "theme", label: "Тема", icon: Palette },
  { id: "seo", label: "SEO", icon: Search },
  { id: "features", label: "Features", icon: Star },
  { id: "stats", label: "Статистика", icon: BarChart3 },
  { id: "homepage", label: "Головна", icon: Home },
  { id: "delivery", label: "Доставка", icon: Truck },
  { id: "wholesale", label: "Опт", icon: Percent },
  { id: "footer", label: "Футер", icon: FileText },
];

/* ------------------------------------------------------------------ */
/*  Helper components                                                  */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  const inputStyle: React.CSSProperties = {
    background: "var(--a-bg-input)",
    border: "1px solid var(--a-border)",
    color: "var(--a-text-body)",
    borderRadius: 10,
    padding: "8px 12px",
    width: "100%",
    fontSize: 14,
    outline: "none",
  };

  return (
    <label className="block">
      <span
        className="text-xs font-medium mb-1.5 block"
        style={{ color: "var(--a-text-3)" }}
      >
        {label}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={inputStyle}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
      {hint && (
        <span className="text-[11px] mt-1 block" style={{ color: "var(--a-text-4)" }}>
          {hint}
        </span>
      )}
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-9 cursor-pointer rounded-lg border-0 p-0"
        style={{ background: "transparent" }}
      />
      <div className="flex-1 min-w-0">
        <span
          className="text-xs font-medium block"
          style={{ color: "var(--a-text-3)" }}
        >
          {label}
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--a-text-4)" }}>
          {value}
        </span>
      </div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                                */
/* ------------------------------------------------------------------ */

export default function SiteSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("contacts");
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [dirty, setDirty] = useState(false);

  /* ---- Load all settings ---- */
  useEffect(() => {
    (async () => {
      const supabase = createAdminBrowserClient();
      const { data } = await supabase.from("site_settings").select("key, value");
      const map: Record<string, unknown> = {};
      for (const row of (data ?? []) as SettingRow[]) {
        map[row.key] = row.value;
      }
      setSettings(map);
      setLoading(false);
    })();
  }, []);

  /* ---- Update a key ---- */
  const update = useCallback(
    (key: string, value: unknown) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
      setSaved(false);
    },
    [],
  );

  /* Deep update helper for nested objects */
  const updateNested = useCallback(
    (key: string, path: string[], value: unknown) => {
      setSettings((prev) => {
        const obj = structuredClone(prev[key] ?? {}) as Record<string, unknown>;
        let cursor: Record<string, unknown> = obj;
        for (let i = 0; i < path.length - 1; i++) {
          if (!cursor[path[i]] || typeof cursor[path[i]] !== "object") {
            cursor[path[i]] = {};
          }
          cursor = cursor[path[i]] as Record<string, unknown>;
        }
        cursor[path[path.length - 1]] = value;
        return { ...prev, [key]: obj };
      });
      setDirty(true);
      setSaved(false);
    },
    [],
  );

  /* ---- Save ---- */
  const handleSave = async () => {
    setSaving(true);
    const supabase = createAdminBrowserClient();
    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value: value as Record<string, unknown>,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("site_settings")
      .upsert(rows, { onConflict: "key" });

    if (!error) {
      await fetch("/api/revalidate-settings", { method: "POST" });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  /* ---- Getters ---- */
  const get = <T,>(key: string, fallback: T): T =>
    (settings[key] as T) ?? fallback;

  const contacts = get<Record<string, unknown>>("contacts", {});
  const schedule = (contacts.schedule ?? {}) as Record<string, string>;
  const social = get<Record<string, Record<string, string>>>("social", {});
  const theme = get<Record<string, unknown>>("theme", {});
  const colors = (theme.colors ?? {}) as Record<string, string>;
  const radii = (theme.radii ?? {}) as Record<string, string>;
  const seo = get<Record<string, unknown>>("seo", {});
  const features = get<Record<string, string>[]>("features", []);
  const stats = get<Record<string, string>[]>("stats", []);
  const homepage = get<{ sections: Record<string, unknown>[] }>("homepage", {
    sections: [],
  });
  const delivery = get<Record<string, unknown>>("delivery", {});
  const deliveryMethods = (delivery.methods ?? []) as Record<string, string>[];
  const paymentMethods = (delivery.payment ?? []) as Record<string, string>[];
  const wholesale = get<Record<string, unknown>>("wholesale", {});
  const discountTiers = (wholesale.discount_tiers ?? []) as Record<string, string>[];
  const footer = get<Record<string, unknown>>("footer", {});
  const catalogLinks = (footer.catalog_links ?? []) as { label: string; href: string }[];
  const infoLinks = (footer.info_links ?? []) as { label: string; href: string }[];
  const b2bCta = get<Record<string, unknown>>("b2b_cta", {});
  const b2bPerks = (b2bCta.perks ?? []) as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2
          className="w-6 h-6 animate-spin"
          style={{ color: "var(--a-accent)" }}
        />
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /*  Tab content renderers                                            */
  /* ---------------------------------------------------------------- */

  const renderContacts = () => (
    <div className="space-y-4">
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "var(--a-accent-bg)",
          color: "var(--a-accent)",
          border: "1px solid var(--a-accent)",
          opacity: 0.8,
        }}
      >
        Ці дані автоматично підтягуються в Header, Footer, Контакти, Про нас,
        Опт, Доставка, Checkout, Privacy — 7 сторінок
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Телефон (відображення)"
          value={String(contacts.phone ?? "")}
          onChange={(v) => updateNested("contacts", ["phone"], v)}
          placeholder="+38 (093) 744-38-89"
        />
        <Field
          label="Телефон (href)"
          value={String(contacts.phone_raw ?? "")}
          onChange={(v) => updateNested("contacts", ["phone_raw"], v)}
          placeholder="+380937443889"
        />
        <Field
          label="Email"
          value={String(contacts.email ?? "")}
          onChange={(v) => updateNested("contacts", ["email"], v)}
          type="email"
        />
        <Field
          label="Google Maps URL"
          value={String(contacts.map_url ?? "")}
          onChange={(v) => updateNested("contacts", ["map_url"], v)}
        />
        <Field
          label="Адреса повна"
          value={String(contacts.address ?? "")}
          onChange={(v) => updateNested("contacts", ["address"], v)}
        />
        <Field
          label="Адреса коротка"
          value={String(contacts.address_short ?? "")}
          onChange={(v) => updateNested("contacts", ["address_short"], v)}
        />
      </div>
      <h3
        className="text-sm font-semibold mt-6"
        style={{ color: "var(--a-text)" }}
      >
        Графік роботи
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Будні"
          value={schedule.weekdays ?? ""}
          onChange={(v) => updateNested("contacts", ["schedule", "weekdays"], v)}
        />
        <Field
          label="Субота"
          value={schedule.saturday ?? ""}
          onChange={(v) =>
            updateNested("contacts", ["schedule", "saturday"], v)
          }
        />
        <Field
          label="Неділя"
          value={schedule.sunday ?? ""}
          onChange={(v) => updateNested("contacts", ["schedule", "sunday"], v)}
        />
        <Field
          label="Години підтримки"
          value={schedule.support_hours ?? ""}
          onChange={(v) =>
            updateNested("contacts", ["schedule", "support_hours"], v)
          }
        />
      </div>
    </div>
  );

  const renderSocial = () => (
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
        Порожній URL = іконка не показується
      </p>
      {["instagram", "telegram", "facebook", "tiktok", "youtube"].map((s) => (
        <Field
          key={s}
          label={`${(social[s]?.label ?? s).charAt(0).toUpperCase()}${(social[s]?.label ?? s).slice(1)} URL`}
          value={social[s]?.url ?? ""}
          onChange={(v) => updateNested("social", [s, "url"], v)}
          placeholder={`https://${s}.com/...`}
        />
      ))}
    </div>
  );

  const renderTheme = () => (
    <div className="space-y-6">
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--a-text)" }}
      >
        Кольори
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(colors).map(([key, val]) => (
          <ColorField
            key={key}
            label={key}
            value={val || "#000000"}
            onChange={(v) => updateNested("theme", ["colors", key], v)}
          />
        ))}
      </div>
      <h3
        className="text-sm font-semibold mt-4"
        style={{ color: "var(--a-text)" }}
      >
        Округлення
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Card radius"
          value={radii.card ?? "16px"}
          onChange={(v) => updateNested("theme", ["radii", "card"], v)}
        />
        <Field
          label="Pill radius"
          value={radii.pill ?? "50px"}
          onChange={(v) => updateNested("theme", ["radii", "pill"], v)}
        />
      </div>
      {/* Live preview */}
      <h3
        className="text-sm font-semibold mt-4"
        style={{ color: "var(--a-text)" }}
      >
        Preview
      </h3>
      <div className="flex gap-4 flex-wrap">
        <button
          className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: colors.coral || "#D6264A" }}
        >
          Купити
        </button>
        <button
          className="px-6 py-2.5 rounded-full text-sm font-bold text-white"
          style={{ background: colors.violet || "#8B5CF6" }}
        >
          Стати оптовиком
        </button>
        <div
          className="p-4 rounded-2xl"
          style={{
            background: colors.card || "#FFFFFF",
            border: `1px solid ${colors.border || "#f0f0f0"}`,
            color: colors.text_primary || "#1a1a1a",
          }}
        >
          <span className="text-sm font-bold">Товар</span>
          <span
            className="ml-2 text-sm"
            style={{ color: colors.text_secondary || "#6b6b7b" }}
          >
            350 &#x20b4;
          </span>
        </div>
      </div>
    </div>
  );

  const renderSeo = () => (
    <div className="space-y-4">
      <Field
        label="Title default"
        value={String(seo.title_default ?? "")}
        onChange={(v) => updateNested("seo", ["title_default"], v)}
      />
      <Field
        label="Title template"
        value={String(seo.title_template ?? "")}
        onChange={(v) => updateNested("seo", ["title_template"], v)}
        hint="%s буде замінено на назву сторінки"
      />
      <Field
        label="Description"
        value={String(seo.description ?? "")}
        onChange={(v) => updateNested("seo", ["description"], v)}
        multiline
      />
      <Field
        label="Keywords (через кому)"
        value={
          Array.isArray(seo.keywords)
            ? (seo.keywords as string[]).join(", ")
            : String(seo.keywords ?? "")
        }
        onChange={(v) =>
          updateNested(
            "seo",
            ["keywords"],
            v.split(",").map((k) => k.trim()),
          )
        }
      />
      <Field
        label="Theme color"
        value={String(seo.theme_color ?? "#f5f5f7")}
        onChange={(v) => updateNested("seo", ["theme_color"], v)}
      />
    </div>
  );

  const renderFeatures = () => (
    <div className="space-y-4">
      {features.map((f, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`Іконка #${i + 1} (lucide name)`}
              value={f.icon ?? ""}
              onChange={(v) => {
                const arr = [...features];
                arr[i] = { ...arr[i], icon: v };
                update("features", arr);
              }}
              placeholder="truck, percent, shield-check..."
            />
            <Field
              label="Заголовок"
              value={f.title ?? ""}
              onChange={(v) => {
                const arr = [...features];
                arr[i] = { ...arr[i], title: v };
                update("features", arr);
              }}
            />
            <Field
              label="Опис"
              value={f.desc ?? ""}
              onChange={(v) => {
                const arr = [...features];
                arr[i] = { ...arr[i], desc: v };
                update("features", arr);
              }}
            />
            <ColorField
              label="Колір"
              value={f.color || "#000000"}
              onChange={(v) => {
                const arr = [...features];
                arr[i] = { ...arr[i], color: v };
                update("features", arr);
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );

  const renderStats = () => (
    <div className="space-y-4">
      {stats.map((s, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Значення #${i + 1}`}
            value={s.value ?? ""}
            onChange={(v) => {
              const arr = [...stats];
              arr[i] = { ...arr[i], value: v };
              update("stats", arr);
            }}
            placeholder="14 800+"
          />
          <Field
            label="Підпис"
            value={s.label ?? ""}
            onChange={(v) => {
              const arr = [...stats];
              arr[i] = { ...arr[i], label: v };
              update("stats", arr);
            }}
            placeholder="товарів"
          />
        </div>
      ))}
    </div>
  );

  const renderHomepage = () => {
    const sections = [...(homepage.sections ?? [])].sort(
      (a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0),
    );

    const moveSection = (idx: number, dir: -1 | 1) => {
      const target = idx + dir;
      if (target < 0 || target >= sections.length) return;
      const arr = [...sections];
      const [item] = arr.splice(idx, 1);
      arr.splice(target, 0, item);
      arr.forEach((s, i) => (s.order = i));
      update("homepage", { sections: arr });
    };

    const toggleSection = (idx: number) => {
      const arr = [...sections];
      arr[idx] = { ...arr[idx], enabled: !arr[idx].enabled };
      update("homepage", { sections: arr });
    };

    return (
      <div className="space-y-2">
        <p className="text-sm mb-3" style={{ color: "var(--a-text-4)" }}>
          Увімкніть/вимкніть секції та змініть їх порядок
        </p>
        {sections.map((s, i) => (
          <div
            key={String(s.id)}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
              opacity: s.enabled ? 1 : 0.5,
            }}
          >
            <button
              onClick={() => toggleSection(i)}
              className="w-5 h-5 rounded flex items-center justify-center shrink-0"
              style={{
                background: s.enabled
                  ? "var(--a-accent)"
                  : "var(--a-bg-hover)",
                color: s.enabled ? "#fff" : "var(--a-text-4)",
              }}
            >
              {s.enabled && <Check className="w-3 h-3" />}
            </button>
            <span
              className="flex-1 text-sm font-medium"
              style={{ color: "var(--a-text)" }}
            >
              {String(s.id)}
              {s.title ? ` — ${s.title}` : ""}
            </span>
            <button
              onClick={() => moveSection(i, -1)}
              disabled={i === 0}
              style={{ color: "var(--a-text-4)", opacity: i === 0 ? 0.3 : 1 }}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => moveSection(i, 1)}
              disabled={i === sections.length - 1}
              style={{
                color: "var(--a-text-4)",
                opacity: i === sections.length - 1 ? 0.3 : 1,
              }}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const renderDelivery = () => (
    <div className="space-y-6">
      <Field
        label="Поріг безкоштовної доставки (₴)"
        value={String(delivery.free_shipping_threshold ?? "")}
        onChange={(v) =>
          updateNested("delivery", ["free_shipping_threshold"], Number(v) || 0)
        }
        type="number"
      />
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--a-text)" }}
      >
        Методи доставки
      </h3>
      {deliveryMethods.map((m, i) => (
        <div
          key={i}
          className="rounded-xl p-4 space-y-3"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
          }}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <Field
              label="Назва"
              value={m.title ?? ""}
              onChange={(v) => {
                const arr = [...deliveryMethods];
                arr[i] = { ...arr[i], title: v };
                updateNested("delivery", ["methods"], arr);
              }}
            />
            <Field
              label="Опис"
              value={m.desc ?? ""}
              onChange={(v) => {
                const arr = [...deliveryMethods];
                arr[i] = { ...arr[i], desc: v };
                updateNested("delivery", ["methods"], arr);
              }}
            />
            <Field
              label="Ціна"
              value={m.price ?? ""}
              onChange={(v) => {
                const arr = [...deliveryMethods];
                arr[i] = { ...arr[i], price: v };
                updateNested("delivery", ["methods"], arr);
              }}
            />
          </div>
        </div>
      ))}
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--a-text)" }}
      >
        Методи оплати
      </h3>
      {paymentMethods.map((m, i) => (
        <div
          key={i}
          className="rounded-xl p-4 grid gap-3 sm:grid-cols-2"
          style={{
            background: "var(--a-bg-card)",
            border: "1px solid var(--a-border)",
          }}
        >
          <Field
            label="Назва"
            value={m.title ?? ""}
            onChange={(v) => {
              const arr = [...paymentMethods];
              arr[i] = { ...arr[i], title: v };
              updateNested("delivery", ["payment"], arr);
            }}
          />
          <Field
            label="Опис"
            value={m.desc ?? ""}
            onChange={(v) => {
              const arr = [...paymentMethods];
              arr[i] = { ...arr[i], desc: v };
              updateNested("delivery", ["payment"], arr);
            }}
          />
        </div>
      ))}
    </div>
  );

  const renderWholesale = () => (
    <div className="space-y-4">
      <h3
        className="text-sm font-semibold"
        style={{ color: "var(--a-text)" }}
      >
        Шкала знижок
      </h3>
      {discountTiers.map((t, i) => (
        <div key={i} className="grid gap-3 sm:grid-cols-2">
          <Field
            label={`Діапазон #${i + 1}`}
            value={t.range ?? ""}
            onChange={(v) => {
              const arr = [...discountTiers];
              arr[i] = { ...arr[i], range: v };
              updateNested("wholesale", ["discount_tiers"], arr);
            }}
            placeholder="5 000 – 15 000 ₴"
          />
          <Field
            label="Знижка"
            value={t.discount ?? ""}
            onChange={(v) => {
              const arr = [...discountTiers];
              arr[i] = { ...arr[i], discount: v };
              updateNested("wholesale", ["discount_tiers"], arr);
            }}
            placeholder="5%"
          />
        </div>
      ))}
    </div>
  );

  const renderFooter = () => {
    const updateLink = (
      listKey: "catalog_links" | "info_links",
      idx: number,
      field: "label" | "href",
      value: string,
    ) => {
      const list = listKey === "catalog_links" ? [...catalogLinks] : [...infoLinks];
      list[idx] = { ...list[idx], [field]: value };
      updateNested("footer", [listKey], list);
    };

    return (
      <div className="space-y-6">
        <Field
          label="Опис (під лого)"
          value={String(footer.description ?? "")}
          onChange={(v) => updateNested("footer", ["description"], v)}
          multiline
        />
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--a-text)" }}
        >
          Посилання каталогу
        </h3>
        {catalogLinks.map((l, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`Label #${i + 1}`}
              value={l.label}
              onChange={(v) => updateLink("catalog_links", i, "label", v)}
            />
            <Field
              label="Href"
              value={l.href}
              onChange={(v) => updateLink("catalog_links", i, "href", v)}
            />
          </div>
        ))}
        <h3
          className="text-sm font-semibold"
          style={{ color: "var(--a-text)" }}
        >
          Інформаційні посилання
        </h3>
        {infoLinks.map((l, i) => (
          <div key={i} className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`Label #${i + 1}`}
              value={l.label}
              onChange={(v) => updateLink("info_links", i, "label", v)}
            />
            <Field
              label="Href"
              value={l.href}
              onChange={(v) => updateLink("info_links", i, "href", v)}
            />
          </div>
        ))}
      </div>
    );
  };

  const tabContent: Record<TabId, () => React.ReactNode> = {
    contacts: renderContacts,
    social: renderSocial,
    theme: renderTheme,
    seo: renderSeo,
    features: renderFeatures,
    stats: renderStats,
    homepage: renderHomepage,
    delivery: renderDelivery,
    wholesale: renderWholesale,
    footer: renderFooter,
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: "var(--a-text)" }}
        >
          Налаштування сайту
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--a-text-3)" }}>
          Єдине джерело правди для всього контенту сайту
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 overflow-x-auto rounded-xl p-1"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors shrink-0"
              style={{
                background: isActive ? "var(--a-accent-bg)" : "transparent",
                color: isActive ? "var(--a-accent)" : "var(--a-text-3)",
              }}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        className="rounded-xl p-5"
        style={{
          background: "var(--a-bg-surface)",
          border: "1px solid var(--a-border)",
        }}
      >
        {tabContent[activeTab]()}
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div
          className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-end gap-3 px-6 py-3"
          style={{
            background: "var(--a-bg-card)",
            borderTop: "1px solid var(--a-border)",
            boxShadow: "0 -4px 20px var(--a-shadow)",
          }}
        >
          <span className="text-sm" style={{ color: "var(--a-text-3)" }}>
            Є незбережені зміни
          </span>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-opacity"
            style={{
              background: "var(--a-accent-btn)",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Зберегти
          </button>
        </div>
      )}

      {/* Saved toast */}
      {saved && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white"
          style={{ background: "#22c55e" }}
        >
          <Check className="w-4 h-4" />
          Збережено
        </div>
      )}
    </div>
  );
}
