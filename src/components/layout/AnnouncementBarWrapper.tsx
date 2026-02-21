import { createAdminClient } from "@/lib/supabase/admin";
import { AnnouncementBar } from "./AnnouncementBar";
import { getLanguage } from "@/lib/language";

export async function AnnouncementBarWrapper() {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("announcement_bar")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order");

    if (!data?.length) return null;
    const lang = await getLanguage();
    return <AnnouncementBar items={data} lang={lang} />;
  } catch {
    return null;
  }
}
