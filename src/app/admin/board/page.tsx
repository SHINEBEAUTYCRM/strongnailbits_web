"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import BoardHeader from "./components/BoardHeader";
import "./board.css";
import { Loader2 } from "lucide-react";

// tldraw must be loaded client-side only (uses browser APIs)
const ShineBoard = dynamic(
  () => import("./components/ShineBoard"),
  { ssr: false },
);

interface Board {
  id: string;
  name: string;
  snapshot?: Record<string, unknown> | null;
  thumbnail?: string | null;
  updated_at: string;
}

export default function BoardPage() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoard, setCurrentBoard] = useState<Board | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [boardKey, setBoardKey] = useState(0); // force remount on board switch

  // Load board list
  const loadBoards = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/boards");
      if (res.ok) {
        const data = await res.json();
        setBoards(data);
        return data as Board[];
      }
    } catch (err) {
      console.error("[BoardPage] Load boards error:", err);
    }
    return [];
  }, []);

  // Load specific board with snapshot
  const loadBoard = useCallback(async (boardId: string) => {
    try {
      const res = await fetch(`/api/admin/boards/${boardId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentBoard(data);
        setBoardKey((k) => k + 1); // force remount
      }
    } catch (err) {
      console.error("[BoardPage] Load board error:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    (async () => {
      const boardList = await loadBoards();
      if (boardList.length > 0) {
        await loadBoard(boardList[0].id);
      }
      setLoading(false);
    })();
  }, [loadBoards, loadBoard]);

  // Create new board
  const handleCreate = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Нова дошка" }),
      });
      if (res.ok) {
        const newBoard = await res.json();
        await loadBoards();
        await loadBoard(newBoard.id);
      }
    } catch (err) {
      console.error("[BoardPage] Create error:", err);
    }
  }, [loadBoards, loadBoard]);

  // Delete board
  const handleDelete = useCallback(
    async (boardId: string) => {
      try {
        const res = await fetch(`/api/admin/boards/${boardId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          const updatedBoards = await loadBoards();
          if (updatedBoards.length > 0) {
            await loadBoard(updatedBoards[0].id);
          }
        }
      } catch (err) {
        console.error("[BoardPage] Delete error:", err);
      }
    },
    [loadBoards, loadBoard],
  );

  // Rename board
  const handleRename = useCallback(
    async (boardId: string, name: string) => {
      try {
        await fetch(`/api/admin/boards/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        await loadBoards();
        if (currentBoard?.id === boardId) {
          setCurrentBoard((b) => (b ? { ...b, name } : b));
        }
      } catch (err) {
        console.error("[BoardPage] Rename error:", err);
      }
    },
    [loadBoards, currentBoard],
  );

  // Switch board
  const handleBoardSelect = useCallback(
    async (boardId: string) => {
      if (boardId === currentBoard?.id) return;
      await loadBoard(boardId);
    },
    [currentBoard, loadBoard],
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 64px)", background: "#08080c" }}
      >
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#a855f7" }} />
      </div>
    );
  }

  if (!currentBoard) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 64px)", background: "#08080c" }}
      >
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "#71717a" }}>
            Дошок поки немає
          </p>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            Створити дошку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{ height: "calc(100vh - 64px)", background: "#08080c" }}
    >
      <BoardHeader
        board={currentBoard}
        boards={boards}
        saving={saving}
        onBoardSelect={handleBoardSelect}
        onBoardCreate={handleCreate}
        onBoardDelete={handleDelete}
        onBoardRename={handleRename}
      />
      <div className="flex-1 min-h-0">
        <ShineBoard
          key={boardKey}
          boardId={currentBoard.id}
          initialSnapshot={currentBoard.snapshot ?? null}
          onSaveStatusChange={setSaving}
        />
      </div>
    </div>
  );
}
