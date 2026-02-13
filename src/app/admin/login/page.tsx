"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Send, AlertCircle, Loader2, Clock, Check, Phone, XCircle } from "lucide-react";
import { DangrowBadge } from "@/components/admin/DangrowBadge";
import { createClient } from "@/lib/supabase/client";

type Status = "idle" | "sending" | "waiting" | "confirmed" | "error" | "no_telegram";

export default function AdminLoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const inputRef = useRef<HTMLInputElement>(null);
  const channelRef = useRef<ReturnType<typeof createClient>["channel"] | null>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Countdown timer when waiting
  useEffect(() => {
    if (status !== "waiting") return;
    if (countdown <= 0) {
      setStatus("error");
      setError("Час вийшов. Спробуйте ще раз.");
      return;
    }
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [status, countdown]);

  // Supabase Realtime subscription
  const subscribeToToken = useCallback(
    (authToken: string) => {
      const supabase = createClient();

      // Unsubscribe from previous channel if exists
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current as never);
      }

      const channel = supabase
        .channel(`auth-${authToken}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "auth_requests",
            filter: `token=eq.${authToken}`,
          },
          async (payload: { new: Record<string, unknown> }) => {
            const newStatus = (payload.new as { status: string }).status;
            if (newStatus === "confirmed") {
              setStatus("confirmed");

              // Create session
              try {
                const res = await fetch("/api/admin/auth/confirm", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: authToken }),
                });

                if (res.ok) {
                  // Brief delay for animation
                  setTimeout(() => {
                    router.push("/admin");
                    router.refresh();
                  }, 1000);
                } else {
                  const data = await res.json();
                  setStatus("error");
                  setError(data.error || "Помилка створення сесії");
                }
              } catch {
                setStatus("error");
                setError("Помилка мережі");
              }
            } else if (newStatus === "expired" || newStatus === "denied") {
              setStatus("error");
              setError("Вхід відхилено.");
            }
          }
        )
        .subscribe();

      channelRef.current = channel as never;
    },
    [router]
  );

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        const supabase = createClient();
        supabase.removeChannel(channelRef.current as never);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\s/g, "");
    if (digits.length !== 9) {
      setError("Введіть 9 цифр номера");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const fullPhone = "+380" + digits;
      const res = await fetch("/api/admin/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: fullPhone }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Handle specific error types by HTTP status
        if (data.error === "no_telegram") {
          setStatus("no_telegram");
          setError(data.message || "Спочатку прив'яжіть Telegram");
        } else if (res.status === 404) {
          setStatus("error");
          setError("Номер не знайдено в системі. Зверніться до адміністратора.");
        } else if (res.status === 429) {
          setStatus("error");
          setError(data.error || "Занадто багато спроб. Зачекайте 5 хвилин.");
        } else if (res.status === 500) {
          setStatus("error");
          setError("Не вдалося надіслати повідомлення. Перевірте Telegram бота.");
        } else {
          setStatus("error");
          setError(data.error || "Помилка сервера");
        }
        return;
      }

      // Success — switch to waiting state
      setToken(data.token);
      setStatus("waiting");
      setCountdown(300);
      subscribeToToken(data.token);
    } catch {
      setStatus("error");
      setError("Помилка мережі");
    }
  };

  const handleReset = () => {
    setStatus("idle");
    setError("");
    setToken(null);
    setCountdown(300);
    if (channelRef.current) {
      const supabase = createClient();
      supabase.removeChannel(channelRef.current as never);
      channelRef.current = null;
    }
  };

  const formatPhone = (value: string) => {
    // Only allow digits, max 9
    const digits = value.replace(/\D/g, "").slice(0, 9);
    // Format: XX XXX XX XX
    let formatted = "";
    for (let i = 0; i < digits.length; i++) {
      if (i === 2 || i === 5 || i === 7) formatted += " ";
      formatted += digits[i];
    }
    setPhone(formatted);
  };

  const formatCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "#08080c" }}
    >
      <div className="w-full max-w-[420px] mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-wider mb-1">
            <span style={{ color: "#a855f7" }}>ShineShop</span>{" "}
            <span style={{ color: "#52525b", fontSize: "14px", letterSpacing: "0.15em" }}>
              OPERATING SYSTEM
            </span>
          </h1>
          <p className="text-sm" style={{ color: "#52525b" }}>
            Панель управління
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6"
          style={{
            background: "rgba(12, 12, 18, 0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* ── IDLE / SENDING: Phone input ── */}
          {(status === "idle" || status === "sending") && (
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label
                  className="flex items-center gap-2 text-xs font-medium mb-2"
                  style={{ color: "#71717a" }}
                >
                  <Phone className="w-3.5 h-3.5" />
                  Номер телефону
                </label>
                <div
                  className="flex items-center rounded-[10px] overflow-hidden transition-colors"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onClick={() => inputRef.current?.focus()}
                  onFocus={() => {
                    const el = inputRef.current?.parentElement;
                    if (el) el.style.borderColor = "#7c3aed";
                  }}
                  onBlur={() => {
                    const el = inputRef.current?.parentElement;
                    if (el) el.style.borderColor = "rgba(255,255,255,0.1)";
                  }}
                >
                  {/* Fixed +380 prefix */}
                  <span
                    className="shrink-0 px-3 py-3 text-sm select-none"
                    style={{
                      color: "#a1a1aa",
                      fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                      background: "rgba(0,0,0,0.2)",
                    }}
                  >
                    +380
                  </span>
                  {/* Separator */}
                  <span style={{ width: 1, height: 24, background: "rgba(255,255,255,0.1)", flexShrink: 0 }} />
                  {/* Input for 9 digits */}
                  <input
                    ref={inputRef}
                    type="tel"
                    value={phone}
                    onChange={(e) => formatPhone(e.target.value)}
                    placeholder="63 744 38 89"
                    disabled={status === "sending"}
                    maxLength={12}
                    className="flex-1 px-3 py-3 text-sm outline-none bg-transparent"
                    style={{
                      color: "#e4e4e7",
                      fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === "sending" || phone.replace(/\s/g, "").length !== 9}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-opacity"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #a855f7)",
                }}
              >
                {status === "sending" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Надіслати запит
              </button>

              <p className="text-center text-xs mt-4" style={{ color: "#52525b" }}>
                Увійдіть за допомогою Telegram
              </p>
            </form>
          )}

          {/* ── WAITING: Telegram confirmation ── */}
          {status === "waiting" && (
            <div className="text-center py-4">
              {/* Pulsing Telegram icon */}
              <div className="relative inline-flex items-center justify-center mb-5">
                <div
                  className="absolute w-20 h-20 rounded-full animate-ping"
                  style={{ background: "rgba(168, 85, 247, 0.15)" }}
                />
                <div
                  className="relative w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(168, 85, 247, 0.1)", border: "1px solid rgba(168,85,247,0.2)" }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                      stroke="#a855f7"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-2" style={{ color: "#e4e4e7" }}>
                Підтвердіть вхід в Telegram
              </h3>
              <p className="text-sm mb-4" style={{ color: "#71717a" }}>
                Натисніть кнопку «✅ Підтвердити» в повідомленні від бота
              </p>

              {/* Timer */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Clock className="w-4 h-4" style={{ color: countdown < 60 ? "#ef4444" : "#71717a" }} />
                <span
                  className="text-sm font-mono"
                  style={{ color: countdown < 60 ? "#ef4444" : "#a1a1aa" }}
                >
                  {formatCountdown(countdown)}
                </span>
              </div>

              <button
                onClick={handleReset}
                className="block mx-auto mt-4 text-xs transition-colors"
                style={{ color: "#52525b" }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#a1a1aa"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#52525b"; }}
              >
                Ввести інший номер
              </button>
            </div>
          )}

          {/* ── CONFIRMED: Success ── */}
          {status === "confirmed" && (
            <div className="text-center py-6">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34,197,94,0.2)" }}
              >
                <Check className="w-8 h-8" style={{ color: "#22c55e" }} />
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: "#22c55e" }}>
                Вхід підтверджено!
              </h3>
              <p className="text-sm" style={{ color: "#71717a" }}>
                Переходимо в адмінку...
              </p>
              <Loader2 className="w-5 h-5 animate-spin mx-auto mt-3" style={{ color: "#22c55e" }} />
            </div>
          )}

          {/* ── ERROR ── */}
          {status === "error" && (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
              >
                <XCircle className="w-8 h-8" style={{ color: "#ef4444" }} />
              </div>

              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg mb-5 text-sm"
                style={{
                  background: "rgba(239,68,68,0.06)",
                  border: "1px solid rgba(239,68,68,0.15)",
                  color: "#ef4444",
                }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                Спробувати ще раз
              </button>
            </div>
          )}

          {/* ── NO TELEGRAM ── */}
          {status === "no_telegram" && (
            <div className="text-center py-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245,158,11,0.2)" }}
              >
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M22 2L11 13M22 2L15 22L11 13M22 2L2 9L11 13"
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>

              <h3 className="text-lg font-semibold mb-2" style={{ color: "#f59e0b" }}>
                Telegram не підключено
              </h3>
              <p className="text-sm mb-5" style={{ color: "#71717a" }}>
                Спочатку напишіть <span style={{ color: "#a855f7" }}>/start</span> боту{" "}
                <a
                  href="https://t.me/ShineShopAdminBot"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#a855f7" }}
                >
                  @ShineShopAdminBot
                </a>{" "}
                і надішліть свій номер телефону.
              </p>

              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
              >
                Спробувати ще раз
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-center mt-6">
          <DangrowBadge />
        </div>
      </div>
    </div>
  );
}
