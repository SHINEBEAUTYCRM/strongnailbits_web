"use client";

// ================================================================
//  IntegrationCard — Картка сервісу інтеграції
// ================================================================

import { IntegrationStatus } from "./IntegrationStatus";
import type { ServiceDefinition, IntegrationStatusItem } from "@/lib/integrations/types";
import {
  BarChart3, Tags, MousePointerClick, Eye, ShoppingCart, PieChart,
  MapPin, Send, Bell, Landmark, TrendingDown, Megaphone, Target,
  Clapperboard, SearchCheck, Mail, MessageSquare, Brain, ImagePlus,
  Store, ShoppingBag, Flame, Handshake, Sparkles, Wand2, Palette,
  Radar, Bug, Link, PenTool, Brush, CreditCard, Banknote, Wallet,
  Truck, ExternalLink, Heart, Star, Building2, ShieldCheck, Split,
  ArrowLeftRight, BarChart, Route, FlaskConical, Search, Facebook,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Map icon string → component
const ICON_MAP: Record<string, LucideIcon> = {
  BarChart3, Tags, MousePointerClick, Eye, ShoppingCart, PieChart,
  MapPin, Send, Bell, Landmark, TrendingDown, Megaphone, Target,
  Clapperboard, SearchCheck, Mail, MessageSquare, Brain, ImagePlus,
  Store, ShoppingBag, Flame, Handshake, Sparkles, Wand2, Palette,
  Radar, Bug, Link, PenTool, Brush, CreditCard, Banknote, Wallet,
  Truck, ExternalLink, Heart, Star, Building2, ShieldCheck, Split,
  ArrowLeftRight, BarChart, Route, FlaskConical, Search, Facebook,
};

interface IntegrationCardProps {
  service: ServiceDefinition;
  status?: IntegrationStatusItem;
  onClick: () => void;
}

export function IntegrationCard({ service, status, onClick }: IntegrationCardProps) {
  const Icon = ICON_MAP[service.icon] || BarChart3;
  const isRequired = service.isRequired;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl bg-[var(--a-bg-card)] border border-[var(--a-border)] hover:border-[var(--a-border)] transition-all group"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-lg bg-[var(--a-bg-hover)] flex items-center justify-center flex-shrink-0 group-hover:bg-purple-500/10 transition-colors">
          <Icon className="w-4.5 h-4.5 text-[var(--a-text-2)] group-hover:text-purple-400 transition-colors" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-medium text-[var(--a-text)] truncate">{service.name}</h3>
            {isRequired && (
              <span className="text-[9px] px-1 py-0.5 rounded bg-purple-500/20 text-purple-300 font-medium flex-shrink-0">
                REC
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--a-text-3)] line-clamp-2 mb-2">{service.description}</p>

          <div className="flex items-center justify-end">
            <IntegrationStatus
              isActive={status?.isActive ?? false}
              isVerified={status?.isVerified ?? false}
              hasConfig={status?.hasConfig ?? false}
              errorMessage={status?.errorMessage}
            />
          </div>
        </div>
      </div>
    </button>
  );
}
