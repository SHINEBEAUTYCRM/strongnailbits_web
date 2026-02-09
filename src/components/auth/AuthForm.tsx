"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "register";
  redirect?: string;
}

export function AuthForm({ mode, redirect }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  const isRegister = mode === "register";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
              phone,
            },
          },
        });

        if (signUpError) throw signUpError;

        // Create profile
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
          });
        }

        setSuccess(true);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.push(redirect || "/account");
        router.refresh();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Щось пішло не так";
      if (msg.includes("Invalid login")) {
        setError("Невірний email або пароль");
      } else if (msg.includes("already registered")) {
        setError("Цей email вже зареєстрований");
      } else if (msg.includes("Password should be")) {
        setError("Пароль повинен містити мінімум 6 символів");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green/10">
          <svg
            className="h-8 w-8 text-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h2 className="font-unbounded text-lg font-bold text-dark">
          Реєстрація успішна!
        </h2>
        <p className="mt-2 text-sm text-[var(--t2)]">
          Перевірте вашу електронну пошту для підтвердження акаунту.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-pill bg-coral px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-coral-2"
        >
          Увійти
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      {isRegister && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
              Ім&apos;я
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
              placeholder="Олена"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
              Прізвище
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
              placeholder="Шевченко"
            />
          </div>
        </div>
      )}

      {isRegister && (
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Телефон
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
            placeholder="+38 (0__) ___-__-__"
          />
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
          placeholder="your@email.com"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Пароль
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 pr-10 text-sm text-dark outline-none transition-colors focus:border-coral"
            placeholder="Мінімум 6 символів"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--t3)] transition-colors hover:text-dark"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="font-unbounded mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : isRegister ? (
          "Зареєструватись"
        ) : (
          "Увійти"
        )}
      </button>

      <p className="text-center text-sm text-[var(--t2)]">
        {isRegister ? (
          <>
            Вже є акаунт?{" "}
            <Link href="/login" className="font-medium text-coral hover:text-coral-2">
              Увійти
            </Link>
          </>
        ) : (
          <>
            Немає акаунту?{" "}
            <Link href="/register" className="font-medium text-coral hover:text-coral-2">
              Зареєструватись
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
