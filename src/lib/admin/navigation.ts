import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Award,
  Layers,
  Warehouse,
  Users,
  UserCog,
  Percent,
  ImageIcon,
  FileText,
  PenSquare,
  BarChart3,
  Search,
  RefreshCw,
  Settings,
  Key,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  soon?: boolean;
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
      { label: "Колекції", href: "/admin/collections", icon: Layers, soon: true },
      { label: "Інвентар", href: "/admin/inventory", icon: Warehouse, soon: true },
    ],
  },
  {
    label: "КЛІЄНТИ",
    items: [
      { label: "Клієнти", href: "/admin/clients", icon: Users },
      { label: "Групи клієнтів", href: "/admin/client-groups", icon: UserCog, soon: true },
    ],
  },
  {
    label: "МАРКЕТИНГ",
    items: [
      { label: "Знижки / Промокоди", href: "/admin/discounts", icon: Percent, soon: true },
      { label: "Банери", href: "/admin/banners", icon: ImageIcon, soon: true },
    ],
  },
  {
    label: "КОНТЕНТ",
    items: [
      { label: "Сторінки", href: "/admin/pages", icon: FileText, soon: true },
      { label: "Блог", href: "/admin/blog", icon: PenSquare, soon: true },
    ],
  },
  {
    label: "АНАЛІТИКА",
    items: [
      { label: "Аналітика", href: "/admin/analytics", icon: BarChart3, soon: true },
      { label: "SEO", href: "/admin/seo", icon: Search, soon: true },
    ],
  },
  {
    label: "СИСТЕМА",
    items: [
      { label: "Синхронізація", href: "/admin/sync", icon: RefreshCw },
      { label: "Налаштування", href: "/admin/settings", icon: Settings, soon: true },
      { label: "API ключі", href: "/admin/api-keys", icon: Key, soon: true },
    ],
  },
];
