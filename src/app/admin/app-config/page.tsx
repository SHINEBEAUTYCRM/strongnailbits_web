import { createAdminClient } from "@/lib/supabase/admin";
import { Smartphone } from "lucide-react";
import { AppConfigForm } from "./AppConfigForm";

export default async function AppConfigPage() {
  const supabase = createAdminClient();
  const { data: configs } = await supabase
    .from("app_config")
    .select("*")
    .order("key");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3"
            style={{ color: "var(--a-text)" }}>
          <Smartphone className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
          Налаштування мобільного додатку
        </h1>
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
          Конфігурація StrongNailBits Mobile — зміни застосовуються миттєво
        </p>
      </div>
      <AppConfigForm configs={configs ?? []} />
    </div>
  );
}
