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
  const boardIdRef = useRef(boardId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(false);

  boardIdRef.current = boardId;

  // Save snapshot — ZERO React state, direct DOM for indicator
  const save = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const el = document.getElementById("shine-board-status");

    try {
      if (el) {
        el.textContent = "Зберігається...";
        el.style.color = "#f59e0b";
      }

      const snapshot = getSnapshot(editor.store);

      await fetch(`/api/admin/boards/${boardIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });

      if (el) {
        el.textContent = "Збережено";
        el.style.color = "#22c55e";
      }
    } catch (e) {
      console.error("Board save failed:", e);
      if (el) {
        el.textContent = "Помилка збереження";
        el.style.color = "#ef4444";
      }
    }
  }, []);

  const handleMount = useCallback((editor: Editor) => {
    editorRef.current = editor;

    // Sync theme
    const syncTheme = () => {
      const isDark =
        document.documentElement.getAttribute("data-admin-theme") !== "light";
      editor.user.updateUserPreferences({
        colorScheme: isDark ? "dark" : "light",
      });
    };
    syncTheme();

    // Load snapshot if available (only on first mount)
    if (initialSnapshot && !isMountedRef.current) {
      try {
        loadSnapshot(
          editor.store,
          initialSnapshot as Parameters<typeof loadSnapshot>[1],
        );
      } catch (e) {
        console.warn("Snapshot load failed, starting fresh:", e);
      }
    }
    isMountedRef.current = true;

    // Autosave: debounce 5s
    const cleanup = editor.store.listen(
      () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(save, 5000);
      },
      { scope: "document" },
    );

    // Watch theme changes
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-admin-theme"],
    });

    // Cleanup
    return () => {
      cleanup();
      observer.disconnect();
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
    // Empty deps — mount ONCE, forever
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <Tldraw onMount={handleMount} autoFocus />;
}
