import { Search } from "lucide-react";
import { SeoDashboard } from "./SeoDashboard";

export default function SeoPage() {
  return (
    <div>
      <div className="mb-6">
        <h1
          className="text-2xl font-semibold mb-1 flex items-center gap-3"
          style={{ color: "var(--a-text)" }}
        >
          <Search className="w-6 h-6" style={{ color: "var(--a-accent)" }} />
          SEO Аналітика
        </h1>
        <p className="text-sm" style={{ color: "var(--a-text-4)" }}>
          Serpstat · Позиції, ключові слова, конкуренти, топ-сторінки
        </p>
      </div>
      <SeoDashboard />
    </div>
  );
}
