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
  SlidersHorizontal,
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
  Home,
  LayoutGrid,
  Globe,
  Bot,
  FileSpreadsheet,
  ArrowRightLeft,
  History,
  Smartphone,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";

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
      { label: "Характеристики", href: "/admin/attributes", icon: SlidersHorizontal },
      { label: "Колекції", href: "/admin/collections", icon: Layers, badge: "скоро" },
      { label: "Інвентар", href: "/admin/inventory", icon: Warehouse, badge: "скоро" },
      { label: "Імпорт / Експорт", href: "/admin/import", icon: FileSpreadsheet },
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
      { label: "Головна сторінка", href: "/admin/homepage", icon: Home },
      { label: "Блоки категорій", href: "/admin/homepage/category-blocks", icon: LayoutGrid },
      { label: "Банери", href: "/admin/banners", icon: ImageIcon },
      { label: "Сторінки", href: "/admin/pages-cms", icon: FileText },
      { label: "Мобільний додаток", href: "/admin/app-config", icon: Smartphone },
      { label: "Блог", href: "/admin/blog", icon: BookOpen, badge: "скоро" },
    ],
  },
  {
    id: "team",
    label: "Команда",
    icon: UsersRound,
    children: [
      { label: "Команда", href: "/admin/team", icon: UsersRound },
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
      { label: "SEO", href: "/admin/seo", icon: Search },
      { label: "A/B тести", href: "/admin/analytics/ab-tests", icon: FlaskConical, badge: "скоро" },
    ],
  },
  {
    id: "integrations",
    label: "Інтеграції",
    icon: Plug,
    href: "/admin/integrations",
    children: [
      { label: "Дашборд", href: "/admin/integrations", icon: LayoutGrid },
      { label: "Журнал подій", href: "/admin/integrations/events", icon: Activity },
      { label: "API ключі", href: "/admin/api-keys", icon: Key },
    ],
  },
  {
    id: "ai-consultant",
    label: "AI Консультант",
    icon: Bot,
    children: [
      { label: "Налаштування", href: "/admin/ai-consultant/settings", icon: Settings },
      { label: "FAQ база знань", href: "/admin/ai-consultant/faq", icon: BookOpen },
      { label: "Дизайн віджета", href: "/admin/ai-consultant/widget", icon: Palette },
      { label: "Менеджери", href: "/admin/ai-consultant/managers", icon: UsersRound },
      { label: "Робочі години", href: "/admin/ai-consultant/schedule", icon: Clock },
      { label: "Логи чатів", href: "/admin/ai-consultant/chats", icon: MessageCircle },
      { label: "Бюджет", href: "/admin/ai-consultant/budget", icon: BarChart2 },
    ],
  },
  {
    id: "system",
    label: "Система",
    icon: Settings,
    children: [
      { label: "Редиректи", href: "/admin/redirects", icon: ArrowRightLeft },
      { label: "Журнал дій", href: "/admin/audit", icon: History },
      { label: "Синхронізація", href: "/admin/sync", icon: RefreshCw },
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
      { label: "Сайт", href: "/admin/settings/site", icon: Globe },
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

/* ------------------------------------------------------------------ */
/*  Menu management functions (DB-backed public menus)                */
/* ------------------------------------------------------------------ */

export async function getMenus() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("menus").select("*").order("handle");
  return data ?? [];
}

export async function getMenuItems(menuHandle: string) {
  const supabase = createAdminClient();

  const { data: menu } = await supabase
    .from("menus")
    .select("id")
    .eq("handle", menuHandle)
    .single();

  if (!menu) return { menu_id: null, items: [] };

  const { data: items } = await supabase
    .from("menu_items")
    .select("*, categories(id, slug, name_uk, name_ru, product_count)")
    .eq("menu_id", menu.id)
    .order("position", { ascending: true });

  return { menu_id: menu.id, items: items ?? [] };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function saveMenuItems(menuId: string, items: any[]) {
  const supabase = createAdminClient();

  await supabase.from("menu_items").delete().eq("menu_id", menuId);

  if (!items.length) return { ok: true };

  const flat = flattenTree(items, menuId, null);
  const { error } = await supabase.from("menu_items").insert(flat);

  if (error) throw new Error(error.message);
  return { ok: true };
}

function flattenTree(
  items: any[],
  menuId: string,
  parentId: string | null,
  result: any[] = [],
  counter = { val: 0 },
): any[] {
  for (const item of items) {
    const id = item.id || crypto.randomUUID();
    result.push({
      id,
      menu_id: menuId,
      parent_id: parentId,
      category_id: item.category_id || null,
      page_id: item.page_id || null,
      label_uk: item.label_uk,
      label_ru: item.label_ru || null,
      url: item.url || null,
      item_type: item.item_type || "category",
      target: item.target || "_self",
      icon: item.icon || null,
      badge_text: item.badge_text || null,
      badge_color: item.badge_color || "#EF4444",
      is_visible: item.is_visible ?? true,
      position: counter.val++,
    });
    if (item.children?.length) {
      flattenTree(item.children, menuId, id, result, counter);
    }
  }
  return result;
}
