"use client";

import { useState, useEffect, useRef } from "react";
import { createAdminBrowserClient } from "@/lib/supabase/client";
import { Save, Loader2, Upload, Image as ImageIcon, X, Check } from "lucide-react";

interface BrandingState {
  logo_url: string;
  favicon_url: string;
}

export default function BrandingPage() {
  const [data, setData] = useState<BrandingState>({ logo_url: "", favicon_url: "" });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<"logo" | "favicon" | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const supabase = createAdminBrowserClient();
        const { data: rows } = await supabase
          .from("site_settings")
          .select("key, value")
          .in("key", ["logo_url", "favicon_url"]);

        const state: BrandingState = { logo_url: "", favicon_url: "" };
        for (const row of rows ?? []) {
          const val = typeof row.value === "string" ? row.value.replace(/^"|"$/g, "") : "";
          if (row.key === "logo_url") state.logo_url = val;
          if (row.key === "favicon_url") state.favicon_url = val;
        }
        setData(state);
      } catch {
        setError("Не вдалось завантажити налаштування");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUpload = async (type: "logo" | "favicon", file: File) => {
    setUploading(type);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);

      const res = await fetch("/api/admin/upload/branding", { method: "POST", body: form });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Upload failed");

      setData((prev) => ({ ...prev, [`${type}_url`]: json.url }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const handleFileChange = (type: "logo" | "favicon") => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(type, file);
    e.target.value = "";
  };

  const handleRemove = async (type: "logo" | "favicon") => {
    setError(null);
    try {
      const supabase = createAdminBrowserClient();
      const key = type === "logo" ? "logo_url" : "favicon_url";
      await supabase.from("site_settings").upsert(
        { key, value: JSON.stringify(""), updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
      setData((prev) => ({ ...prev, [`${type}_url`]: "" }));
    } catch {
      setError("Не вдалось видалити");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--a-accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>
            Логотип і Фавікон
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--a-text-3)" }}>
            Завантажте логотип та іконку сайту
          </p>
        </div>
        {saved && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
          >
            <Check className="w-4 h-4" />
            Збережено
          </div>
        )}
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-sm"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Logo */}
        <UploadCard
          title="Логотип"
          hint="SVG або PNG, рекомендовано 200×50px, прозорий фон"
          currentUrl={data.logo_url}
          uploading={uploading === "logo"}
          inputRef={logoRef}
          accept=".svg,.png,.webp"
          previewClass="max-h-[80px] max-w-[280px] object-contain"
          onUploadClick={() => logoRef.current?.click()}
          onFileChange={handleFileChange("logo")}
          onRemove={() => handleRemove("logo")}
        />

        {/* Favicon */}
        <UploadCard
          title="Фавікон"
          hint="PNG або ICO, 32×32px / 16×16px"
          currentUrl={data.favicon_url}
          uploading={uploading === "favicon"}
          inputRef={faviconRef}
          accept=".png,.ico,.svg"
          previewClass="w-8 h-8 object-contain"
          onUploadClick={() => faviconRef.current?.click()}
          onFileChange={handleFileChange("favicon")}
          onRemove={() => handleRemove("favicon")}
        />
      </div>
    </div>
  );
}

function UploadCard({
  title,
  hint,
  currentUrl,
  uploading,
  inputRef,
  accept,
  previewClass,
  onUploadClick,
  onFileChange,
  onRemove,
}: {
  title: string;
  hint: string;
  currentUrl: string;
  uploading: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  previewClass: string;
  onUploadClick: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
    >
      <h2 className="text-base font-semibold mb-1" style={{ color: "var(--a-text)" }}>
        {title}
      </h2>
      <p className="text-xs mb-4" style={{ color: "var(--a-text-4)" }}>
        {hint}
      </p>

      {currentUrl ? (
        <div className="space-y-3">
          <div
            className="flex items-center justify-center rounded-lg p-4 min-h-[100px]"
            style={{ background: "var(--a-bg)", border: "1px dashed var(--a-border)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentUrl} alt={title} className={previewClass} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onUploadClick}
              disabled={uploading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: "var(--a-accent)", color: "#fff" }}
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Замінити
            </button>
            <button
              onClick={onRemove}
              className="flex items-center justify-center px-3 py-2.5 rounded-lg text-sm transition-colors"
              style={{ background: "var(--a-bg-hover)", color: "var(--a-text-3)" }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onUploadClick}
          disabled={uploading}
          className="w-full flex flex-col items-center justify-center gap-3 rounded-lg p-8 transition-colors cursor-pointer"
          style={{ background: "var(--a-bg)", border: "2px dashed var(--a-border)" }}
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--a-accent)" }} />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: "rgba(124,58,237,0.1)" }}
            >
              <ImageIcon className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
            </div>
          )}
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--a-text)" }}>
              Натисніть для завантаження
            </p>
            <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
              {hint}
            </p>
          </div>
        </button>
      )}

      <input ref={inputRef} type="file" accept={accept} onChange={onFileChange} className="hidden" />
    </div>
  );
}
