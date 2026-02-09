import { FolderTree } from "lucide-react";
import { getCategories } from "@/lib/admin/data";
import { CategoryTable } from "./CategoryTable";

type Cat = { id: string; cs_cart_id: number; parent_cs_cart_id: number | null; name_uk: string; slug: string; status: string; product_count: number; position: number; description_uk: string | null; image_url: string | null };

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}>
            <FolderTree className="w-6 h-6" style={{ color: "#a855f7" }} />Категорії
          </h1>
          <p className="text-sm" style={{ color: "#52525b" }}>
            {categories.length} категорій · {categories.filter((c) => c.status === "active").length} активних
          </p>
        </div>
      </div>
      <CategoryTable categories={categories as Cat[]} />
    </div>
  );
}
