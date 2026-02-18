import Link from "next/link";
import {
  Truck, Banknote, ShieldCheck, Phone, Heart, Star, Clock, Gift,
  RotateCcw, Zap, Award, CheckCircle, Lock, Headphones, MapPin,
  CreditCard, Package, ThumbsUp, Smile, Shield,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Lang } from "@/lib/language";

const ICON_MAP: Record<string, LucideIcon> = {
  Truck, Banknote, ShieldCheck, Phone, Heart, Star, Clock, Gift,
  RotateCcw, Zap, Award, CheckCircle, Lock, Headphones, MapPin,
  CreditCard, Package, ThumbsUp, Smile, Shield,
};

interface Feature {
  id: string;
  title_uk: string;
  title_ru: string | null;
  description_uk: string | null;
  description_ru: string | null;
  icon: string | null;
  color: string | null;
  link_url: string | null;
}

interface Props {
  items: Feature[];
  lang: Lang;
}

export function FeaturesDynamic({ items, lang }: Props) {
  if (items.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => {
        const Icon = ICON_MAP[f.icon || "Star"] || Star;
        const title = lang === "ru" ? (f.title_ru || f.title_uk) : f.title_uk;
        const desc = lang === "ru" ? (f.description_ru || f.description_uk) : f.description_uk;
        const color = f.color || "#D6264A";

        const content = (
          <div className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `${color}10`, color }}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#1a1a1a]">{title}</h3>
              {desc && <p className="mt-0.5 text-[12px] text-[#6b6b7b]">{desc}</p>}
            </div>
          </div>
        );

        return f.link_url ? (
          <Link key={f.id} href={f.link_url}>
            {content}
          </Link>
        ) : (
          <div key={f.id}>{content}</div>
        );
      })}
    </div>
  );
}
