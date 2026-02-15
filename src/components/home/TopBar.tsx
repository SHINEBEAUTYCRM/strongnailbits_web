import Link from "next/link";
import type { Lang } from "@/lib/language";

interface TopBarLink {
  id: string;
  label_uk: string;
  label_ru: string | null;
  url: string;
  position: string;
}

interface Props {
  links: TopBarLink[];
  lang: Lang;
}

export function TopBar({ links, lang }: Props) {
  const leftLinks = links.filter((l) => l.position === "left");

  return (
    <div className="hidden border-b border-[#f0f0f0] bg-[#fafafa] text-[12px] lg:block">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-1.5">
        <div className="flex items-center gap-4">
          {leftLinks.map((link) => (
            <Link
              key={link.id}
              href={link.url}
              className="text-[#6b6b7b] transition-colors hover:text-coral"
            >
              {lang === "ru" ? (link.label_ru || link.label_uk) : link.label_uk}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 text-[#6b6b7b]">
          <a href="tel:+380937443889" className="hover:text-coral">
            +38 (093) 744-38-89
          </a>
          <span className="text-[#d4d4d8]">·</span>
          <span>Пн-Пт 9:00—18:00</span>
        </div>
      </div>
    </div>
  );
}
