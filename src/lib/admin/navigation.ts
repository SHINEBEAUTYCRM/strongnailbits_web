import type { LucideIcon } from "lucide-react";
import {
  PackageCheck,
  List,
  Truck,
  RotateCcw,
  ShoppingBag,
  Package,
  FolderTree,
  Award,
  Layers,
  Warehouse,
  Users,
  UserCog,
  Megaphone,
  BarChart3,
  Target,
  ImageIcon,
  Percent,
  Rss,
  Mail,
  Crosshair,
  FileText,
  BookOpen,
  UsersRound,
  CheckSquare,
  Palette,
  MessageCircle,
  BarChart2,
  Search,
  FlaskConical,
  Settings,
  RefreshCw,
  Plug,
  Code2,
  Key,
  Webhook,
  Activity,
  Gauge,
  Shield,
  Clock,
  Zap,
  ScrollText,
  Store,
  ShieldCheck,
  Wallet,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface NavChild {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  badge?: string;
  children: NavChild[];
}

/* ------------------------------------------------------------------ */
/*  Navigation config (top nav – horizontal with dropdowns)           */
/* ------------------------------------------------------------------ */

export const adminNavigation: NavSection[] = [
  {
    id: "orders",
    label: "Замовлення",
    icon: PackageCheck,
    href: "/admin/orders",
    children: [
      { label: "Всі замовлення", href: "/admin/orders", icon: List },
      { label: "Відправки", href: "/admin/orders?status=shipped", icon: Truck, badge: "скоро" },
      { label: "Повернення", href: "/admin/orders?status=returned", icon: RotateCcw, badge: "скоро" },
    ],
  },
  {
    id: "catalog",
    label: "Каталог",
    icon: ShoppingBag,
    children: [
      { label: "Товари", href: "/admin/products", icon: Package },
      { label: "Категорії", href: "/admin/categories", icon: FolderTree },
      { label: "Бренди", href: "/admin/brands", icon: Award },
      { label: "Колекції", href: "/admin/collections", icon: Layers, badge: "скоро" },
      { label: "Інвентар", href: "/admin/inventory", icon: Warehouse, badge: "скоро" },
    ],
  },
  {
    id: "clients",
    label: "Клієнти",
    icon: Users,
    children: [
      { label: "Всі клієнти", href: "/admin/clients", icon: Users },
      { label: "Групи клієнтів", href: "/admin/client-groups", icon: UserCog, badge: "скоро" },
    ],
  },
  {
    id: "marketing",
    label: "Маркетинг",
    icon: Megaphone,
    children: [
      { label: "Marketing Hub", href: "/admin/marketing", icon: BarChart3 },
      { label: "SmartЛійки", href: "/admin/funnels", icon: Target },
      { label: "Банери", href: "/admin/banners", icon: ImageIcon },
      { label: "Знижки / Промо", href: "/admin/discounts", icon: Percent, badge: "скоро" },
      { label: "Реклама", href: "/admin/marketing/ads", icon: Rss, badge: "скоро" },
      { label: "Комунікації", href: "/admin/marketing/comms", icon: Mail, badge: "скоро" },
      { label: "Конкуренти", href: "/admin/marketing/competitors", icon: Crosshair, badge: "скоро" },
    ],
  },
  {
    id: "content",
    label: "Контент",
    icon: FileText,
    children: [
      { label: "Сторінки", href: "/admin/pages", icon: FileText, badge: "скоро" },
      { label: "Блог", href: "/admin/blog", icon: BookOpen, badge: "скоро" },
    ],
  },
  {
    id: "team",
    label: "Команда",
    icon: UsersRound,
    children: [
      { label: "Задачі", href: "/admin/tasks", icon: CheckSquare },
      { label: "Shine Board", href: "/admin/board", icon: Palette },
      { label: "Чат", href: "/admin/chat", icon: MessageCircle },
    ],
  },
  {
    id: "analytics",
    label: "Аналітика",
    icon: BarChart2,
    children: [
      { label: "Дашборд", href: "/admin/analytics", icon: BarChart2 },
      { label: "SEO", href: "/admin/seo", icon: Search, badge: "скоро" },
      { label: "A/B тести", href: "/admin/analytics/ab-tests", icon: FlaskConical, badge: "скоро" },
    ],
  },
  {
    id: "system",
    label: "Система",
    icon: Settings,
    children: [
      { label: "Синхронізація", href: "/admin/sync", icon: RefreshCw },
      { label: "Інтеграції", href: "/admin/settings/integrations", icon: Plug },
      { label: "Огляд API", href: "/admin/api", icon: Code2 },
      { label: "Документація", href: "/admin/api-docs", icon: BookOpen },
      { label: "API ключі", href: "/admin/api-keys", icon: Key },
      { label: "Вебхуки", href: "/admin/webhooks", icon: Webhook },
      { label: "Монітор 1С", href: "/admin/1c", icon: Activity },
      { label: "PageSpeed", href: "/admin/pagespeed", icon: Gauge },
      { label: "Користувачі", href: "/admin/users", icon: Shield },
      { label: "Cron Jobs", href: "/admin/settings/cron", icon: Clock, badge: "скоро" },
      { label: "Тригери", href: "/admin/settings/triggers", icon: Zap, badge: "скоро" },
      { label: "Логи", href: "/admin/settings/logs", icon: ScrollText, badge: "скоро" },
      { label: "Налаштування", href: "/admin/settings", icon: Settings },
    ],
  },
  {
    id: "marketplace",
    label: "Маркетплейс",
    icon: Store,
    badge: "скоро",
    children: [
      { label: "Seller Portal", href: "/admin/marketplace", icon: Store, badge: "скоро" },
      { label: "Модерація", href: "/admin/marketplace/moderation", icon: ShieldCheck, badge: "скоро" },
      { label: "Виплати", href: "/admin/marketplace/payouts", icon: Wallet, badge: "скоро" },
    ],
  },
];
