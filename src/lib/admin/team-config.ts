export const ROLES = {
  ceo:            { label: "CEO",                 department: "admin",     color: "#a855f7" },
  sales_manager:  { label: "Менеджер продажів",   department: "sales",     color: "#f59e0b" },
  content:        { label: "Контент-менеджер",     department: "marketing", color: "#ec4899" },
  developer:      { label: "Розробник",            department: "tech",      color: "#3b82f6" },
  marketer:       { label: "Маркетолог",           department: "marketing", color: "#f97316" },
  seo:            { label: "SEO-спеціаліст",       department: "marketing", color: "#22c55e" },
  designer:       { label: "Дизайнер",             department: "marketing", color: "#8b5cf6" },
  accountant:     { label: "Бухгалтер",            department: "admin",     color: "#64748b" },
  logist:         { label: "Логіст",               department: "logistics", color: "#06b6d4" },
  warehouse:      { label: "Складівник",           department: "logistics", color: "#84cc16" },
} as const;

export type RoleKey = keyof typeof ROLES;

export const DEPARTMENTS = {
  admin:     { label: "Адміністрація", icon: "Crown" },
  sales:     { label: "Продажі",      icon: "ShoppingBag" },
  marketing: { label: "Маркетинг",    icon: "Megaphone" },
  tech:      { label: "Технології",   icon: "Code" },
  logistics: { label: "Логістика",    icon: "Truck" },
} as const;

export type DepartmentKey = keyof typeof DEPARTMENTS;

export const KPI_PRESETS: Record<string, string[]> = {
  sales_manager: ["Замовлень оброблено", "Середній чек", "Конверсія дзвінків"],
  content:       ["Описів написано", "Банерів створено", "Постів опубліковано"],
  developer:     ["Задач закрито", "Багів виправлено", "Фіч доставлено"],
  logist:        ["Відправлень", "Повернень оброблено", "Час обробки (хв)"],
  seo:           ["Позицій в TOP-10", "Органічний трафік", "Сторінок оптимізовано"],
  marketer:      ["Кампаній запущено", "CTR", "ROI рекламних витрат"],
  designer:      ["Макетів створено", "Банерів", "Ітерацій"],
};
