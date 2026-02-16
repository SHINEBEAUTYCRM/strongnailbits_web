import { Gauge } from "lucide-react";
import { SpeedTest } from "./SpeedTest";

export default function PageSpeedPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold mb-1 flex items-center gap-3" style={{ color: "#f4f4f5" }}>
          <Gauge className="w-6 h-6" style={{ color: "#a855f7" }} />
          PageSpeed Insights
        </h1>
        <p className="text-sm" style={{ color: "#52525b" }}>
          Тест швидкості сайту через Google Lighthouse. Перевіряйте після кожного деплою.
        </p>
      </div>
      <SpeedTest />
    </div>
  );
}
