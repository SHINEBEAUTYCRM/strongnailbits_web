"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red/10">
        <AlertTriangle size={36} className="text-red" />
      </div>

      <div>
        <h1 className="font-unbounded text-2xl font-black text-dark">
          Щось пішло не так
        </h1>
        <p className="mt-2 max-w-md text-sm text-[var(--t2)]">
          Виникла помилка при завантаженні сторінки. Спробуйте оновити або
          поверніться на головну.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-pill bg-coral px-6 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral"
        >
          <RefreshCw size={14} />
          Спробувати ще раз
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-pill border border-[var(--border)] bg-white px-6 py-2.5 text-[13px] font-medium text-[var(--t2)] transition-all hover:border-dark hover:text-dark"
        >
          <Home size={14} />
          На головну
        </Link>
      </div>
    </div>
  );
}
