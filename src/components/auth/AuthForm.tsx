"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Phone, ArrowLeft, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AuthFormProps {
  mode: "login" | "register";
  redirect?: string;
}

type Step =
  | "phone"          // Enter phone number
  | "otp"            // Enter OTP code
  | "register-form"  // Fill name + password (new users)
  | "login-password"  // Enter password (existing users)
  | "reset-password"; // Reset password after OTP

export function AuthForm({ mode, redirect }: AuthFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);

  // Step management
  const [step, setStep] = useState<Step>(
    mode === "login" ? "login-password" : "phone",
  );
  const [isResetFlow, setIsResetFlow] = useState(false);

  // Form data
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");

  // OTP timer
  const [otpTimer, setOtpTimer] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // OTP input refs
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startOtpTimer() {
    setOtpTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  /** Format phone input as +38 (0XX) XXX-XX-XX */
  function handlePhoneInput(value: string) {
    // Allow only digits and "+"
    const clean = value.replace(/[^\d+]/g, "");
    setPhone(clean);
  }

  /** Display formatted phone */
  function displayPhone(): string {
    let digits = phone.replace(/\D/g, "");
    if (digits.startsWith("38") && digits.length > 2) {
      const rest = digits.slice(2);
      if (rest.length <= 3) return `+38 (${rest}`;
      if (rest.length <= 6) return `+38 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
      if (rest.length <= 8)
        return `+38 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
      return `+38 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
    }
    return phone;
  }

  /** OTP digit input handler */
  function handleOtpChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otpCode];
    newOtp[index] = value.slice(-1);
    setOtpCode(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      otpRefs[index + 1]?.current?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newOtp.every((d) => d)) {
      setTimeout(() => handleVerifyOtp(newOtp.join("")), 100);
    }
  }

  function handleOtpKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpRefs[index - 1]?.current?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (pasted.length === 4) {
      const newOtp = pasted.split("");
      setOtpCode(newOtp);
      otpRefs[3]?.current?.focus();
      setTimeout(() => handleVerifyOtp(pasted), 100);
    }
  }

  // ────── STEP 1: Send OTP ──────
  async function handleSendOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Помилка відправки SMS");
      }

      setStep("otp");
      setOtpCode(["", "", "", ""]);
      startOtpTimer();

      // Focus first OTP input after render
      setTimeout(() => otpRefs[0]?.current?.focus(), 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка відправки SMS");
    } finally {
      setLoading(false);
    }
  }

  // ────── STEP 2: Verify OTP ──────
  async function handleVerifyOtp(codeStr?: string) {
    const code = codeStr || otpCode.join("");
    if (code.length !== 4) {
      setError("Введіть 4-значний код");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Невірний код");
      }

      if (isResetFlow) {
        // After OTP verification in reset flow, go to set new password
        setStep("reset-password");
      } else if (data.existingUser) {
        // User exists — ask for password to login
        setStep("login-password");
      } else {
        // New user — show registration form
        setStep("register-form");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка перевірки коду");
      setOtpCode(["", "", "", ""]);
      otpRefs[0]?.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  // ────── STEP 3a: Complete Registration ──────
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Create user via server API
      const res = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          action: "register",
          password,
          firstName,
          lastName,
          company,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Помилка реєстрації");
      }

      // Auto-login after registration
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.loginEmail,
        password,
      });

      if (signInError) {
        // Registration succeeded but auto-login failed — show success
        setSuccess(true);
        return;
      }

      router.push(redirect || "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка реєстрації");
    } finally {
      setLoading(false);
    }
  }

  // ────── STEP 3b: Login with password ──────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Get the login email for this phone
      const res = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "get-login-email" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Користувач не знайдений");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.loginEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login")) {
          throw new Error("Невірний пароль");
        }
        throw signInError;
      }

      router.push(redirect || "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка входу");
    } finally {
      setLoading(false);
    }
  }

  // ────── STEP 3c: Reset password ──────
  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "reset-password", password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Помилка зміни паролю");
      }

      // Auto-login with new password
      const loginRes = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, action: "get-login-email" }),
      });
      const loginData = await loginRes.json();

      if (loginRes.ok) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: loginData.loginEmail,
          password,
        });
      }

      router.push(redirect || "/account");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка зміни паролю");
    } finally {
      setLoading(false);
    }
  }

  // ────── Success screen ──────
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
          Ваш акаунт створено. Увійдіть з вашим номером телефону та паролем.
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

  // ────── RENDER: Phone input step ──────
  if (step === "phone") {
    return (
      <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Номер телефону
          </label>
          <div className="relative">
            <Phone
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]"
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneInput(e.target.value)}
              required
              autoFocus
              className="h-12 w-full rounded-[10px] border border-[var(--border)] bg-white pl-10 pr-3 text-sm text-dark outline-none transition-colors focus:border-coral"
              placeholder="+380 (XX) XXX-XX-XX"
            />
          </div>
          <p className="mt-1.5 text-[11px] text-[var(--t3)]">
            Ми відправимо SMS з кодом підтвердження
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || phone.replace(/\D/g, "").length < 10}
          className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Отримати код"
          )}
        </button>

        <p className="text-center text-sm text-[var(--t2)]">
          Вже є акаунт?{" "}
          <button
            type="button"
            onClick={() => {
              setStep("login-password");
              setError(null);
            }}
            className="font-medium text-coral hover:text-coral-2"
          >
            Увійти з паролем
          </button>
        </p>
      </form>
    );
  }

  // ────── RENDER: OTP input step ──────
  if (step === "otp") {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
          }}
          className="flex items-center gap-1 text-sm text-[var(--t2)] hover:text-dark"
        >
          <ArrowLeft size={14} />
          Змінити номер
        </button>

        {error && (
          <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-coral/10">
            <Shield size={20} className="text-coral" />
          </div>
          <p className="text-sm text-[var(--t2)]">
            Код відправлено на{" "}
            <span className="font-medium text-dark">{displayPhone()}</span>
          </p>
        </div>

        <div className="flex justify-center gap-3" onPaste={handleOtpPaste}>
          {otpCode.map((digit, i) => (
            <input
              key={i}
              ref={otpRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="h-14 w-14 rounded-xl border-2 border-[var(--border)] bg-white text-center text-xl font-bold text-dark outline-none transition-colors focus:border-coral"
            />
          ))}
        </div>

        {loading && (
          <div className="flex justify-center">
            <Loader2 size={20} className="animate-spin text-coral" />
          </div>
        )}

        <div className="text-center">
          {otpTimer > 0 ? (
            <p className="text-sm text-[var(--t3)]">
              Повторна відправка через {otpTimer}с
            </p>
          ) : (
            <button
              type="button"
              onClick={() => handleSendOtp()}
              disabled={loading}
              className="text-sm font-medium text-coral hover:text-coral-2"
            >
              Відправити код повторно
            </button>
          )}
        </div>
      </div>
    );
  }

  // ────── RENDER: Registration form (after OTP) ──────
  if (step === "register-form") {
    return (
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            setStep("phone");
            setError(null);
          }}
          className="flex items-center gap-1 text-sm text-[var(--t2)] hover:text-dark"
        >
          <ArrowLeft size={14} />
          Змінити номер
        </button>

        {error && (
          <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-green/5 border border-green/20 px-4 py-2.5">
          <p className="text-xs text-green">
            Телефон {displayPhone()} підтверджено
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
              Ім&apos;я *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              autoFocus
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

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Компанія / Салон
          </label>
          <input
            type="text"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="h-11 w-full rounded-[10px] border border-[var(--border)] bg-white px-3 text-sm text-dark outline-none transition-colors focus:border-coral"
            placeholder="Назва салону / ФОП"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Пароль *
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
          className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Зареєструватись"
          )}
        </button>
      </form>
    );
  }

  // ────── RENDER: Reset password (after OTP) ──────
  if (step === "reset-password") {
    return (
      <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
        {error && (
          <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-green/5 border border-green/20 px-4 py-2.5">
          <p className="text-xs text-green">
            Телефон {displayPhone()} підтверджено
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
            Новий пароль
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
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
          className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Змінити пароль та увійти"
          )}
        </button>
      </form>
    );
  }

  // ────── RENDER: Login with phone + password ──────
  return (
    <form onSubmit={handleLogin} className="flex flex-col gap-4">
      {error && (
        <div className="rounded-card border border-red/20 bg-red/5 px-4 py-3 text-sm text-red">
          {error}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--t2)]">
          Номер телефону
        </label>
        <div className="relative">
          <Phone
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--t3)]"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => handlePhoneInput(e.target.value)}
            required
            autoFocus
            className="h-12 w-full rounded-[10px] border border-[var(--border)] bg-white pl-10 pr-3 text-sm text-dark outline-none transition-colors focus:border-coral"
            placeholder="+380 (XX) XXX-XX-XX"
          />
        </div>
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
        disabled={loading || phone.replace(/\D/g, "").length < 10}
        className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          "Увійти"
        )}
      </button>

      <div className="flex flex-col gap-2 text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setIsResetFlow(true);
            setStep("phone");
            setError(null);
          }}
          className="text-[var(--t3)] hover:text-coral transition-colors"
        >
          Забули пароль?
        </button>

        <p className="text-[var(--t2)]">
          Немає акаунту?{" "}
          <Link
            href="/register"
            className="font-medium text-coral hover:text-coral-2"
          >
            Зареєструватись
          </Link>
        </p>
      </div>
    </form>
  );
}
