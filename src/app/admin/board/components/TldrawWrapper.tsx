"use client";

import { useCallback, useRef } from "react";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "tldraw";
import "tldraw/tldraw.css";

interface TldrawWrapperProps {
  boardId: string;
  initialSnapshot: unknown;
}

export default function TldrawWrapper({
  boardId,
  initialSnapshot,
}: TldrawWrapperProps) {
  const editorRef = useRef<Editor | null>(null);
  const loadedRef = useRef(false);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Sync theme
    const isDark =
      document.documentElement.getAttribute("data-admin-theme") !== "light";
    editor.user.updateUserPreferences({
      colorScheme: isDark ? "dark" : "light",
    });

    // Load server snapshot ONLY if localStorage is empty (first visit)
    if (initialSnapshot && !loadedRef.current) {
      const localKey = `TLDRAW_DOCUMENT_v2_shine-board-${boardId}`;
      const hasLocal = localStorage.getItem(localKey);
      if (!hasLocal) {
        try {
          loadSnapshot(
            editor.store,
            initialSnapshot as Parameters<typeof loadSnapshot>[1],
          );
        } catch (e) {
          console.warn("Snapshot load failed, starting fresh:", e);
        }
      }
      loadedRef.current = true;
    }

    // Watch theme changes
    const observer = new MutationObserver(() => {
      const dark =
        document.documentElement.getAttribute("data-admin-theme") !== "light";
      editor.user.updateUserPreferences({
        colorScheme: dark ? "dark" : "light",
      });
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-admin-theme"],
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Manual save to server — exposed via window for header button
  const handleSave = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const el = document.getElementById("shine-board-status");

    try {
      if (el) {
        el.textContent = "Зберігається...";
        el.style.color = "#f59e0b";
      }

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
      console.error("Board save failed:", e);
      if (el) {
        el.textContent = "Помилка";
        el.style.color = "#ef4444";
      }
    }
  }, [boardId]);

  // Expose save to window so header button can call it
  if (typeof window !== "undefined") {
    (window as /* eslint-disable-line @typescript-eslint/no-explicit-any */ any).__shineBoardSave = handleSave;
  }

  return (
    <Tldraw
      persistenceKey={`shine-board-${boardId}`}
      onMount={handleMount}
      autoFocus
    />
  );
}
