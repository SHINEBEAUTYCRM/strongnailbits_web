import { createAdminClient } from "@/lib/supabase/admin";
import { HeroBannerClient, type SlideData } from "./HeroBannerClient";

async function getHeroSlides() {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("banners")
    .select("*")
    .eq("type", "hero_slider")
    .eq("is_active", true)
    .or(`starts_at.is.null,starts_at.lte.${now}`)
    .or(`ends_at.is.null,ends_at.gte.${now}`)
    .order("sort_order")
    .order("priority", { ascending: false });

  return data || [];
}

/* Fallback slides matching existing HeroBanner format */
const FALLBACK_SLIDES: readonly SlideData[] = [
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
] as const;

export async function HeroBannerDynamic() {
  const banners = await getHeroSlides();

  if (banners.length === 0) {
    return <HeroBannerClient slides={FALLBACK_SLIDES} />;
  }

  /* Transform DB banners into HeroSlide-compatible format */
  const slides = banners.map((b) => ({
    title: b.heading || b.title || "",
    subtitle: b.subheading || "",
    cta: b.button_text || "Детальніше",
    href: b.button_url || "/catalog",
    bg: b.bg_color
      ? `bg-[${b.bg_color}]`
      : "bg-gradient-to-br from-coral to-[#ff7e91]",
    accent: "text-coral",
    /* Pass image data for the client to use if available */
    imageDesktop: b.image_desktop || undefined,
    imageMobile: b.image_mobile || undefined,
    overlayOpacity: b.overlay_opacity ?? 30,
    textColor: b.text_color || "#FFFFFF",
  }));

  return <HeroBannerClient slides={slides} />;
}
