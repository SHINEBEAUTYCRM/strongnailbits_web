"use client";
import { useCartSync } from "@/lib/store/cartSync";

export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  useCartSync();
  return <>{children}</>;
}
