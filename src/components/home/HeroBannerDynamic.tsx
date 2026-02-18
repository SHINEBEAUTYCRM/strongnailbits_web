import { createAdminClient } from "@/lib/supabase/admin";
import { HeroSlider } from "@/components/banners/HeroSlider";

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

export async function HeroBannerDynamic() {
  const banners = await getHeroSlides();

  if (!banners || banners.length === 0) return null;

  return <HeroSlider banners={banners} />;
}
