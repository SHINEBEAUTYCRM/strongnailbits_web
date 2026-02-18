"use client";

import { useLanguage, type Lang } from "@/hooks/useLanguage";
import { Globe } from "lucide-react";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex h-10 items-center gap-0.5 rounded-2xl border border-[#e8e8e8] bg-[#f5f5f5] p-1 ${className}`}>
      <LangButton code="uk" label="UA" active={lang === "uk"} onClick={setLang} />
      <LangButton code="ru" label="RU" active={lang === "ru"} onClick={setLang} />
    </div>
  );
}

/** Compact version for mobile */
export function LanguageSwitcherMini({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();
  const next: Lang = lang === "uk" ? "ru" : "uk";
  const label = lang === "uk" ? "UA" : "RU";

  return (
    <button
      onClick={() => setLang(next)}
      className={`flex h-10 items-center gap-1.5 rounded-xl border border-[#e8e8e8] bg-[#f5f5f5] px-3 text-[13px] font-semibold text-[#1a1a1a] transition-colors hover:border-coral hover:text-coral ${className}`}
    >
      <Globe size={16} />
      {label}
    </button>
  );
}

function LangButton({
  code,
  label,
  active,
  onClick,
}: {
  code: Lang;
  label: string;
  active: boolean;
  onClick: (lang: Lang) => void;
}) {
  return (
    <button
      onClick={() => !active && onClick(code)}
      className={`flex h-full items-center justify-center rounded-xl px-3 text-[13px] font-bold transition-all ${
        active
          ? "bg-white text-[#1a1a1a] shadow-sm"
          : "text-[#999] hover:text-[#1a1a1a]"
      }`}
    >
      {label}
    </button>
  );
}
