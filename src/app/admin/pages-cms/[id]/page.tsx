"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import PageForm from "../PageForm";

export default function EditPageCmsPage() {
  const params = useParams();
  const id = params.id as string;

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/pages-cms/${id}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Not found");
          return;
        }
        setData(json.page);
      } catch {
        setError("Помилка завантаження");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin" style={{ color: "var(--a-accent)" }} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-20 text-center text-sm" style={{ color: "var(--a-text-secondary)" }}>
        {error || "Сторінку не знайдено"}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/admin/pages-cms"
          className="rounded-lg p-1.5 transition-colors hover:opacity-80"
          style={{ color: "var(--a-text-secondary)" }}
        >
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>
          {(data.title_uk as string) || "Редагування сторінки"}
        </h1>
      </div>
      <PageForm
        mode="edit"
        initial={{
          id: data.id as string,
          title_uk: (data.title_uk as string) || "",
          title_ru: (data.title_ru as string) || "",
          slug: (data.slug as string) || "",
          content_uk: (data.content_uk as string) || "",
          content_ru: (data.content_ru as string) || "",
          meta_title_uk: (data.meta_title_uk as string) || "",
          meta_title_ru: (data.meta_title_ru as string) || "",
          meta_description_uk: (data.meta_description_uk as string) || "",
          meta_description_ru: (data.meta_description_ru as string) || "",
          status: (data.status as string) || "draft",
          template: (data.template as string) || "default",
          position: (data.position as number) ?? 0,
          published_at: data.published_at as string | null,
          created_at: data.created_at as string | null,
          updated_at: data.updated_at as string | null,
        }}
      />
    </div>
  );
}
