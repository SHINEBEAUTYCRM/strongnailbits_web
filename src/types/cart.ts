export interface CartItem {
  product_id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  old_price: number | null;
  quantity: number;
  sku: string | null;
  max_quantity: number;
  weight: number | null;
}
