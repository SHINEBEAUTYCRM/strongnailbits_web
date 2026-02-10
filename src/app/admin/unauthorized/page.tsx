"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldX, Clock, ArrowLeft, LogIn } from "lucide-react";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const isPending = searchParams.get("reason") === "pending";

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
      <div className="text-center max-w-md mx-4">
        {isPending ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#422006", border: "1px solid #854d0e" }}>
              <Clock className="w-8 h-8" style={{ color: "#fbbf24" }} />
            </div>
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>Очікує підтвердження</h1>
            <p className="text-sm mb-6" style={{ color: "#52525b" }}>
              Ваш акаунт зареєстровано, але ще не підтверджено адміністратором.<br />
              Зверніться до власника для отримання доступу.
            </p>
          </>
        ) : (
          <>
            <ShieldX className="w-16 h-16 mx-auto mb-4" style={{ color: "#ef4444" }} />
            <h1 className="text-xl font-semibold mb-2" style={{ color: "#f4f4f5" }}>Доступ заборонено</h1>
            <p className="text-sm mb-6" style={{ color: "#52525b" }}>
              У вас немає прав для перегляду адмін-панелі.<br />
              Зверніться до адміністратора.
            </p>
          </>
        )}
        <div className="flex gap-3 justify-center">
          <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: "#141420", color: "#a1a1aa", border: "1px solid #1e1e2a" }}>
            <ArrowLeft className="w-4 h-4" /> На головну
          </Link>
          <Link href="/admin/login" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ background: "#7c3aed" }}>
            <LogIn className="w-4 h-4" /> Увійти
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminUnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "#08080c" }}>
        <ShieldX className="w-16 h-16" style={{ color: "#ef4444" }} />
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
