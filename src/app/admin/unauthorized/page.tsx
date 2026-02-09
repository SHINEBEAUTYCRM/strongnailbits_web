import Link from "next/link";
import { ShieldX, ArrowLeft, LogIn } from "lucide-react";

export default function AdminUnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
          <ShieldX className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2">
          Доступ заборонено
        </h1>
        <p className="text-[#888] text-sm mb-8">
          У вас немає прав для доступу до адмін-панелі. Зверніться до
          адміністратора.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all duration-150"
          >
            <ArrowLeft className="w-4 h-4" />
            На головну
          </Link>
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 transition-all duration-150"
          >
            <LogIn className="w-4 h-4" />
            Інший акаунт
          </Link>
        </div>
      </div>
    </div>
  );
}
