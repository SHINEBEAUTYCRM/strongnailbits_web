import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SiteContacts {
  phone: string;
  phone_raw: string;
  email: string;
  address: string;
  address_short: string;
  map_url: string;
  schedule: {
    weekdays: string;
    saturday: string;
    sunday: string;
    support_hours: string;
  };
}

export interface SiteSocial {
  instagram: { url: string; label: string };
  telegram: { url: string; label: string };
  facebook: { url: string; label: string };
  tiktok: { url: string; label: string };
  youtube: { url: string; label: string };
}

export interface SiteTheme {
  colors: Record<string, string>;
  radii: { card: string; pill: string };
  fonts: { heading: string; body: string; mono: string };
}

export interface SiteFeature {
  icon: string;
  title: string;
  desc: string;
  color: string;
  bg: string;
}

export interface SiteStat {
  value: string;
  label: string;
}

export interface HomepageSection {
  id: string;
  enabled: boolean;
  order: number;
  title?: string;
  limit?: number;
}

export interface SiteSettings {
  contacts: SiteContacts;
  social: SiteSocial;
  theme: SiteTheme;
  seo: Record<string, unknown>;
  features: SiteFeature[];
  stats: SiteStat[];
  b2b_cta: Record<string, unknown>;
  delivery: Record<string, unknown>;
  wholesale: Record<string, unknown>;
  footer: Record<string, unknown>;
  homepage: { sections: HomepageSection[] };
}

/* ------------------------------------------------------------------ */
/*  Fetch all settings (cached 60s)                                    */
/* ------------------------------------------------------------------ */

export const getSiteSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("key, value");

    if (error) throw error;

    const settings: Record<string, unknown> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }
    return settings as unknown as SiteSettings;
  },
  ["site-settings"],
  { revalidate: 60, tags: ["site-settings"] },
);

/* ------------------------------------------------------------------ */
/*  Fetch a single setting                                             */
/* ------------------------------------------------------------------ */

export const getSetting = unstable_cache(
  async <T = unknown>(key: string): Promise<T> => {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .single();

    if (error) throw error;
    return data.value as T;
  },
  ["site-setting"],
  { revalidate: 60, tags: ["site-settings"] },
);
