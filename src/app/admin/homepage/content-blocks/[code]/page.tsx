import { getContentBlock } from "@/lib/admin/data";
import { notFound } from "next/navigation";
import { ContentBlockForm } from "./ContentBlockForm";

export default async function ContentBlockPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const block = await getContentBlock(code);
  if (!block) return notFound();
  return <ContentBlockForm initial={block} />;
}
