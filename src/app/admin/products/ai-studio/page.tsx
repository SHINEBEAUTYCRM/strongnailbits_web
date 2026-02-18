import { createAdminClient } from "@/lib/supabase/admin";
import { AiStudioClient } from "@/components/admin/ai-studio/AiStudioClient";

export default async function AiStudioPage() {
  const supabase = createAdminClient();

  const [{ data: brands }, { data: categories }] = await Promise.all([
    supabase.from("brands").select("id, name").order("name"),
    supabase.from("categories").select("id, name_uk").eq("status", "active").order("name_uk"),
  ]);

  return (
    <AiStudioClient
      brands={(brands || []).map(b => ({ id: b.id, name: b.name }))}
      categories={(categories || []).map(c => ({ id: c.id, name: c.name_uk }))}
    />
  );
}
