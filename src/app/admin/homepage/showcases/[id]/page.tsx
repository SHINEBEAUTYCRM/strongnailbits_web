import { notFound } from "next/navigation";
import { getShowcaseById } from "@/lib/admin/data";
import { ShowcaseForm } from "../ShowcaseForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ShowcaseEditPage({ params }: Props) {
  const { id } = await params;

  if (id === "new") {
    return <ShowcaseForm />;
  }

  const showcase = await getShowcaseById(id);
  if (!showcase) return notFound();

  return <ShowcaseForm initial={showcase} />;
}
