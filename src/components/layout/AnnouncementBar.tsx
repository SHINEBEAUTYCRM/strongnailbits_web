import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="announcement-bar-holo py-3.5 text-[14.5px] font-semibold tracking-wide">
      <div className="relative z-[2] flex items-center justify-center gap-2">
        <Truck size={18} className="shrink-0 opacity-65" />
        <span>
          Безкоштовно доставимо при замовленні від{" "}
          <span className="font-semibold" style={{ fontFamily: 'var(--font-jetbrains), "JetBrains Mono", monospace' }}>1900 грн</span>
        </span>
      </div>
    </div>
  );
}
