"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/cart";

interface CartState {
  items: CartItem[];
  hydrating: boolean;
  addItem: (product: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCount: () => number;
  hydrateCart: () => Promise<void>;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hydrating: false,

      addItem: (product) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product_id === product.product_id,
          );

          if (existing) {
            const newQty = Math.min(
              existing.quantity + product.quantity,
              product.max_quantity,
            );
            return {
              items: state.items.map((i) =>
                i.product_id === product.product_id
                  ? { ...i, quantity: newQty }
                  : i,
              ),
            };
          }

          return {
            items: [
              ...state.items,
              {
                ...product,
                quantity: Math.min(product.quantity, product.max_quantity),
              },
            ],
          };
        });
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.product_id !== productId),
        }));
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.product_id !== productId) };
          }
          return {
            items: state.items.map((i) =>
              i.product_id === productId
                ? { ...i, quantity: Math.min(quantity, i.max_quantity) }
                : i,
            ),
          };
        });
      },

      clearCart: () => set({ items: [] }),

      hydrateCart: async () => {
        const { items } = get();
        if (items.length === 0) return;

        const ids = items.map((i) => i.product_id);
        set({ hydrating: true });

        try {
          const { createClient } = await import("@/lib/supabase/client");
          const supabase = createClient();

          const { data: products } = await supabase
            .from("products")
            .select("id, name_uk, slug, price, quantity, sku, images")
            .in("id", ids);

          if (!products) return;

          interface HydratedProduct {
            id: string;
            name_uk: string;
            slug: string;
            price: number;
            quantity: number;
            sku: string | null;
            images: string[] | null;
          }

          const productMap = new Map(
            (products as HydratedProduct[]).map((p) => [p.id, p]),
          );

          set((state) => ({
            items: state.items
              .filter((item) => productMap.has(item.product_id))
              .map((item) => {
                const p = productMap.get(item.product_id)!;
                const images = p.images;
                return {
                  ...item,
                  name: p.name_uk || item.name,
                  slug: p.slug || item.slug,
                  price: p.price ?? item.price,
                  max_quantity: p.quantity ?? item.max_quantity,
                  sku: p.sku ?? item.sku,
                  image: (images && images.length > 0 ? images[0] : null) ?? item.image,
                };
              }),
          }));
        } catch (err) {
          console.error("[Cart] hydrateCart error:", err);
        } finally {
          set({ hydrating: false });
        }
      },

      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );
      },

      getCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "shine-shop-cart",
    },
  ),
);
