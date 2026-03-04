"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { FeatureForm } from "../FeatureForm";

export default function EditAttributePage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/features/${id}`);
        if (!res.ok) throw new Error("Not found");
        const json = await res.json();
        setData(json);
      } catch {
        setError("Характеристику не знайдено");
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-xl animate-pulse"
            style={{ background: "var(--a-bg-card)" }}
          />
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="text-center py-16 rounded-xl"
        style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
      >
        <SlidersHorizontal className="w-8 h-8 mx-auto mb-3" style={{ color: "var(--a-text-5)" }} />
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>{error}</p>
      </div>
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const variants = Array.isArray((data as any).variants)
    ? (data as any).variants.map((v: any) => ({
        id: v.id,
        cs_cart_id: v.cs_cart_id,
        name_uk: v.name_uk || "",
        name_ru: v.name_ru || "",
        color_code: v.color_code || "",
        position: v.position ?? 0,
        metadata: v.metadata || {},
      }))
    : [];

  return (
    <FeatureForm
      isNew={false}
      initial={{
        id: data.id as string,
        name_uk: (data.name_uk as string) || "",
        name_ru: (data.name_ru as string) || "",
        slug: (data.handle as string) || "",
        feature_type: (data.feature_type as string) || "T",
        is_filter: !!data.is_filter,
        filter_position: (data.filter_position as number) || 0,
        status: (data.status as string) || "active",
        variants,
        products_count: (data.products_count as number) || 0,
      }}
    />
  );
}
