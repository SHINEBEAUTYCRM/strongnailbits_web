"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FileText, Search, Plus, Pencil, Trash2, Loader2 } from "lucide-react";

interface PageItem {
  id: string;
  title_uk: string;
  title_ru: string | null;
  slug: string;
  status: string;
  template: string;
  position: number;
  published_at: string | null;
  updated_at: string | null;
  created_at: string | null;
}

type StatusFilter = "all" | "draft" | "published" | "archived";

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  published: { label: "Published", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  draft: { label: "Draft", color: "#eab308", bg: "rgba(234,179,8,0.12)" },
  archived: { label: "Archived", color: "#9ca3af", bg: "rgba(156,163,175,0.12)" },
};

export default function PagesCmsPage() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (statusFilter !== "all") sp.set("status", statusFilter);
      if (search.trim()) sp.set("search", search.trim());
      const res = await fetch(`/api/admin/pages-cms?${sp}`);
      const json = await res.json();
      setPages(json.pages ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Видалити сторінку "${title}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/admin/pages-cms/${id}`, { method: "DELETE" });
      setPages((prev) => prev.filter((p) => p.id !== id));
    } catch {
      /* ignore */
    } finally {
      setDeleting(null);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("uk-UA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText size={22} style={{ color: "var(--a-accent)" }} />
          <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>
            Сторінки
          </h1>
        </div>
        <Link
          href="/admin/pages-cms/new"
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: "var(--a-accent)" }}
        >
          <Plus size={16} />
          Нова сторінка
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1" style={{ minWidth: 200, maxWidth: 360 }}>
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--a-text-secondary)" }}
          />
          <input
            type="text"
            placeholder="Пошук за назвою або slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border pl-9 pr-3 text-sm outline-none"
            style={{
              borderColor: "var(--a-border)",
              background: "var(--a-card)",
              color: "var(--a-text)",
            }}
          />
        </div>

        <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "var(--a-bg)" }}>
          {(["all", "draft", "published", "archived"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: statusFilter === s ? "var(--a-card)" : "transparent",
                color: statusFilter === s ? "var(--a-text)" : "var(--a-text-secondary)",
              }}
            >
              {s === "all" ? "Всі" : STATUS_BADGE[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div
        className="overflow-hidden rounded-xl border"
        style={{ borderColor: "var(--a-border)", background: "var(--a-card)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--a-accent)" }} />
          </div>
        ) : pages.length === 0 ? (
          <div className="py-12 text-center text-sm" style={{ color: "var(--a-text-secondary)" }}>
            Сторінок не знайдено
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--a-border)" }}>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
                  Назва
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
                  Статус
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
                  Оновлено
                </th>
                <th className="w-24 px-4 py-3 text-right text-xs font-medium" style={{ color: "var(--a-text-secondary)" }}>
                  Дії
                </th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const badge = STATUS_BADGE[page.status];
                return (
                  <tr
                    key={page.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--a-border)" }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pages-cms/${page.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--a-text)" }}
                      >
                        {page.title_uk}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--a-text-secondary)" }}>
                      <code className="text-xs">{page.slug}</code>
                    </td>
                    <td className="px-4 py-3">
                      {badge && (
                        <span
                          className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                          style={{ color: badge.color, background: badge.bg }}
                        >
                          {badge.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--a-text-secondary)" }}>
                      {formatDate(page.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/admin/pages-cms/${page.id}`}
                          className="rounded-md p-1.5 transition-colors hover:opacity-80"
                          style={{ color: "var(--a-text-secondary)" }}
                        >
                          <Pencil size={14} />
                        </Link>
                        <button
                          onClick={() => handleDelete(page.id, page.title_uk)}
                          disabled={deleting === page.id}
                          className="rounded-md p-1.5 transition-colors hover:opacity-80"
                          style={{ color: "#ef4444" }}
                        >
                          {deleting === page.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
