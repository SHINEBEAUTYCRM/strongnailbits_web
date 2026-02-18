"use client";

import { useEffect } from "react";

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
    <html lang="uk">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif", margin: 0 }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1.5rem", padding: "2rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem" }}>⚠️</div>
          <div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: 0 }}>Щось пішло не так</h1>
            <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280", maxWidth: "28rem" }}>
              Виникла критична помилка. Спробуйте оновити сторінку.
            </p>
          </div>
          <button
            onClick={reset}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.625rem 1.5rem", borderRadius: "9999px",
              background: "#ef4444", color: "#fff", fontWeight: 700,
              fontSize: "0.8125rem", border: "none", cursor: "pointer",
            }}
          >
            Спробувати ще раз
          </button>
        </div>
      </body>
    </html>
  );
}
