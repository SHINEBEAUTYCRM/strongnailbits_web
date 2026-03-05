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
  | "phone"               // Enter phone number
  | "otp"                 // Enter OTP code
  | "register-form"       // Fill name + password (new users)
  | "login-password"      // Main login screen (phone + SMS/password choice)
  | "login-password-form" // Login with phone + password form
  | "reset-password"      // Reset password after OTP
  | "telegram-waiting";   // Waiting for Telegram confirmation

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
  const verificationTokenRef = useRef<string | null>(null);

  // Telegram auth
  const [telegramToken, setTelegramToken] = useState<string | null>(null);
  const [telegramBotUrl, setTelegramBotUrl] = useState<string | null>(null);
  const [telegramStatus, setTelegramStatus] = useState<"sent" | "need_link" | "register" | null>(null);
  const [tgCountdown, setTgCountdown] = useState(300);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pollingRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channelRef = useRef<any>(null);

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
      stopTelegramPolling();
      stopTelegramRealtime();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== "telegram-waiting") return;
    if (tgCountdown <= 0) {
      stopTelegramPolling();
      stopTelegramRealtime();
      setError("Час вийшов. Спробуйте ще раз.");
      setStep("login-password");
      return;
    }
    const timer = setInterval(() => setTgCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, tgCountdown]);

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

  /** Format phone input — keep only digits and "+" */
  function handlePhoneInput(value: string) {
    // Allow only digits and "+"
    let clean = value.replace(/[^\d+]/g, "");

    // Auto-add +380 prefix if user starts typing 0 (local format)
    if (clean === "0" || clean === "0,") {
      clean = "+380";
    }

    // If just digits without +, and starts with 0, convert to +380...
    if (!clean.startsWith("+") && clean.startsWith("0")) {
      clean = "+38" + clean;
    }

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

  // ────── Apple Sign-In ──────

  async function handleAppleLogin() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect || "/account")}`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка входу через Apple");
      setLoading(false);
    }
  }

  // ────── Telegram Auth ──────

  function stopTelegramPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  function stopTelegramRealtime() {
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }

  function startTelegramPolling(token: string) {
    stopTelegramPolling();
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram-check?token=${token}`);
        const data = await res.json();
        if (data.status === "confirmed") {
          stopTelegramPolling();
          stopTelegramRealtime();
          await completeTelegramLogin(token);
        } else if (data.status === "expired" || data.status === "denied") {
          stopTelegramPolling();
          stopTelegramRealtime();
          setError("Час вийшов або вхід відхилено. Спробуйте ще раз.");
          setStep("login-password");
        }
      } catch {
        /* ignore network errors — will retry */
      }
    }, 3000);
  }

  function startTelegramRealtime(token: string) {
    const supabase = createClient();
    stopTelegramRealtime();
    const channel = supabase
      .channel(`auth-${token}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "auth_requests",
          filter: `token=eq.${token}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (payload: any) => {
          const newStatus = payload.new?.status;
          if (newStatus === "confirmed") {
            stopTelegramPolling();
            stopTelegramRealtime();
            await completeTelegramLogin(token);
          } else if (newStatus === "expired" || newStatus === "denied") {
            stopTelegramPolling();
            stopTelegramRealtime();
            setError("Вхід відхилено.");
            setStep("login-password");
          }
        },
      )
      .subscribe();
    channelRef.current = channel;
  }

  async function completeTelegramLogin(token: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка підтвердження");

      const supabase = createClient();
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: "magiclink",
      });
      if (otpError) throw new Error("Помилка автоматичного входу");

      if (data.isNewUser) {
        router.push("/account?welcome=true");
      } else {
        router.push(redirect || "/account");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка входу");
      setStep("login-password");
    } finally {
      setLoading(false);
    }
  }

  async function handleTelegramLogin() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/telegram-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404)
          throw new Error(data.error || "Користувача не знайдено. Зареєструйтесь");
        throw new Error(data.error || "Помилка");
      }
      setTelegramToken(data.token);
      setTelegramStatus(data.status);
      if (data.botUrl) setTelegramBotUrl(data.botUrl);
      setStep("telegram-waiting");
      setTgCountdown(300);
      startTelegramPolling(data.token);
      startTelegramRealtime(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Помилка");
    } finally {
      setLoading(false);
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

      // Зберігаємо verification token для наступних дій
      if (data.verificationToken) {
        verificationTokenRef.current = data.verificationToken;
      }

      if (isResetFlow) {
        // After OTP verification in reset flow, go to set new password
        setStep("reset-password");
      } else if (data.existingUser) {
        // User exists — auto-login via OTP (no password needed)
        await handleOtpLogin();
        return; // handleOtpLogin handles navigation
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
          verificationToken: verificationTokenRef.current,
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

  // ────── STEP 3b-alt: Login via OTP (no password) ──────
  async function handleOtpLogin() {
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();

      // Get temp credentials for OTP-verified user
      const res = await fetch("/api/auth/phone-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          action: "otp-login",
          verificationToken: verificationTokenRef.current,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Користувач не знайдений");
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.loginEmail,
        password: data.tempPassword,
      });

      if (signInError) {
        throw new Error("Помилка автоматичного входу");
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
        body: JSON.stringify({
          phone,
          action: "reset-password",
          password,
          verificationToken: verificationTokenRef.current,
        }),
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
            Оберіть спосіб реєстрації
          </p>
        </div>

        {/* Primary: Register via Telegram */}
        <button
          type="button"
          onClick={handleTelegramLogin}
          disabled={loading || phone.replace(/\D/g, "").length < 10}
          className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                <path
                  d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Зареєструватись через Telegram
            </>
          )}
        </button>

        {/* Secondary: Register via SMS */}
        <button
          type="button"
          onClick={() => handleSendOtp()}
          disabled={loading || phone.replace(/\D/g, "").length < 10}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-[var(--border)] text-[13px] font-medium text-[var(--t2)] transition-all hover:border-coral hover:text-coral disabled:opacity-60"
        >
          Отримати SMS-код
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-xs text-[var(--t3)]">або</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Apple Sign-In */}
        <button
          type="button"
          onClick={handleAppleLogin}
          disabled={loading}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-black text-[13px] font-bold text-white transition-all hover:bg-black/85 disabled:opacity-60"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
          </svg>
          Зареєструватись з Apple
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
            Увійти
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

  // ────── RENDER: Login with phone + password form ──────
  if (step === "login-password-form") {
    return (
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => {
            setStep("login-password");
            setError(null);
          }}
          className="flex items-center gap-1 text-sm text-[var(--t2)] hover:text-dark"
        >
          <ArrowLeft size={14} />
          Назад
        </button>

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
          disabled={loading || phone.replace(/\D/g, "").length < 10}
          className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            "Увійти"
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsResetFlow(true);
            setStep("phone");
            setError(null);
          }}
          className="text-center text-sm text-[var(--t3)] hover:text-coral transition-colors"
        >
          Забули пароль?
        </button>
      </form>
    );
  }

  // ────── RENDER: Telegram waiting ──────
  if (step === "telegram-waiting") {
    const botUsername =
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "strongnailbits_b2b_bot";
    const minutes = Math.floor(tgCountdown / 60);
    const seconds = tgCountdown % 60;

    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute h-20 w-20 animate-ping rounded-full bg-[#26A5E4]/15" />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#26A5E4]/10 border border-[#26A5E4]/20">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="#26A5E4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <h3 className="font-unbounded text-lg font-bold text-dark">
          {telegramStatus === "register"
            ? "Реєстрація через Telegram"
            : telegramStatus === "need_link"
              ? "Підключіть Telegram"
              : "Перевірте Telegram"}
        </h3>

        <p className="text-center text-sm text-[var(--t2)]">
          {telegramStatus === "register"
            ? "Відкрийте бот та надішліть свій номер для реєстрації"
            : telegramStatus === "need_link"
              ? "Відкрийте бот та підтвердіть вхід"
              : 'Натисніть «Підтвердити» в повідомленні від бота'}
        </p>

        <div className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-soft)] px-4 py-2">
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke={tgCountdown < 60 ? "#ef4444" : "var(--t3)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span
            className={`text-sm font-mono ${tgCountdown < 60 ? "text-red" : "text-[var(--t2)]"}`}
          >
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>

        <a
          href={
            (telegramStatus === "need_link" || telegramStatus === "register") &&
            telegramBotUrl
              ? telegramBotUrl
              : `https://t.me/${botUsername}`
          }
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-[#26A5E4] text-[13px] font-bold text-white transition-all hover:bg-[#1E96D1]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none">
            <path
              d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Відкрити Telegram
        </a>

        <button
          type="button"
          onClick={() => {
            stopTelegramPolling();
            stopTelegramRealtime();
            setStep("login-password");
            setError(null);
          }}
          className="text-sm text-[var(--t3)] transition-colors hover:text-coral"
        >
          Ввести інший номер
        </button>
      </div>
    );
  }

  // ────── RENDER: Login with phone (SMS first, password as fallback) ──────
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        // Default action is send OTP for login
        handleSendOtp();
      }}
      className="flex flex-col gap-4"
    >
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
          Оберіть спосіб входу
        </p>
      </div>

      {/* Primary: Login via Telegram */}
      <button
        type="button"
        onClick={handleTelegramLogin}
        disabled={loading || phone.replace(/\D/g, "").length < 10}
        className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Увійти через Telegram
          </>
        )}
      </button>

      {/* Secondary: Login via SMS */}
      <button
        type="button"
        onClick={() => handleSendOtp()}
        disabled={loading || phone.replace(/\D/g, "").length < 10}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-pill border border-[var(--border)] text-[13px] font-medium text-[var(--t2)] transition-all hover:border-coral hover:text-coral disabled:opacity-60"
      >
        Отримати SMS-код
      </button>

      {/* Tertiary: Login with password */}
      <button
        type="button"
        onClick={() => setStep("login-password-form")}
        className="text-center text-sm text-[var(--t3)] transition-colors hover:text-coral"
      >
        Увійти з паролем
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs text-[var(--t3)]">або</span>
        <div className="h-px flex-1 bg-[var(--border)]" />
      </div>

      {/* Apple Sign-In */}
      <button
        type="button"
        onClick={handleAppleLogin}
        disabled={loading}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-black text-[13px] font-bold text-white transition-all hover:bg-black/85 disabled:opacity-60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
        </svg>
        Увійти з Apple
      </button>

      <p className="text-center text-sm text-[var(--t2)]">
        Немає акаунту?{" "}
        <Link
          href="/register"
          className="font-medium text-coral hover:text-coral-2"
        >
          Зареєструватись
        </Link>
      </p>
    </form>
  );
}
