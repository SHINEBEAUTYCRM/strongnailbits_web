"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, LayoutGrid, Search, ShoppingBag, Heart, User } from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", icon: Home, label: "Головна", match: (p: string) => p === "/" },
  { href: "/catalog", icon: LayoutGrid, label: "Каталог", match: (p: string) => p.startsWith("/catalog") },
  { href: "/search", icon: Search, label: "Пошук", match: (p: string) => p.startsWith("/search") },
  { href: "CART", icon: ShoppingBag, label: "Кошик", match: () => false },
  { href: "/wishlist", icon: Heart, label: "Обране", match: (p: string) => p === "/wishlist" },
];

export function MobileNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hide on admin, checkout, login/register
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/95 backdrop-blur-lg md:hidden safe-bottom">
      <div className="flex items-stretch justify-around">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          const isCart = item.href === "CART";

          // Cart button opens drawer via header (dispatch custom event)
          if (isCart) {
            return (
              <button
                key="cart"
                onClick={() => window.dispatchEvent(new CustomEvent("open-cart"))}
                className="relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors"
              >
                <div className="relative">
                  <Icon size={20} strokeWidth={1.8} className="text-[var(--t3)]" />
                  {mounted && cartCount > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-[var(--t3)]">{item.label}</span>
              </button>
            );
          }

          const badge =
            item.href === "/wishlist" && mounted && wishlistCount > 0
              ? wishlistCount
              : null;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2 pt-2.5 transition-colors ${
                isActive ? "text-coral" : "text-[var(--t3)]"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.8} />
                {badge && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[9px] font-bold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? "font-semibold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
