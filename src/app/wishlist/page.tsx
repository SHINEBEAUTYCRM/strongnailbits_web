"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Heart, Trash2 } from "lucide-react";
import { useWishlistStore } from "@/lib/store/wishlist";
import { ProductCard } from "@/components/product/ProductCard";

export default function WishlistPage() {
  const items = useWishlistStore((s) => s.items);
  const removeItem = useWishlistStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        <h1 className="font-unbounded text-2xl font-black text-dark">
          Обране
        </h1>
        <div className="mt-8 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-coral border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-unbounded text-2xl font-black text-dark">
          Обране
        </h1>
        {items.length > 0 && (
          <span className="text-sm text-[var(--t2)]">
            {items.length} товарів
          </span>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand">
            <Heart size={32} className="text-[var(--t3)]" />
          </div>
          <p className="text-sm text-[var(--t2)]">
            Ваш список бажань порожній
          </p>
          <Link
            href="/catalog"
            className="font-unbounded rounded-pill bg-coral px-6 py-3 text-[13px] font-bold text-white transition-colors hover:bg-coral-2"
          >
            Перейти до каталогу
          </Link>
        </div>
      ) : (
        <>
          {/* Clear all button */}
          <button
            onClick={() => items.forEach((i) => removeItem(i.id))}
            className="mt-4 flex items-center gap-1 text-xs text-[var(--t3)] transition-colors hover:text-red"
          >
            <Trash2 size={12} />
            Очистити все
          </button>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <ProductCard
                key={item.id}
                id={item.id}
                slug={item.slug}
                name={item.name}
                price={item.price}
                oldPrice={item.oldPrice}
                imageUrl={item.imageUrl}
                brand={item.brand}
                status="active"
                quantity={999}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
