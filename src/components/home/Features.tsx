import {
  Truck,
  Banknote,
  ShieldCheck,
  Phone as PhoneIcon,
  Heart,
  Star,
  Clock,
  Gift,
  RotateCcw,
  Zap,
  Award,
  CheckCircle,
  Lock,
  Headphones,
  MapPin,
  CreditCard,
  Package,
  ThumbsUp,
  Smile,
  Shield,
  Percent,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { SiteFeature } from "@/lib/site-settings";

const ICON_MAP: Record<string, LucideIcon> = {
  truck: Truck,
  banknote: Banknote,
  "shield-check": ShieldCheck,
  phone: PhoneIcon,
  heart: Heart,
  star: Star,
  clock: Clock,
  gift: Gift,
  "rotate-ccw": RotateCcw,
  zap: Zap,
  award: Award,
  "check-circle": CheckCircle,
  lock: Lock,
  headphones: Headphones,
  "map-pin": MapPin,
  "credit-card": CreditCard,
  package: Package,
  "thumbs-up": ThumbsUp,
  smile: Smile,
  shield: Shield,
  percent: Percent,
};

const DEFAULT_FEATURES: SiteFeature[] = [
  {
    icon: "truck",
    title: "Безкоштовна доставка",
    desc: "Від 3 000 ₴ по Україні",
    color: "#D6264A",
    bg: "rgba(214, 38, 74, 0.06)",
  },
  {
    icon: "percent",
    title: "Оптові ціни",
    desc: "Від 1-ї одиниці для B2B",
    color: "#8B5CF6",
    bg: "rgba(139, 92, 246, 0.06)",
  },
  {
    icon: "shield-check",
    title: "100% оригінал",
    desc: "Сертифікати на все",
    color: "#008040",
    bg: "rgba(0, 128, 64, 0.06)",
  },
  {
    icon: "headphones",
    title: "Підтримка",
    desc: "Щодня 9:00 — 21:00",
    color: "#FF9500",
    bg: "rgba(255, 149, 0, 0.06)",
  },
];

interface FeaturesProps {
  features?: SiteFeature[];
}

export function Features({ features }: FeaturesProps = {}) {
  const items = features ?? DEFAULT_FEATURES;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((f) => {
        const Icon = ICON_MAP[f.icon] ?? Star;
        return (
          <div
            key={f.title}
            className="flex items-start gap-3.5 rounded-2xl bg-white p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.08)]"
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ background: f.bg || `${f.color}10`, color: f.color }}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#1a1a1a]">
                {f.title}
              </h3>
              <p className="mt-0.5 text-[12px] text-[#6b6b7b]">{f.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
