"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SearchError]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red/10">
          <AlertTriangle size={28} className="text-red" />
        </div>
        <h1 className="font-unbounded text-xl font-bold text-dark">
          Помилка пошуку
        </h1>
        <p className="max-w-md text-sm text-[var(--t2)]">
          Не вдалося виконати пошук. Спробуйте ще раз.
        </p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-pill bg-coral px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-coral-2"
          >
            <RefreshCw size={14} />
            Спробувати ще
          </button>
          <Link
            href="/catalog"
            className="rounded-pill border border-[var(--border)] bg-white px-5 py-2.5 text-[13px] font-medium text-[var(--t2)] hover:border-dark hover:text-dark"
          >
            До каталогу
          </Link>
        </div>
      </div>
    </div>
  );
}
