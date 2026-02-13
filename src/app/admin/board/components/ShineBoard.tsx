"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";

// Inner canvas — NEVER re-renders (areEqual always returns true)
const TldrawCanvas = React.memo(
  function TldrawCanvas({ onMount }: { onMount: (editor: Editor) => void }) {
    return <Tldraw onMount={onMount} autoFocus />;
  },
  () => true,
);

interface ShineBoardProps {
  boardId: string;
  initialSnapshot: Record<string, unknown> | null;
}

export default function ShineBoard({ boardId, initialSnapshot }: ShineBoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardIdRef = useRef(boardId);
  const isSavingRef = useRef(false);

  // Keep boardId ref in sync (for board switching)
  boardIdRef.current = boardId;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Save to Supabase — only uses refs, zero state
  const saveToServer = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || isSavingRef.current) return;

    isSavingRef.current = true;
    window.dispatchEvent(
      new CustomEvent("board-save-status", { detail: { saving: true } }),
    );

    try {
      const snapshot = editor.store.getStoreSnapshot();
      await fetch(`/api/admin/boards/${boardIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
    } catch (err) {
      console.error("[ShineBoard] Save error:", err);
    } finally {
      isSavingRef.current = false;
      window.dispatchEvent(
        new CustomEvent("board-save-status", { detail: { saving: false } }),
      );
    }
  }, []);

  // Stable onMount — called once when tldraw initializes
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Load saved state
      if (initialSnapshot) {
        try {
          editor.store.loadStoreSnapshot(
            initialSnapshot as unknown as Parameters<
              typeof editor.store.loadStoreSnapshot
            >[0],
          );
        } catch (err) {
          console.warn("[ShineBoard] Failed to load snapshot:", err);
        }
      }

      // Autosave: debounce 3s after any document change
      editor.store.listen(
        () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(saveToServer, 3000);
        },
        { scope: "document" },
      );
    },
    [initialSnapshot, saveToServer],
  );

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <TldrawCanvas onMount={handleMount} />
    </div>
  );
}
