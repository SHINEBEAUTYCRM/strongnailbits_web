import { HeroBannerClient, type SlideData } from "./HeroBannerClient";

/**
 * HeroBanner — server component wrapper.
 * Renders the first slide as static HTML for instant LCP,
 * then hydrates the interactive slider on the client.
 */

const SLIDES: readonly SlideData[] = [
  {
    title: "Все для манікюру\nта педикюру",
    subtitle:
      "Більше 14 000 товарів від 80+ брендів.\nОптові ціни від 1 одиниці.",
    cta: "Перейти до каталогу",
    href: "/catalog",
    bg: "bg-gradient-to-br from-coral to-[#ff7e91]",
    accent: "text-coral",
  },
  {
    title: "Знижки до -40%\nна топові бренди",
    subtitle:
      "Kodi, OXXI, NeoNail, Komilfo та десятки\nінших за найкращими цінами.",
    cta: "Переглянути Sale",
    href: "/catalog?in_stock=true&sort=discount",
    bg: "bg-gradient-to-br from-violet to-[#a78bfa]",
    accent: "text-violet",
  },
  {
    title: "Оптовим клієнтам —\nспеціальні умови",
    subtitle:
      "Персональний менеджер, безкоштовна\nдоставка, накопичувальні знижки.",
    cta: "Дізнатись більше",
    href: "/wholesale",
    bg: "bg-gradient-to-br from-[#1a1a2e] to-[#16213e]",
    accent: "text-[#1a1a2e]",
  },
];

export type HeroSlide = SlideData;

export function HeroBanner() {
  return <HeroBannerClient slides={SLIDES} />;
}
