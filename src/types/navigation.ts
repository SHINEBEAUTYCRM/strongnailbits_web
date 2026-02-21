export interface Menu {
  id: string;
  handle: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  menu_id: string;
  parent_id: string | null;
  category_id: string | null;
  page_id: string | null;
  label_uk: string;
  label_ru: string | null;
  url: string | null;
  item_type: 'category' | 'custom_link' | 'page' | 'separator';
  target: string;
  icon: string | null;
  badge_text: string | null;
  badge_color: string | null;
  is_visible: boolean;
  position: number;
  created_at: string;
  updated_at: string;
  children?: MenuItem[];
  category_slug?: string;
  category_name_uk?: string;
  category_product_count?: number;
}
