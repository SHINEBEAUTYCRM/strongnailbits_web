"use client";

import { useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import "tldraw/tldraw.css";

// Dynamic import — ssr: false is allowed in Client Components (Next.js 16)
const TldrawComponent = dynamic(
  () => import("tldraw").then((mod) => ({ default: mod.Tldraw })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--a-text-4, #888)",
          fontFamily: "Outfit, sans-serif",
          fontSize: 14,
        }}
      >
        Завантаження дошки...
      </div>
    ),
  },
);

interface Props {
  boardId: string;
}

export default function BoardCanvas({ boardId }: Props) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const editorRef = useRef<any>(null);
  const getSnapshotRef = useRef<any>(null);

  // Pre-load getSnapshot utility
  useEffect(() => {
    import("tldraw").then((mod) => {
      getSnapshotRef.current = mod.getSnapshot;
    });
  }, []);

  // Save to server — via DOM button (zero React coupling)
  const saveToServer = useCallback(async () => {
    const editor = editorRef.current;
    const getSnapshot = getSnapshotRef.current;
    if (!editor || !getSnapshot) return;

    const el = document.getElementById("shine-board-status");
    if (el) {
      el.textContent = "Зберігається...";
      el.style.color = "#f59e0b";
    }

    try {
      const snapshot = getSnapshot(editor.store);
      await fetch(`/api/admin/boards/${boardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      if (el) {
        el.textContent = "Збережено";
        el.style.color = "#22c55e";
      }
      setTimeout(() => {
        if (el) el.textContent = "";
      }, 3000);
    } catch (e) {
      console.error("Board save error:", e);
      if (el) {
        el.textContent = "Помилка збереження";
        el.style.color = "#ef4444";
      }
    }
  }, [boardId]);

  // Bind save button via DOM
  useEffect(() => {
    const btn = document.getElementById("shine-board-save-btn");
    if (btn) btn.onclick = saveToServer;
    return () => {
      if (btn) btn.onclick = null;
    };
  }, [saveToServer]);

  // Mount handler — runs ONCE
  const handleMount = useCallback((editor: any) => {
    editorRef.current = editor;

    // Theme sync
    const applyTheme = () => {
      const isDark =
        document.documentElement.getAttribute("data-admin-theme") !== "light";
      editor.user.updateUserPreferences({
        colorScheme: isDark ? "dark" : "light",
      });
    };
    applyTheme();

    // Watch theme changes
    const observer = new MutationObserver(applyTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-admin-theme"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <TldrawComponent
        persistenceKey={`shine-board-${boardId}`}
        onMount={handleMount}
        autoFocus
      />
    </div>
  );
}
