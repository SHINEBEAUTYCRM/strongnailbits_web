"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Step = "phone" | "otp";

export function LinkPhoneForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handlePhoneInput(value: string) {
    const cleaned = value.replace(/[^\d+]/g, "");
    if (cleaned.length <= 13) setPhone(cleaned);
  }

  function displayPhone(): string {
    const digits = phone.replace(/\D/g, "");
    if (digits.startsWith("38") && digits.length > 2) {
      const rest = digits.slice(2);
      if (rest.length <= 3) return `+38 (${rest}`;
      if (rest.length <= 6) return `+38 (${rest.slice(0, 3)}) ${rest.slice(3)}`;
      if (rest.length <= 8) return `+38 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6)}`;
      return `+38 (${rest.slice(0, 3)}) ${rest.slice(3, 6)}-${rest.slice(6, 8)}-${rest.slice(8, 10)}`;
    }
    return phone;
  }

  async function handleSendOtp() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Помилка відправки");
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleOtpInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerifyAndLink() {
    setError(null);
    setLoading(true);
    try {
      const code = otpCode.join("");

      // 1. Verify OTP
      const verifyRes = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Невірний код");

      // 2. Link phone to Apple account (or merge with existing)
      const linkRes = await fetch("/api/auth/link-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          verificationToken: verifyData.verificationToken,
        }),
      });
      const linkData = await linkRes.json();
      if (!linkRes.ok) throw new Error(linkData.error || "Помилка привʼязки");

      // If accounts merged → re-login as existing user
      if (linkData.merged && linkData.loginEmail && linkData.tempPassword) {
        const supabase = createClient();
        await supabase.auth.signInWithPassword({
          email: linkData.loginEmail,
          password: linkData.tempPassword,
        });
      }

      // Refresh to show full account page
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-[13px] text-red-600">
          {error}
        </div>
      )}

      {step === "phone" && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendOtp(); }}
          className="flex flex-col gap-4"
        >
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--t2)]">
              Номер телефону
            </label>
            <input
              type="tel"
              value={displayPhone()}
              onChange={(e) => handlePhoneInput(e.target.value)}
              placeholder="+380 (___) ___-__-__"
              required
              autoFocus
              className="h-12 w-full rounded-pill border border-[var(--border)] bg-[var(--bg2)] px-4 text-[15px] outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading || phone.replace(/\D/g, "").length < 10}
            className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
          >
            {loading ? "Відправка..." : "Отримати код"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <div className="flex flex-col gap-4">
          <p className="text-center text-sm text-[var(--t2)]">
            Код відправлено на {displayPhone()}
          </p>
          <div className="flex justify-center gap-3">
            {otpCode.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpInput(i, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                autoFocus={i === 0}
                className="h-14 w-14 rounded-2xl border border-[var(--border)] bg-[var(--bg2)] text-center text-2xl font-bold outline-none transition-all focus:border-coral focus:ring-2 focus:ring-coral/20"
              />
            ))}
          </div>
          <button
            onClick={handleVerifyAndLink}
            disabled={loading || otpCode.join("").length < 4}
            className="font-unbounded mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-pill bg-coral text-[13px] font-bold text-white transition-all hover:bg-coral-2 hover:glow-coral disabled:opacity-60"
          >
            {loading ? "Перевірка..." : "Підтвердити"}
          </button>
          <button
            type="button"
            onClick={() => { setStep("phone"); setOtpCode(["", "", "", ""]); setError(null); }}
            className="text-center text-[13px] text-[var(--t3)] hover:text-coral"
          >
            Змінити номер
          </button>
        </div>
      )}
    </>
  );
}
