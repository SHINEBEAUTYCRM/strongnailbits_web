"use client";

import { useState, useEffect } from "react";

export interface NavItem {
  id: string;
  label_uk: string;
  label_ru: string | null;
  item_type: string;
  resolved_url: string;
  target: string;
  icon: string | null;
  badge_text: string | null;
  badge_color: string | null;
  category_slug: string | null;
  category_name_uk: string | null;
  product_count: number | null;
  children: NavItem[];
}

const _cache: Record<string, NavItem[]> = {};
const _promises: Record<string, Promise<NavItem[]> | undefined> = {};

function fetchNav(menu: string): Promise<NavItem[]> {
  if (_cache[menu]) return Promise.resolve(_cache[menu]);
  if (_promises[menu]) return _promises[menu];

  const p = fetch(`/api/navigation?menu=${menu}`)
    .then((r) => r.json())
    .then((data) => {
      _cache[menu] = data;
      return data;
    });

  _promises[menu] = p;
  return p;
}

export function useNavigation(menu: string = "header"): NavItem[] {
  const [items, setItems] = useState<NavItem[]>(_cache[menu] ?? []);

  useEffect(() => {
    fetchNav(menu).then(setItems);
  }, [menu]);

  return items;
}
