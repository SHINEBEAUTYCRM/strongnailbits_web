import { createAdminClient } from "@/lib/supabase/admin";
import { TopBar } from "@/components/home/TopBar";
import { getLanguage } from "@/lib/language-server";

export async function TopBarWrapper() {
  try {
    const supabase = createAdminClient();
    const { data: links } = await supabase
      .from("top_bar_links")
      .select("*")
      .eq("is_enabled", true)
      .order("sort_order");

    if (!links || links.length === 0) return null;

    const lang = await getLanguage();
    return <TopBar links={links} lang={lang} />;
  } catch {
    // If table doesn't exist yet (pre-migration), silently skip
    return null;
  }
}
