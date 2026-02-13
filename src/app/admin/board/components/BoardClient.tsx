"use client";

import { useCallback, useRef, useEffect } from "react";
import { Tldraw, Editor, getSnapshot, loadSnapshot } from "tldraw";
import type { TLEditorSnapshot, TLStoreSnapshot } from "tldraw";
import "tldraw/tldraw.css";

interface Props {
  boardId: string | null;
  boardName: string;
  initialSnapshot: TLEditorSnapshot | TLStoreSnapshot | null;
  boards: Array<{ id: string; name: string; updated_at: string }>;
}

export default function BoardClient({
  boardId,
  boardName,
  initialSnapshot,
}: Props) {
  const editorRef = useRef<Editor | null>(null);
  const boardIdRef = useRef(boardId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  // NO useState for save status — direct DOM updates to avoid re-renders

  boardIdRef.current = boardId;

  // Save snapshot to server — zero React state updates
  const saveToServer = useCallback(async () => {
    const editor = editorRef.current;
    const id = boardIdRef.current;
    if (!editor || !id || isSavingRef.current) return;

    isSavingRef.current = true;
    const indicator = document.getElementById("board-save-indicator");
    if (indicator) {
      indicator.textContent = "Зберігається...";
      indicator.style.color = "#f59e0b";
    }

    try {
      const snapshot = getSnapshot(editor.store);
      await fetch(`/api/admin/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      if (indicator) {
        indicator.textContent = "Збережено";
        indicator.style.color = "#22c55e";
      }
    } catch (e) {
      console.error("[Board] Save error:", e);
      if (indicator) {
        indicator.textContent = "";
      }
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // onMount — called ONCE when tldraw initializes
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Sync tldraw theme with admin global theme
      const syncTheme = () => {
        const isDark =
          document.documentElement.getAttribute("data-admin-theme") !== "light";
        editor.user.updateUserPreferences({
          colorScheme: isDark ? "dark" : "light",
        });
      };
      syncTheme();

      // Watch for theme changes via MutationObserver
      const observer = new MutationObserver(syncTheme);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-admin-theme"],
      });

      // Load saved snapshot with validation
      if (
        initialSnapshot &&
        typeof initialSnapshot === "object" &&
        initialSnapshot !== null
      ) {
        try {
          loadSnapshot(editor.store, initialSnapshot);
        } catch (e) {
          console.warn("[Board] Corrupt snapshot, starting fresh:", e);
        }
      }

      // Autosave: debounce 3s after any document change
      editor.store.listen(
        () => {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(saveToServer, 3000);
        },
        { scope: "document" },
      );
    },
    [], // Empty deps — created once
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
      }}
    >
      {/* Header — uses theme CSS variables */}
      <div
        style={{
          height: 48,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--a-bg-card)",
          borderBottom: "1px solid var(--a-border)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            color: "var(--a-text)",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {boardName}
        </span>
        <span
          id="board-save-indicator"
          style={{ fontSize: 12, color: "var(--a-text-4)" }}
        />
      </div>

      {/* Canvas — guaranteed size */}
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
          height: "calc(100vh - 64px - 48px)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <Tldraw onMount={handleMount} autoFocus />
        </div>
      </div>
    </div>
  );
}
