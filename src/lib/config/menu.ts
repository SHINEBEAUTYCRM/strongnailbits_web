/* ------------------------------------------------------------------ */
/*  Main navigation menu config                                       */
/*  Matches the menu structure of strongnailbits.com.ua                   */
/*  Edit this file to change the top navigation bar items.            */
/* ------------------------------------------------------------------ */

export interface MenuItemLink {
  type: "link";
  label: string;
  href: string;
  highlight?: boolean;
}

export interface MenuItemCategory {
  type: "category";
  label: string;
  /** CS-Cart category_id — used to find the node in the category tree */
  csCartId: number;
  /** Fallback slug if the category is not found in the tree */
  fallbackSlug: string;
}

export type MenuItem = MenuItemLink | MenuItemCategory;

/**
 * Main menu items — displayed in the horizontal bar (desktop)
 * and as first-level items in the mobile menu.
 *
 * Some of these are subcategories of "Ногти" in CS-Cart,
 * but elevated to root level for navigation (standard e-commerce practice).
 */
export const MAIN_MENU_ITEMS: MenuItem[] = [
  { type: "link", label: "Sale", href: "/sale", highlight: true },
  { type: "link", label: "Бренди", href: "/brands" },
  { type: "category", label: "Ногті", csCartId: 385, fallbackSlug: "nohty" },
  { type: "category", label: "Гель-лаки", csCartId: 374, fallbackSlug: "hel-laky-374" },
  { type: "category", label: "Бази", csCartId: 821, fallbackSlug: "bazy" },
  { type: "category", label: "Топи", csCartId: 822, fallbackSlug: "topy" },
  { type: "category", label: "Для обличчя і тіла", csCartId: 544, fallbackSlug: "ukhod-za-lytsom-y-telom-544" },
  { type: "category", label: "Брови і вії", csCartId: 640, fallbackSlug: "brovy-y-resnytsy-640" },
  { type: "category", label: "Депіляція", csCartId: 567, fallbackSlug: "depylyatsyya-567" },
  { type: "category", label: "Меблі/обладнання", csCartId: 651, fallbackSlug: "ynterer-mebel-aksessuary-dlya-salona-y-mastera-651" },
  { type: "category", label: "Одноразова продукція", csCartId: 315, fallbackSlug: "odnorazovaya-produktsyya-315" },
  { type: "category", label: "Техніка", csCartId: 319, fallbackSlug: "tekhnyka-dlya-manykyura-y-pedykyura-319" },
  { type: "category", label: "Ulka", csCartId: 776, fallbackSlug: "ulka-776" },
  { type: "category", label: "МініОпт", csCartId: 794, fallbackSlug: "mynyopt" },
];
