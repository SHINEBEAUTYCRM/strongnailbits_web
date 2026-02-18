"use client";

// ================================================================
//  BannerCard — Картка банера для grid-списку
// ================================================================

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Eye,
  MousePointerClick,
  Calendar,
  MapPin,
  Edit3,
  Copy,
  MoreHorizontal,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Image,
  Megaphone,
  LayoutGrid,
  PanelRight,
  MessageSquare,
  Smartphone,
} from 'lucide-react';
import { BannerStatusBadge } from './BannerStatusBadge';
import type { Banner, BannerType } from '@/types/banners';
import { BANNER_SIZES, getBannerStatus } from '@/types/banners';

// ----------------------------------------------------------------
//  Props
// ----------------------------------------------------------------

interface BannerCardProps {
  banner: Banner;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, active: boolean) => void;
}

// ----------------------------------------------------------------
//  Type icon map (Lucide icons)
// ----------------------------------------------------------------

const TYPE_ICONS: Record<BannerType, React.ComponentType<{ size?: number; className?: string }>> = {
  hero_slider: Image,
  promo_strip: Megaphone,
  category_banner: LayoutGrid,
  side_banner: PanelRight,
  popup: MessageSquare,
  stories: Smartphone,
};

// ----------------------------------------------------------------
//  Helpers
// ----------------------------------------------------------------

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// ----------------------------------------------------------------
//  Component
// ----------------------------------------------------------------

export function BannerCard({
  banner,
  onDuplicate,
  onDelete,
  onToggleActive,
}: BannerCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const status = getBannerStatus(banner);
  const size = BANNER_SIZES[banner.type];
  const aspectRatio = `${size.width} / ${size.height}`;
  const displayTitle = banner.heading || banner.title;
  const ctr =
    banner.views_count > 100
      ? ((banner.clicks_count / banner.views_count) * 100).toFixed(1)
      : null;

  return (
    <div className="group relative rounded-2xl border border-[var(--a-border)] bg-[var(--a-bg-card)] backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-purple-500/20 hover:shadow-[0_0_40px_rgba(168,85,247,0.06)]">
      {/* ── Image preview ─────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden bg-[var(--a-bg)]"
        style={{ aspectRatio }}
      >
        {banner.image_desktop ? (
          <img
            src={banner.image_desktop}
            alt={banner.image_alt || banner.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: banner.bg_color || '#16131e' }}
          >
            {(() => { const Icon = TYPE_ICONS[banner.type]; return <Icon size={40} className="opacity-30 text-[var(--a-text-2)]" />; })()}
          </div>
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a10] via-transparent to-transparent opacity-60" />
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── Content ───────────────────────────────────── */}
      <div className="p-4 space-y-3">
        {/* Status + type */}
        <div className="flex items-center gap-2 flex-wrap">
          <BannerStatusBadge banner={banner} />
          <span
            className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--a-bg-hover)] text-[var(--a-text-3)]"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {banner.type}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-sm font-medium text-[var(--a-text)] leading-snug line-clamp-2">
          {displayTitle}
        </h3>

        {/* Date range */}
        {(banner.starts_at || banner.ends_at) && (
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--a-text-3)]">
            <Calendar className="w-3 h-3 flex-shrink-0" />
            <span>
              {formatDate(banner.starts_at)} — {formatDate(banner.ends_at)}
            </span>
          </div>
        )}

        {/* Placement badges */}
        {banner.placement.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <MapPin className="w-3 h-3 text-[var(--a-text-3)] flex-shrink-0" />
            {banner.placement.slice(0, 3).map((p) => (
              <span
                key={p}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--a-bg-hover)] text-[var(--a-text-2)]"
              >
                {p}
              </span>
            ))}
            {banner.placement.length > 3 && (
              <span className="text-[10px] text-[var(--a-text-3)]">
                +{banner.placement.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Analytics row */}
        <div className="flex items-center gap-3 text-[11px] text-[var(--a-text-3)]">
          <span className="inline-flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {formatNumber(banner.views_count)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MousePointerClick className="w-3 h-3" />
            {formatNumber(banner.clicks_count)}
          </span>
          {ctr !== null && (
            <span className="text-purple-400 font-medium">
              CTR {ctr}%
            </span>
          )}
        </div>
      </div>

      {/* ── Divider ───────────────────────────────────── */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      {/* ── Actions ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5">
        {/* Edit link */}
        <Link
          href={`/admin/banners/${banner.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[var(--a-text-2)] hover:text-purple-400 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" />
          Редагувати
        </Link>

        <div className="flex items-center gap-1">
          {/* Duplicate */}
          <button
            onClick={() => onDuplicate(banner.id)}
            className="p-1.5 rounded-lg text-[var(--a-text-3)] hover:text-purple-400 hover:bg-[var(--a-bg-hover)] transition-all"
            title="Дублювати"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          {/* More menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-[var(--a-text-3)] hover:text-purple-400 hover:bg-[var(--a-bg-hover)] transition-all"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 bottom-full mb-1 z-50 w-44 rounded-xl border border-[var(--a-border)] bg-[var(--a-bg-card)] backdrop-blur-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150">
                <button
                  onClick={() => {
                    onToggleActive(banner.id, !banner.is_active);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-[var(--a-text-body)] hover:bg-[var(--a-bg-hover)] transition-colors"
                >
                  {banner.is_active ? (
                    <>
                      <ToggleLeft className="w-4 h-4 text-[var(--a-text-3)]" />
                      Деактивувати
                    </>
                  ) : (
                    <>
                      <ToggleRight className="w-4 h-4 text-green-500" />
                      Активувати
                    </>
                  )}
                </button>

                <div className="h-px bg-[var(--a-bg-hover)]" />

                <button
                  onClick={() => {
                    onDelete(banner.id);
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Видалити
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
