"use client";

// ================================================================
//  BannersList — Grid-список банерів з фільтрами
// ================================================================

import { useEffect } from 'react';
import { useBannersStore } from '@/store/banners-store';
import { BannerCard } from './BannerCard';
import { Loader2, ImageIcon, Image, Megaphone, LayoutGrid, PanelRight, MessageSquare, Smartphone } from 'lucide-react';
import type { BannerType } from '@/types/banners';
import { BANNER_TYPE_OPTIONS, getBannerStatus } from '@/types/banners';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  image: Image,
  megaphone: Megaphone,
  'layout-grid': LayoutGrid,
  'panel-right': PanelRight,
  'message-square': MessageSquare,
  smartphone: Smartphone,
};

// ----------------------------------------------------------------
//  Filter config
// ----------------------------------------------------------------

type StatusFilterValue = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const STATUS_TABS: { value: StatusFilterValue; label: string }[] = [
  { value: 'all',       label: 'Всі' },
  { value: 'active',    label: 'Активні' },
  { value: 'scheduled', label: 'Заплановані' },
  { value: 'expired',   label: 'Завершені' },
  { value: 'inactive',  label: 'Неактивні' },
];

// ----------------------------------------------------------------
//  Component
// ----------------------------------------------------------------

interface BannersListProps {
  initialType?: string;
}

export function BannersList({ initialType }: BannersListProps) {
  const banners = useBannersStore((s) => s.banners);
  const isLoading = useBannersStore((s) => s.isLoading);
  const filter = useBannersStore((s) => s.filter);
  const fetchBanners = useBannersStore((s) => s.fetchBanners);
  const setTypeFilter = useBannersStore((s) => s.setTypeFilter);
  const setStatusFilter = useBannersStore((s) => s.setStatusFilter);
  const deleteBanner = useBannersStore((s) => s.deleteBanner);
  const duplicateBanner = useBannersStore((s) => s.duplicateBanner);
  const toggleActive = useBannersStore((s) => s.toggleActive);

  // Apply initialType filter from URL on mount, then fetch
  useEffect(() => {
    if (initialType && BANNER_TYPE_OPTIONS.some((o) => o.value === initialType)) {
      setTypeFilter(initialType as BannerType);
    } else {
      fetchBanners();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Local status filter ────────────────────────────
  const filtered =
    filter.status === 'all'
      ? banners
      : banners.filter((b) => getBannerStatus(b) === filter.status);

  // ── Handlers ───────────────────────────────────────
  const handleDuplicate = (id: string) => {
    duplicateBanner(id).catch(() => {});
  };

  const handleDelete = (id: string) => {
    if (!confirm('Видалити цей банер?')) return;
    deleteBanner(id).catch(() => {});
  };

  const handleToggleActive = (id: string, active: boolean) => {
    toggleActive(id, active).catch(() => {});
  };

  return (
    <div className="space-y-6">
      {/* ── Type filter tabs ──────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        <TabButton
          active={filter.type === 'all'}
          onClick={() => setTypeFilter('all')}
        >
          Всі
        </TabButton>
        {BANNER_TYPE_OPTIONS.map((opt) => {
          const Icon = ICON_MAP[opt.icon];
          return (
            <TabButton
              key={opt.value}
              active={filter.type === opt.value}
              onClick={() => setTypeFilter(opt.value)}
            >
              {Icon && <Icon size={13} className="mr-1 opacity-60" />}
              {opt.label}
            </TabButton>
          );
        })}
      </div>

      {/* ── Status filter tabs ────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
        {STATUS_TABS.map((tab) => (
          <TabButton
            key={tab.value}
            active={filter.status === tab.value}
            onClick={() => setStatusFilter(tab.value)}
          >
            {tab.label}
            {tab.value !== 'all' && (
              <span className="ml-1 text-[10px] opacity-50">
                {banners.filter((b) =>
                  tab.value === 'all' ? true : getBannerStatus(b) === tab.value
                ).length}
              </span>
            )}
          </TabButton>
        ))}
      </div>

      {/* ── Loading ───────────────────────────────────── */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
        </div>
      )}

      {/* ── Empty state ───────────────────────────────── */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-500 gap-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center">
            <ImageIcon className="w-6 h-6" />
          </div>
          <p className="text-sm">Немає банерів</p>
          <p className="text-xs text-zinc-600">
            Створіть перший банер, натиснувши кнопку вище
          </p>
        </div>
      )}

      {/* ── Grid ──────────────────────────────────────── */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((banner) => (
            <BannerCard
              key={banner.id}
              banner={banner}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ================================================================
//  TabButton — internal reusable tab
// ================================================================

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function TabButton({ active, onClick, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={[
        'relative flex items-center gap-0.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
        active
          ? 'text-white bg-white/[0.06]'
          : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]',
      ].join(' ')}
    >
      {children}
      {/* Active indicator — purple gradient underline */}
      {active && (
        <span className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-500" />
      )}
    </button>
  );
}
