"use client";

import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useRef, useEffect } from "react";

interface ShineBoardProps {
  boardId: string;
  initialSnapshot: Record<string, unknown> | null;
  onSaveStatusChange?: (saving: boolean) => void;
}

export default function ShineBoard({
  boardId,
  initialSnapshot,
  onSaveStatusChange,
}: ShineBoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardIdRef = useRef(boardId);

  // Keep boardId ref in sync
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const saveToServer = useCallback(async () => {
    if (!editorRef.current) return;

    onSaveStatusChange?.(true);

    try {
      const snapshot = editorRef.current.store.getStoreSnapshot();

      await fetch(`/api/admin/boards/${boardIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
    } catch (err) {
      console.error("[ShineBoard] Save error:", err);
    } finally {
      onSaveStatusChange?.(false);
    }
  }, [onSaveStatusChange]);

  const handleChange = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToServer(), 3000);
  }, [saveToServer]);

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

      // Subscribe to document changes
      editor.store.listen(() => handleChange(), { scope: "document" });
    },
    [initialSnapshot, handleChange],
  );

  return (
    <div className="shine-board-wrapper" style={{ width: "100%", height: "100%" }}>
      <Tldraw onMount={handleMount} />
    </div>
  );
}
