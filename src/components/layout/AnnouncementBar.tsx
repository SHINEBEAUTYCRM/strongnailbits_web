"use client";

interface Announcement {
  id: string;
  text_uk: string;
  text_ru: string | null;
  link_url: string | null;
  bg_color: string;
  text_color: string;
}

interface Props {
  items: Announcement[];
  lang: "uk" | "ru";
}

export function AnnouncementBar({ items, lang }: Props) {
  if (!items.length) return null;

  const text = items.map((a) => (lang === "ru" ? (a.text_ru || a.text_uk) : a.text_uk));
  const repeated = [...text, ...text, ...text].join("     •     ");

  return (
    <div
      className="overflow-hidden whitespace-nowrap py-2 text-[12px] font-medium"
      style={{ background: items[0].bg_color, color: items[0].text_color }}
    >
      <div className="animate-marquee inline-block">
        {repeated}
      </div>
    </div>
  );
}
