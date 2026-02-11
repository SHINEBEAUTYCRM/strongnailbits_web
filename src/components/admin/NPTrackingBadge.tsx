"use client";

import { useState } from "react";
import { Package, ExternalLink, Loader2 } from "lucide-react";

interface TrackingInfo {
  ttn: string;
  statusLabel: string;
  statusEmoji: string;
  stage: string;
  cityRecipient: string;
  scheduledDate: string;
  actualDate: string;
}

interface Props {
  ttn: string;
}

/**
 * Inline tracking badge for admin orders table.
 * Click to expand and see NP status.
 */
export function NPTrackingBadge({ ttn }: Props) {
  const [info, setInfo] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function loadTracking() {
    if (info) {
      setOpen(!open);
      return;
    }

    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch(`/api/nova-poshta/tracking?ttn=${ttn}`);
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const npUrl = `https://novaposhta.ua/tracking/?cargo_number=${ttn}`;

  return (
    <div className="relative">
      <button
        onClick={loadTracking}
        className="group flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-mono transition-colors hover:bg-[#1a1a2e]"
        style={{ color: "#71717a" }}
      >
        <Package size={10} className="shrink-0" style={{ color: "#a855f7" }} />
        ТТН: {ttn}
        {loading && <Loader2 size={10} className="animate-spin" />}
      </button>

      {open && info && (
        <div
          className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl p-3 shadow-xl"
          style={{ background: "#0e0e14", border: "1px solid #1e1e2a" }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs font-medium" style={{ color: "#e4e4e7" }}>
                {info.statusEmoji} {info.statusLabel}
              </p>
              {info.cityRecipient && (
                <p className="mt-1 text-[11px]" style={{ color: "#71717a" }}>
                  {info.cityRecipient}
                </p>
              )}
              {info.scheduledDate && (
                <p className="mt-0.5 text-[11px]" style={{ color: "#52525b" }}>
                  Очікувана: {info.scheduledDate}
                </p>
              )}
              {info.actualDate && (
                <p className="mt-0.5 text-[11px]" style={{ color: "#4ade80" }}>
                  Отримано: {info.actualDate}
                </p>
              )}
            </div>
            <a
              href={npUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[#1a1a2e]"
              style={{ color: "#71717a" }}
              title="Відкрити на сайті НП"
            >
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
