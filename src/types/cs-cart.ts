/* ------------------------------------------------------------------ */
/*  CS-Cart REST API — TypeScript інтерфейси                          */
/* ------------------------------------------------------------------ */

export interface CSCartProduct {
  product_id: number;
  product: string;
  product_code: string;
  status: string;
  company_id: number;
  list_price: string;
  base_price: string;
  price: string;
  amount: number;
  weight: string;
  category_ids: number[];
  main_category: number;
  main_pair?: {
    detailed: {
      image_path: string;
      alt: string;
      width: number;
      height: number;
    };
  };
  image_pairs?: Record<
    string,
    {
      detailed: {
        image_path: string;
        alt: string;
        width: number;
        height: number;
      };
    }
  >;
  full_description?: string;
  short_description?: string;
  meta_description?: string;
  meta_keywords?: string;
  page_title?: string;
  seo_name?: string;
  product_features?: Record<
    string,
    {
      feature_id: string;
      variant_id: string;
      value: string;
      feature_type: string;
      description: string;
      variant: string | null;
    }
  >;
  timestamp: number;
  updated_timestamp: number;
}

export interface CSCartCategory {
  category_id: number;
  parent_id: number;
  category: string;
  description?: string;
  status: string;
  product_count: number;
  position: number;
  company_id: number;
  main_pair?: {
    detailed: {
      image_path: string;
      alt: string;
      width: number;
      height: number;
    };
  };
  timestamp: number;
}

export interface CSCartOrder {
  order_id: number;
  user_id: number;
  status: string;
  timestamp: number;
  total: string;
  subtotal: string;
  discount: string;
  shipping_cost: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  company: string;
  notes: string;
  products?: Record<
    string,
    {
      item_id: string;
      product_id: number;
      product: string;
      amount: number;
      price: string;
    }
  >;
}

export interface CSCartUser {
  user_id: number;
  user_login: string;
  user_type: string;
  status: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  company: string;
  company_id: number;
  timestamp: number;
}

export interface CSCartFeatureVariant {
  variant_id: number;
  variant: string;
  feature_id: number;
  position: number;
  image_pair?: {
    detailed?: {
      image_path: string;
      alt: string;
      width: number;
      height: number;
    };
  };
  description?: string;
  page_title?: string;
  meta_description?: string;
  seo_name?: string;
  url?: string;
  color?: string;
}

export interface CSCartFeature {
  feature_id: number;
  description: string;
  feature_type: string;
  company_id: number;
  status: string;
  position: number;
  categories_path?: string;
  parent_id?: number;
  purpose?: string;
  filter_style?: string;
  variants?: Record<string, CSCartFeatureVariant> | CSCartFeatureVariant[];
}

export interface CSCartPaginationParams {
  total_items: number;
  page: number;
  items_per_page: number;
}

export interface CSCartApiResponse<T> {
  products?: T[];
  categories?: T[];
  orders?: T[];
  users?: T[];
  features?: T[];
  variants?: T[];
  params: CSCartPaginationParams;
}
