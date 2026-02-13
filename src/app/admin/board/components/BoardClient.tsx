"use client";

import { useCallback, useRef, useEffect, useState } from "react";
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
  boards,
}: Props) {
  const editorRef = useRef<Editor | null>(null);
  const boardIdRef = useRef(boardId);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSavingRef = useRef(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );

  // Keep boardId ref in sync
  boardIdRef.current = boardId;

  // Save snapshot to server
  const saveToServer = useCallback(async () => {
    const editor = editorRef.current;
    const id = boardIdRef.current;
    if (!editor || !id || isSavingRef.current) return;

    isSavingRef.current = true;
    setSaveStatus("saving");

    try {
      // tldraw v4 API: getSnapshot returns { document, session }
      const snapshot = getSnapshot(editor.store);

      await fetch(`/api/admin/boards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ snapshot }),
      });
      setSaveStatus("saved");
    } catch (e) {
      console.error("[Board] Save error:", e);
      setSaveStatus("idle");
    } finally {
      isSavingRef.current = false;
    }
  }, []);

  // onMount — called ONCE when tldraw initializes
  const handleMount = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;

      // Load saved snapshot using tldraw v4 API
      if (initialSnapshot) {
        try {
          loadSnapshot(editor.store, initialSnapshot);
        } catch (e) {
          console.warn("[Board] Snapshot load failed:", e);
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
    [], // Empty deps — handleMount is created once, initialSnapshot is captured in closure
  );

  // Cleanup timers on unmount
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
      {/* Minimal header */}
      <div
        style={{
          height: 48,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0e0e14",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#e4e4e7", fontSize: 14, fontWeight: 500 }}>
          {boardName}
        </span>
        <span
          style={{
            color:
              saveStatus === "saving"
                ? "#f59e0b"
                : saveStatus === "saved"
                  ? "#22c55e"
                  : "#52525b",
            fontSize: 12,
          }}
        >
          {saveStatus === "saving"
            ? "Зберігається..."
            : saveStatus === "saved"
              ? "Збережено"
              : ""}
        </span>
      </div>

      {/* Canvas — fills all remaining space */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <Tldraw onMount={handleMount} autoFocus />
        </div>
      </div>
    </div>
  );
}
