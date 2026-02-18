"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem } from "@/types/cart";

interface CartState {
  items: CartItem[];
  addItem: (product: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

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
