"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PageForm from "../PageForm";

export default function NewPageCmsPage() {
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
          Нова сторінка
        </h1>
      </div>
      <PageForm mode="new" />
    </div>
  );
}
