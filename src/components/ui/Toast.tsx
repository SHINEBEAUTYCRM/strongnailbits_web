"use client";

import { useEffect, useState, useCallback } from "react";
import { Check, X as XIcon, AlertCircle } from "lucide-react";

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error";
}

let toastId = 0;
const listeners = new Set<(msg: ToastMessage) => void>();

export function showToast(text: string, type: "success" | "error" = "success") {
  const msg: ToastMessage = { id: ++toastId, text, type };
  listeners.forEach((fn) => fn(msg));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((msg: ToastMessage) => {
    setToasts((prev) => [...prev, msg]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== msg.id));
    }, 3000);
  }, []);

  useEffect(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex animate-slide-in-right items-center gap-3 rounded-card border px-4 py-3 text-sm font-medium shadow-lg ${
            t.type === "success"
              ? "border-green/20 bg-green/5 text-green"
              : "border-red/20 bg-red/5 text-red"
          }`}
        >
          {t.type === "success" ? (
            <Check size={16} className="shrink-0" />
          ) : (
            <AlertCircle size={16} className="shrink-0" />
          )}
          {t.text}
          <button
            onClick={() =>
              setToasts((prev) => prev.filter((x) => x.id !== t.id))
            }
            className="ml-2 shrink-0 opacity-50 transition-opacity hover:opacity-100"
          >
            <XIcon size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
