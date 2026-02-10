"use client";

import { useLanguage, type Lang } from "@/hooks/useLanguage";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex h-9 items-center rounded-xl border border-[#e8e8e8] bg-[#f8f8f8] p-0.5 ${className}`}>
      <LangButton code="uk" label="UA" active={lang === "uk"} onClick={setLang} />
      <LangButton code="ru" label="RU" active={lang === "ru"} onClick={setLang} />
    </div>
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
      className={`flex h-full items-center justify-center rounded-lg px-2.5 text-[12px] font-semibold transition-all ${
        active
          ? "bg-white text-[#1a1a1a] shadow-sm"
          : "text-[#999] hover:text-[#1a1a1a]"
      }`}
    >
      {label}
    </button>
  );
}
