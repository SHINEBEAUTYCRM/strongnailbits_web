"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Phone, User, Building2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [password, setPassword] = useState("");

  const phoneRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    phoneRef.current?.focus();
  }, []);

  function formatPhoneDisplay(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    if (digits.length <= 7)
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 5)}-${digits.slice(5)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 5)}-${digits.slice(5, 7)}-${digits.slice(7, 9)}`;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 9);
    setPhone(raw);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (phone.length < 9) {
      setError("Введіть повний номер телефону");
      return;
    }
    if (!firstName.trim()) {
      setError("Введіть ім'я");
      return;
    }
    if (!password || password.length < 6) {
      setError("Пароль повинен містити мінімум 6 символів");
      return;
    }

    setLoading(true);

    try {
      let digits = phone.replace(/\D/g, "");
      if (digits.length === 9) digits = "380" + digits;
      else if (digits.length === 10 && digits.startsWith("0")) digits = "38" + digits;
      const fullPhone = digits;

      const res = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: fullPhone,
          action: "register-direct",
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: company.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Помилка реєстрації");
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.loginEmail,
        password,
      });

      if (signInError) {
        setError("Акаунт створено, але автологін не вдався. Увійдіть вручну.");
        setLoading(false);
        return;
      }

      router.push("/account");
    } catch {
      setError("Помилка з'єднання. Спробуйте ще раз.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-12">
      <div className="w-full">
        <div className="mb-8 text-center">
          <h1 className="font-unbounded text-2xl font-black text-dark">
            Реєстрація
          </h1>
          <p className="mt-2 text-sm text-[var(--t2)]">
            Створіть акаунт для замовлень та знижок
          </p>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--t1)]">
                Номер телефону <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--t3)]" />
                <div className="absolute left-9 top-1/2 -translate-y-1/2 text-sm font-medium text-[var(--t1)]">
                  +380
                </div>
                <input
                  ref={phoneRef}
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneDisplay(phone)}
                  onChange={handlePhoneChange}
                  placeholder="(0XX) XX-XX-XX"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] py-3 pl-[5.5rem] pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            {/* First name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--t1)]">
                Ім&apos;я <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--t3)]" />
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ваше ім'я"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            {/* Last name */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--t1)]">
                Прізвище
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--t3)]" />
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ваше прізвище"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            {/* Company */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--t1)]">
                Компанія
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--t3)]" />
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Назва компанії (для B2B)"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-[var(--t1)]">
                Пароль <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--t3)]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Мінімум 6 символів"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg2)] py-3 pl-10 pr-10 text-sm outline-none transition-colors focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] hover:text-[var(--t1)]"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Реєстрація...
                </>
              ) : (
                "Зареєструватись"
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-6 text-center text-sm text-[var(--t2)]">
            Вже є акаунт?{" "}
            <Link href="/login" className="font-medium text-[var(--accent)] hover:underline">
              Увійти
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
