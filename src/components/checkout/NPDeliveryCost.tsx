"use client";

import { useState, useEffect, useRef } from "react";
import { Truck, Loader2, Calendar } from "lucide-react";

interface Props {
  cityRef: string;
  serviceType: "WarehouseWarehouse" | "WarehouseDoors";
  weight: number;
  cost: number;
}

interface DeliveryInfo {
  cost: number;
  estimatedDate: string;
}

export function NPDeliveryCost({ cityRef, serviceType, weight, cost }: Props) {
  const [info, setInfo] = useState<DeliveryInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const prevRef = useRef("");

  useEffect(() => {
    if (!cityRef) {
      setInfo(null);
      return;
    }

    const key = `${cityRef}-${serviceType}-${weight}-${cost}`;
    if (key === prevRef.current) return;
    prevRef.current = key;

    let cancelled = false;
    setLoading(true);

    fetch("/api/nova-poshta/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityRecipientRef: cityRef,
        weight: weight || 1,
        cost: cost || 300,
        serviceType,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.cost) {
          setInfo({ cost: data.cost, estimatedDate: data.estimatedDate });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [cityRef, serviceType, weight, cost]);

  if (!cityRef) return null;

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-sand/30 px-4 py-3">
        <Loader2 size={14} className="animate-spin text-coral" />
        <span className="text-xs text-[var(--t2)]">Розраховуємо вартість доставки...</span>
      </div>
    );
  }

  if (!info) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-coral/20 bg-gradient-to-r from-coral/5 to-transparent px-4 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-coral/10">
        <Truck size={16} className="text-coral" />
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-0.5">
        <span className="text-sm font-semibold text-dark">
          {info.cost} ₴
        </span>
        {info.estimatedDate && (
          <span className="flex items-center gap-1 text-[11px] text-[var(--t2)]">
            <Calendar size={10} />
            {info.estimatedDate}
          </span>
        )}
      </div>
    </div>
  );
}
