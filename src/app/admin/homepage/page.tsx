import { Home } from "lucide-react";
import { getHomepageSections, getShowcases } from "@/lib/admin/data";
import { HomepageSectionsClient } from "./HomepageSectionsClient";

export default async function HomepagePage() {
  const [sections, showcases] = await Promise.all([
    getHomepageSections(),
    getShowcases(),
  ]);
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Home className="w-6 h-6" style={{ color: "var(--a-accent-btn)" }} />
        <div>
          <h1 className="text-xl font-semibold" style={{ color: "var(--a-text)" }}>Головна сторінка</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--a-text-4)" }}>Порядок і видимість секцій. Стрілками змінюйте порядок.</p>
        </div>
      </div>
      <HomepageSectionsClient initialSections={sections} showcases={showcases || []} />
    </div>
  );
}
