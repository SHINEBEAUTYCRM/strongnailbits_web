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
  BookOpen,
  Webhook,
  Gauge,
  Megaphone,
  Target,
  Mail,
  Radar,
  Brain,
  Sparkles,
  PenTool,
  Building2,
  ShieldCheck,
  CreditCard,
  Globe,
  Clock,
  Zap,
  ScrollText,
  Plug,
  FlaskConical,
  Shield,
  Cable,
  Activity,
  Heart,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number | string;
  soon?: boolean;
  description?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavigation: NavGroup[] = [
  // ---------------------------------------------------------------
  //  ГОЛОВНЕ
  // ---------------------------------------------------------------
  {
    label: "ГОЛОВНЕ",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Замовлення", href: "/admin/orders", icon: ShoppingBag },
    ],
  },

  // ---------------------------------------------------------------
  //  КАТАЛОГ
  // ---------------------------------------------------------------
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

  // ---------------------------------------------------------------
  //  КЛІЄНТИ
  // ---------------------------------------------------------------
  {
    label: "КЛІЄНТИ",
    items: [
      { label: "Клієнти", href: "/admin/clients", icon: Users },
      { label: "Групи клієнтів", href: "/admin/client-groups", icon: UserCog, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  МАРКЕТИНГ
  // ---------------------------------------------------------------
  {
    label: "МАРКЕТИНГ",
    items: [
      { label: "Marketing Hub", href: "/admin/marketing", icon: Megaphone },
      { label: "SmartЛійки", href: "/admin/funnels", icon: Target },
      { label: "Реклама", href: "/admin/marketing/ads", icon: Target, soon: true },
      { label: "Комунікації", href: "/admin/marketing/comms", icon: Mail, soon: true },
      { label: "Конкуренти", href: "/admin/marketing/competitors", icon: Radar, soon: true },
      { label: "Знижки / Промокоди", href: "/admin/discounts", icon: Percent, soon: true },
      { label: "Банери", href: "/admin/banners", icon: ImageIcon, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  КОНТЕНТ
  // ---------------------------------------------------------------
  {
    label: "КОНТЕНТ",
    items: [
      { label: "Сторінки", href: "/admin/pages", icon: FileText, soon: true },
      { label: "Блог", href: "/admin/blog", icon: PenSquare, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  АНАЛІТИКА
  // ---------------------------------------------------------------
  {
    label: "АНАЛІТИКА",
    items: [
      { label: "Дашборд", href: "/admin/analytics", icon: BarChart3 },
      { label: "SEO", href: "/admin/seo", icon: Search, soon: true },
      { label: "A/B тести", href: "/admin/analytics/ab-tests", icon: FlaskConical, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  API & ІНТЕГРАЦІЇ — все что связано с внешними подключениями
  // ---------------------------------------------------------------
  {
    label: "API & ІНТЕГРАЦІЇ",
    items: [
      { label: "Огляд API", href: "/admin/api", icon: Cable, description: "Центр управління API" },
      { label: "Документація", href: "/admin/api-docs", icon: BookOpen, description: "Інтерактивний довідник ендпоінтів" },
      { label: "API ключі", href: "/admin/api-keys", icon: Key, description: "Токени для 1С та зовнішніх систем" },
      { label: "Вебхуки", href: "/admin/webhooks", icon: Webhook, description: "Сповіщення зовнішніх сервісів" },
      { label: "Монітор 1С", href: "/admin/1c", icon: Activity, description: "Статистика обміну з 1С" },
      { label: "Синхронізація", href: "/admin/sync", icon: RefreshCw, description: "Ручна синхронізація даних" },
      { label: "Інтеграції", href: "/admin/settings/integrations", icon: Plug, description: "47 сервісів підключення" },
    ],
  },

  // ---------------------------------------------------------------
  //  AI
  // ---------------------------------------------------------------
  {
    label: "AI",
    items: [
      { label: "AI Контент", href: "/admin/ai/content", icon: Brain, soon: true },
      { label: "Shine Scan", href: "/admin/ai/shine-scan", icon: Sparkles, soon: true },
      { label: "Banner Studio", href: "/admin/ai/banner-studio", icon: PenTool, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  МАРКЕТПЛЕЙС
  // ---------------------------------------------------------------
  {
    label: "МАРКЕТПЛЕЙС",
    items: [
      { label: "Seller Portal", href: "/admin/marketplace", icon: Building2, soon: true },
      { label: "Модерація", href: "/admin/marketplace/moderation", icon: ShieldCheck, soon: true },
      { label: "Виплати", href: "/admin/marketplace/payouts", icon: CreditCard, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  INTERNATIONAL
  // ---------------------------------------------------------------
  {
    label: "INTERNATIONAL",
    items: [
      { label: "Країни", href: "/admin/international", icon: Globe, soon: true },
    ],
  },

  // ---------------------------------------------------------------
  //  СИСТЕМА — технічне обслуговування
  // ---------------------------------------------------------------
  {
    label: "СИСТЕМА",
    items: [
      { label: "PageSpeed", href: "/admin/pagespeed", icon: Gauge },
      { label: "Користувачі", href: "/admin/users", icon: Shield },
      { label: "Cron Jobs", href: "/admin/settings/cron", icon: Clock, soon: true },
      { label: "Тригери", href: "/admin/settings/triggers", icon: Zap, soon: true },
      { label: "Логи", href: "/admin/settings/logs", icon: ScrollText, soon: true },
      { label: "Налаштування", href: "/admin/settings", icon: Settings, soon: true },
    ],
  },
];
