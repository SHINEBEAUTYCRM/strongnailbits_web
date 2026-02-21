export interface Feature {
  id: string;
  cs_cart_id: number | null;
  name_uk: string;
  name_ru: string | null;
  handle: string;
  feature_type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'color' | 'brand';
  filterable: boolean;
  show_on_card: boolean;
  required: boolean;
  suffix: string | null;
  position: number;
  status: 'active' | 'disabled' | 'archived';
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  variants?: FeatureVariant[];
}

export interface FeatureVariant {
  id: string;
  feature_id: string;
  cs_cart_id: number | null;
  value_uk: string;
  value_ru: string | null;
  position: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ProductFeatureValue {
  id: string;
  product_id: string;
  feature_id: string;
  variant_id: string | null;
  value_text: string | null;
  value_number: number | null;
  value_boolean: boolean | null;
  created_at: string;
}

export interface CategoryFeature {
  id: string;
  category_id: string;
  feature_id: string;
  is_required: boolean;
  position: number;
}
