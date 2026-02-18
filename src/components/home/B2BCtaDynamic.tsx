import Link from "next/link";
import type { Lang } from "@/lib/language";

interface ContentBlock {
  title_uk: string | null;
  title_ru: string | null;
  subtitle_uk: string | null;
  subtitle_ru: string | null;
  button_text_uk: string | null;
  button_text_ru: string | null;
  button_url: string | null;
  tags: unknown; // JSONB — array of strings
}

interface Props {
  block: ContentBlock;
  lang: Lang;
}

export function B2BCtaDynamic({ block, lang }: Props) {
  const title = lang === "ru" ? (block.title_ru || block.title_uk) : block.title_uk;
  const subtitle = lang === "ru" ? (block.subtitle_ru || block.subtitle_uk) : block.subtitle_uk;
  const btnText = lang === "ru" ? (block.button_text_ru || block.button_text_uk) : block.button_text_uk;
  const tags = Array.isArray(block.tags) ? block.tags as string[] : [];

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white px-6 py-12 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)] sm:px-12 sm:py-16">
      {/* Glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet opacity-[0.04] blur-[200px]" />
      </div>

      <div className="relative">
        <span className="font-unbounded mb-2 inline-block text-[10px] font-extrabold uppercase tracking-[3px] text-violet">
          B2B
        </span>

        {title && (
          <h2 className="font-unbounded mx-auto max-w-lg text-2xl font-black text-[#1a1a1a] sm:text-3xl">
            {title}
          </h2>
        )}

        {subtitle && (
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#6b6b7b]">
            {subtitle}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-violet/15 bg-violet/5 px-4 py-2 text-[12px] font-medium text-violet"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {block.button_url && btnText && (
          <div className="mt-8">
            <Link
              href={block.button_url}
              className="font-unbounded inline-flex h-12 items-center gap-2 rounded-full bg-violet px-8 text-[13px] font-bold text-white transition-all hover:glow-violet hover:opacity-90"
            >
              {btnText} →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
