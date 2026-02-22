import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="announcement-bar-holo announcement-bar">
      <div className="relative z-[2] flex items-center justify-center announcement-bar-inner">
        <Truck className="shrink-0 opacity-65 announcement-bar-icon" />
        <span className="whitespace-nowrap">
          Безкоштовно доставимо при замовленні від{" "}
          <span className="announcement-bar-sum">1900 грн</span>
        </span>
      </div>
    </div>
  );
}
