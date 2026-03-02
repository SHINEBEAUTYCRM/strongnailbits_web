"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "./cart";
import type { CartItem } from "@/types/cart";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

const TABLE = "carts";

interface DBCartRow {
  product_id: string;
  quantity: number;
}

async function loadCartFromDB(userId: string): Promise<DBCartRow[] | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select("items")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return (data.items as DBCartRow[]) ?? null;
}

async function saveCartToDB(userId: string, items: CartItem[]) {
  const compact: DBCartRow[] = items.map((i) => ({
    product_id: i.product_id,
    quantity: i.quantity,
  }));
  const supabase = createClient();
  await supabase.from(TABLE).upsert(
    { profile_id: userId, items: compact, updated_at: new Date().toISOString() },
    { onConflict: "profile_id" },
  );
}

function mergeItems(local: CartItem[], remote: DBCartRow[]): CartItem[] {
  const remoteMap = new Map<string, number>();
  for (const r of remote) remoteMap.set(r.product_id, r.quantity);

  const map = new Map<string, CartItem>();

  for (const item of local) {
    const remoteQty = remoteMap.get(item.product_id);
    if (remoteQty !== undefined) {
      map.set(item.product_id, {
        ...item,
        quantity: Math.min(item.quantity + remoteQty, item.max_quantity),
      });
      remoteMap.delete(item.product_id);
    } else {
      map.set(item.product_id, item);
    }
  }

  for (const [pid, qty] of remoteMap) {
    map.set(pid, {
      product_id: pid,
      name: "",
      slug: "",
      image: null,
      price: 0,
      old_price: null,
      quantity: qty,
      sku: null,
      max_quantity: qty,
      weight: null,
    });
  }

  return Array.from(map.values());
}

export function useCartSync() {
  const didSync = useRef(false);

  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session: Session | null) => {
      const userId = session?.user?.id;

      if (event === "SIGNED_IN" && userId && !didSync.current) {
        didSync.current = true;
        const localItems = useCartStore.getState().items;
        const remoteRows = await loadCartFromDB(userId);

        if (remoteRows && remoteRows.length > 0 && localItems.length > 0) {
          const merged = mergeItems(localItems, remoteRows);
          useCartStore.setState({ items: merged });
          await saveCartToDB(userId, merged);
        } else if (remoteRows && remoteRows.length > 0) {
          const restored: CartItem[] = remoteRows.map((r) => ({
            product_id: r.product_id,
            name: "",
            slug: "",
            image: null,
            price: 0,
            old_price: null,
            quantity: r.quantity,
            sku: null,
            max_quantity: r.quantity,
            weight: null,
          }));
          useCartStore.setState({ items: restored });
        } else if (localItems.length > 0) {
          await saveCartToDB(userId, localItems);
        }
      }

      if (event === "SIGNED_OUT") {
        didSync.current = false;
      }
    });

    let unsub: (() => void) | undefined;
    supabase.auth.getUser().then(({ data }: { data: { user: { id: string } | null } }) => {
      const userId = data.user?.id;
      if (!userId) return;

      unsub = useCartStore.subscribe(async (state) => {
        await saveCartToDB(userId, state.items);
      });
    });

    return () => {
      subscription.unsubscribe();
      unsub?.();
    };
  }, []);
}
