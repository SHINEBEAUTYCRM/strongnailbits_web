"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import BoardHeader from "./components/BoardHeader";
import "./board.css";
import { Loader2 } from "lucide-react";

// tldraw must be loaded client-side only (uses browser APIs)
const ShineBoard = dynamic(() => import("./components/ShineBoard"), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center"
      style={{ height: "100%", background: "#08080c" }}
    >
      <Loader2
        className="w-8 h-8 animate-spin"
        style={{ color: "#a855f7" }}
      />
    </div>
  ),
});

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
  const [boardKey, setBoardKey] = useState(0);
  const currentBoardIdRef = useRef<string | null>(null);

  // No more `saving` state here — BoardHeader listens via CustomEvent

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

  const loadBoard = useCallback(async (boardId: string) => {
    try {
      const res = await fetch(`/api/admin/boards/${boardId}`);
      if (res.ok) {
        const data = await res.json();
        currentBoardIdRef.current = data.id;
        setCurrentBoard(data);
        setBoardKey((k) => k + 1);
      }
    } catch (err) {
      console.error("[BoardPage] Load board error:", err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const boardList = await loadBoards();
      if (boardList.length > 0) {
        await loadBoard(boardList[0].id);
      }
      setLoading(false);
    })();
  }, [loadBoards, loadBoard]);

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

  const handleRename = useCallback(
    async (boardId: string, name: string) => {
      try {
        await fetch(`/api/admin/boards/${boardId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        setBoards((prev) =>
          prev.map((b) => (b.id === boardId ? { ...b, name } : b)),
        );
        setCurrentBoard((b) =>
          b && b.id === boardId ? { ...b, name } : b,
        );
      } catch (err) {
        console.error("[BoardPage] Rename error:", err);
      }
    },
    [],
  );

  const handleBoardSelect = useCallback(
    async (boardId: string) => {
      if (boardId === currentBoardIdRef.current) return;
      await loadBoard(boardId);
    },
    [loadBoard],
  );

  if (loading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: "calc(100vh - 64px)", background: "#08080c" }}
      >
        <Loader2
          className="w-8 h-8 animate-spin"
          style={{ color: "#a855f7" }}
        />
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
            style={{
              background: "linear-gradient(135deg, #7c3aed, #a855f7)",
            }}
          >
            Створити дошку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 64px)",
        background: "#08080c",
      }}
    >
      <BoardHeader
        board={currentBoard}
        boards={boards}
        onBoardSelect={handleBoardSelect}
        onBoardCreate={handleCreate}
        onBoardDelete={handleDelete}
        onBoardRename={handleRename}
      />
      <div
        style={{
          flex: 1,
          position: "relative",
          minHeight: 0,
        }}
      >
        <ShineBoard
          key={boardKey}
          boardId={currentBoard.id}
          initialSnapshot={currentBoard.snapshot ?? null}
        />
      </div>
    </div>
  );
}
