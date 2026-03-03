import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPageBySlug } from "@/lib/admin/pages-cms";
import { getLanguage } from "@/lib/language-server";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return { title: "Сторінка не знайдена" };
  return {
    title: page.meta_title_uk || page.title_uk,
    description: page.meta_description_uk || null,
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) notFound();

  const lang = await getLanguage();
  const title = lang === "ru" ? (page.title_ru || page.title_uk) : page.title_uk;
  const content = lang === "ru" ? (page.content_ru || page.content_uk) : page.content_uk;

  return (
    <div className="mx-auto max-w-[800px] px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-unbounded text-2xl font-black text-dark sm:text-3xl">
        {title}
      </h1>
      {content && (
        <div
          className="prose prose-sm mt-6 max-w-none text-[var(--t)]"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      )}
    </div>
  );
}
