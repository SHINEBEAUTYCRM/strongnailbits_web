import { getQuickCategories, getCategoryList } from "@/lib/admin/data";
import { QuickCategoriesClient } from "./QuickCategoriesClient";
import { Layers } from "lucide-react";

export default async function QuickCategoriesPage() {
  const items = await getQuickCategories();
  const allCategories = await getCategoryList();
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Layers className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>
            Швидкі категорії
          </h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>
            Категорії, що відображаються на головній сторінці
          </p>
        </div>
      </div>
      <QuickCategoriesClient initialItems={items} allCategories={allCategories} />
    </div>
  );
}
