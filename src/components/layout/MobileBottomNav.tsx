"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  LayoutGrid,
  ShoppingBag,
  Heart,
  User,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { useWishlistStore } from "@/lib/store/wishlist";
import { useState, useEffect } from "react";

const navItems = [
  {
    href: "/",
    icon: Home,
    label: "Головна",
    match: (p: string) => p === "/",
  },
  {
    href: "/catalog",
    icon: LayoutGrid,
    label: "Каталог",
    match: (p: string) => p.startsWith("/catalog"),
  },
  {
    href: "CART",
    icon: ShoppingBag,
    label: "Кошик",
    match: () => false,
    badge: "cart" as const,
  },
  {
    href: "/wishlist",
    icon: Heart,
    label: "Обране",
    match: (p: string) => p === "/wishlist",
    badge: "wishlist" as const,
  },
  {
    href: "/account",
    icon: User,
    label: "Кабінет",
    match: (p: string) => p.startsWith("/account"),
  },
];

export default function MobileBottomNav() {
  const pathname = usePathname();
  const cartCount = useCartStore((s) => s.getCount());
  const wishlistCount = useWishlistStore((s) => s.items.length);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Hide on admin, checkout, login, register
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  ) {
    return null;
  }

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div className="mobile-nav-spacer" />

      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const isActive = item.match(pathname);
          const Icon = item.icon;
          const isCart = item.href === "CART";

          // Badge count
          let badgeCount = 0;
          if (mounted && item.badge === "cart") badgeCount = cartCount;
          if (mounted && item.badge === "wishlist") badgeCount = wishlistCount;

          // Cart opens drawer via custom event
          if (isCart) {
            return (
              <button
                key="cart"
                onClick={() =>
                  window.dispatchEvent(new CustomEvent("open-cart"))
                }
                className="mobile-nav-item"
              >
                <div className="mobile-nav-icon-wrap">
                  <Icon size={22} strokeWidth={1.5} />
                  {badgeCount > 0 && (
                    <span className="mobile-nav-badge">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </div>
                <span className="mobile-nav-label">{item.label}</span>
              </button>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mobile-nav-item ${isActive ? "active" : ""}`}
            >
              <div className="mobile-nav-icon-wrap">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                {badgeCount > 0 && (
                  <span className="mobile-nav-badge">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </div>
              <span className="mobile-nav-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
