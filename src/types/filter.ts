export interface Filter {
  id: string;
  name_uk: string;
  name_ru: string | null;
  handle: string;
  source_type: 'feature' | 'field' | 'price' | 'brand';
  feature_id: string | null;
  field_name: string | null;
  display_type: 'checkbox' | 'range' | 'color' | 'toggle' | 'radio';
  position: number;
  is_active: boolean;
  collapsed: boolean;
  created_at: string;
}

export interface FilterCategory {
  filter_id: string;
  category_id: string;
}
