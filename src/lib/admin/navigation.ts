import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Award,
  Users,
  RefreshCw,
  Settings,
  BarChart3,
  Percent,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  soon?: boolean; // dimmed, not clickable
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavigation: NavGroup[] = [
  {
    label: "ГОЛОВНЕ",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Замовлення", href: "/admin/orders", icon: ShoppingBag },
    ],
  },
  {
    label: "КАТАЛОГ",
    items: [
      { label: "Товари", href: "/admin/products", icon: Package },
      { label: "Категорії", href: "/admin/categories", icon: FolderTree },
      { label: "Бренди", href: "/admin/brands", icon: Award },
    ],
  },
  {
    label: "КЛІЄНТИ",
    items: [
      { label: "Клієнти", href: "/admin/clients", icon: Users },
    ],
  },
  {
    label: "СИСТЕМА",
    items: [
      { label: "Синхронізація", href: "/admin/sync", icon: RefreshCw },
      { label: "Аналітика", href: "/admin/analytics", icon: BarChart3, soon: true },
      { label: "Знижки", href: "/admin/discounts", icon: Percent, soon: true },
      { label: "Налаштування", href: "/admin/settings", icon: Settings, soon: true },
    ],
  },
];
