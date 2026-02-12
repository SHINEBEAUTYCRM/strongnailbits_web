"use client";

import { create } from 'zustand';
import type { Banner, BannerType } from '@/types/banners';

interface BannersState {
  banners: Banner[];
  isLoading: boolean;
  filter: {
    type: BannerType | 'all';
    status: 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';
  };
  
  fetchBanners: () => Promise<void>;
  createBanner: (data: Partial<Banner>) => Promise<Banner>;
  updateBanner: (id: string, data: Partial<Banner>) => Promise<void>;
  deleteBanner: (id: string) => Promise<void>;
  duplicateBanner: (id: string) => Promise<Banner>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  reorderBanners: (type: BannerType, orderedIds: string[]) => Promise<void>;
  
  setTypeFilter: (type: BannerType | 'all') => void;
  setStatusFilter: (status: 'all' | 'active' | 'scheduled' | 'expired' | 'inactive') => void;
}

export const useBannersStore = create<BannersState>()((set, get) => ({
  banners: [],
  isLoading: false,
  filter: { type: 'all', status: 'all' },
  
  fetchBanners: async () => {
    set({ isLoading: true });
    try {
      const { type, status } = get().filter;
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      const res = await fetch(`/api/banners?${params}`);
      const data = await res.json();
      if (res.ok) set({ banners: data.banners ?? data ?? [] });
    } catch { /* ignore */ }
    set({ isLoading: false });
  },
  
  createBanner: async (data) => {
    const res = await fetch('/api/banners', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Помилка створення');
    await get().fetchBanners();
    return result.banner;
  },
  
  updateBanner: async (id, data) => {
    const res = await fetch(`/api/banners/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Помилка оновлення');
    }
    await get().fetchBanners();
  },
  
  deleteBanner: async (id) => {
    const res = await fetch(`/api/banners/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Помилка видалення');
    }
    set((s) => ({ banners: s.banners.filter((b) => b.id !== id) }));
  },
  
  duplicateBanner: async (id) => {
    const banner = get().banners.find((b) => b.id === id);
    if (!banner) throw new Error('Банер не знайдено');
    const { id: _, created_at, updated_at, views_count, clicks_count, ...rest } = banner;
    return get().createBanner({ ...rest, title: `${rest.title} (копія)`, is_active: false });
  },
  
  toggleActive: async (id, isActive) => {
    await get().updateBanner(id, { is_active: isActive });
  },
  
  reorderBanners: async (type, orderedIds) => {
    const res = await fetch('/api/banners/reorder', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, orderedIds }),
    });
    if (!res.ok) throw new Error('Помилка сортування');
    await get().fetchBanners();
  },
  
  setTypeFilter: (type) => {
    set((s) => ({ filter: { ...s.filter, type } }));
    get().fetchBanners();
  },
  setStatusFilter: (status) => {
    set((s) => ({ filter: { ...s.filter, status } }));
    get().fetchBanners();
  },
}));
