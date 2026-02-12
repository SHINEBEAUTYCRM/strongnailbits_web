// ================================================================
//  ShineShop OS — Banner System Types
// ================================================================

export type BannerType =
  | 'hero_slider'
  | 'promo_strip'
  | 'category_banner'
  | 'side_banner'
  | 'popup'
  | 'stories';

export interface Banner {
  id: string;
  title: string;
  heading?: string | null;
  subheading?: string | null;
  button_text?: string | null;
  button_url?: string | null;
  promo_code?: string | null;
  discount_text?: string | null;
  image_desktop?: string | null;
  image_mobile?: string | null;
  image_alt?: string | null;
  type: BannerType;
  placement: string[];
  starts_at?: string | null;
  ends_at?: string | null;
  is_active: boolean;
  sort_order: number;
  priority: number;
  bg_color?: string | null;
  text_color: string;
  overlay_opacity: number;
  views_count: number;
  clicks_count: number;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export type BannerInsert = Omit<Banner, 'id' | 'views_count' | 'clicks_count' | 'created_at' | 'updated_at'>;
export type BannerUpdate = Partial<BannerInsert>;

/** Розміри за типом банера */
export const BANNER_SIZES: Record<BannerType, { width: number; height: number; label: string }> = {
  hero_slider:     { width: 1920, height: 600, label: 'Слайдер головної' },
  promo_strip:     { width: 1920, height: 80,  label: 'Промо-стрічка' },
  category_banner: { width: 1200, height: 400, label: 'Банер категорії' },
  side_banner:     { width: 300,  height: 600, label: 'Бічний банер' },
  popup:           { width: 600,  height: 800, label: 'Pop-up' },
  stories:         { width: 1080, height: 1920, label: 'Stories' },
};

/** Типи банерів для UI */
export const BANNER_TYPE_OPTIONS: { value: BannerType; label: string; icon: string }[] = [
  { value: 'hero_slider',     label: 'Слайдер головної', icon: '🖼️' },
  { value: 'promo_strip',     label: 'Промо-стрічка',    icon: '📢' },
  { value: 'category_banner', label: 'Банер категорії',  icon: '📁' },
  { value: 'side_banner',     label: 'Бічний банер',     icon: '📐' },
  { value: 'popup',           label: 'Pop-up',           icon: '💬' },
  { value: 'stories',         label: 'Stories',          icon: '📱' },
];

/** Placement options */
export const PLACEMENT_OPTIONS = [
  { value: 'home',     label: 'Головна сторінка' },
  { value: 'catalog',  label: 'Каталог (всі категорії)' },
  { value: 'cart',     label: 'Кошик' },
  { value: 'checkout', label: 'Оформлення замовлення' },
];

/** Визначити статус банера */
export type BannerStatus = 'active' | 'scheduled' | 'expired' | 'inactive';

export function getBannerStatus(banner: Banner): BannerStatus {
  if (!banner.is_active) return 'inactive';
  const now = new Date();
  if (banner.starts_at && new Date(banner.starts_at) > now) return 'scheduled';
  if (banner.ends_at && new Date(banner.ends_at) < now) return 'expired';
  return 'active';
}

export const BANNER_STATUS_CONFIG: Record<BannerStatus, { label: string; color: string; dot: string }> = {
  active:    { label: 'Активний',     color: '#22c55e', dot: '🟢' },
  scheduled: { label: 'Запланований', color: '#facc15', dot: '🟡' },
  expired:   { label: 'Завершений',   color: '#ef4444', dot: '🔴' },
  inactive:  { label: 'Неактивний',   color: '#6b7280', dot: '⚫' },
};
