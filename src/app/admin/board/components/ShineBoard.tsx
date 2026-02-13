"use client";

import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useCallback, useRef, useEffect, memo } from "react";

interface ShineBoardProps {
  boardId: string;
  initialSnapshot: Record<string, unknown> | null;
  onSaveStatusChange?: (saving: boolean) => void;
}

function ShineBoardInner({
  boardId,
  initialSnapshot,
  onSaveStatusChange,
}: ShineBoardProps) {
  const editorRef = useRef<Editor | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boardIdRef = useRef(boardId);
  const onSaveRef = useRef(onSaveStatusChange);

  // Keep refs in sync without causing re-renders
  useEffect(() => {
    boardIdRef.current = boardId;
  }, [boardId]);

  useEffect(() => {
    onSaveRef.current = onSaveStatusChange;
  }, [onSaveStatusChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Stable save function — no deps that change
  const saveToServer = useCallback(async () => {
    if (!editorRef.current) return;

    onSaveRef.current?.(true);

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
      onSaveRef.current?.(false);
    }
  }, []);

  const handleChange = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => saveToServer(), 3000);
  }, [saveToServer]);

  // Stable onMount — empty deps, snapshot is read from ref-like closure at mount time only
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

      // Subscribe to document changes for autosave
      editor.store.listen(() => handleChange(), { scope: "document" });
    },
    // initialSnapshot and handleChange are stable across the component lifetime
    // because this component gets remounted (via key) when switching boards
    [initialSnapshot, handleChange],
  );

  return (
    <div
      className="shine-board-wrapper"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <Tldraw onMount={handleMount} />
    </div>
  );
}

// Prevent re-renders from parent state changes (e.g. saving indicator)
const ShineBoard = memo(ShineBoardInner);
export default ShineBoard;
