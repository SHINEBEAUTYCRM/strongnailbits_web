"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
  Check,
  X,
} from "lucide-react";

interface Board {
  id: string;
  name: string;
  updated_at: string;
}

interface BoardHeaderProps {
  board: Board;
  boards: Board[];
  onBoardSelect: (id: string) => void;
  onBoardCreate: () => void;
  onBoardDelete: (id: string) => void;
  onBoardRename: (id: string, name: string) => void;
}

export default function BoardHeader({
  board,
  boards,
  onBoardSelect,
  onBoardCreate,
  onBoardDelete,
  onBoardRename,
}: BoardHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(board.name);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Save indicator — driven by CustomEvent from ShineBoard, NOT parent state
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Listen for save status from ShineBoard via CustomEvent
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ saving: boolean }>).detail;
      setSaving(detail.saving);
    };
    window.addEventListener("board-save-status", handler);
    return () => window.removeEventListener("board-save-status", handler);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Focus input when editing
  useEffect(() => {
    if (editing) {
      setEditName(board.name);
      setTimeout(() => inputRef.current?.select(), 50);
    }
  }, [editing, board.name]);

  const handleRenameSubmit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== board.name) {
      onBoardRename(board.id, trimmed);
    }
    setEditing(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 shrink-0"
      style={{
        background: "#0e0e14",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Left: board name + dropdown */}
      <div className="flex items-center gap-3">
        <div className="relative" ref={dropdownRef}>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                ref={inputRef}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameSubmit();
                  if (e.key === "Escape") setEditing(false);
                }}
                className="px-2 py-1 text-sm rounded-md outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid #7c3aed",
                  color: "#e4e4e7",
                  width: 200,
                }}
              />
              <button
                onClick={handleRenameSubmit}
                className="p-1 rounded hover:bg-white/5"
                style={{ color: "#22c55e" }}
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-1 rounded hover:bg-white/5"
                style={{ color: "#71717a" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: "#e4e4e7" }}
            >
              {board.name}
              <ChevronDown
                className="w-4 h-4 transition-transform"
                style={{
                  color: "#71717a",
                  transform: dropdownOpen ? "rotate(180deg)" : "none",
                }}
              />
            </button>
          )}

          {/* Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute top-full left-0 mt-1 w-72 rounded-xl overflow-hidden z-50"
              style={{
                background: "rgba(14,14,20,0.98)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(20px)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
              }}
            >
              <div
                className="px-3 py-2 text-xs font-medium"
                style={{ color: "#52525b" }}
              >
                Дошки
              </div>

              <div className="max-h-64 overflow-y-auto">
                {boards.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      onBoardSelect(b.id);
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                    style={{
                      color: b.id === board.id ? "#a855f7" : "#a1a1aa",
                      background:
                        b.id === board.id
                          ? "rgba(168,85,247,0.05)"
                          : "transparent",
                    }}
                  >
                    <span className="truncate">{b.name}</span>
                    <span
                      className="text-xs shrink-0 ml-2"
                      style={{ color: "#52525b" }}
                    >
                      {new Date(b.updated_at).toLocaleDateString("uk-UA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </button>
                ))}
              </div>

              <div
                className="border-t"
                style={{ borderColor: "rgba(255,255,255,0.06)" }}
              >
                <button
                  onClick={() => {
                    onBoardCreate();
                    setDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors hover:bg-white/5"
                  style={{ color: "#a855f7" }}
                >
                  <Plus className="w-4 h-4" />
                  Нова дошка
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Rename button */}
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded-md transition-colors hover:bg-white/5"
            style={{ color: "#52525b" }}
          >
            Перейменувати
          </button>
        )}
      </div>

      {/* Right: indicators + actions */}
      <div className="flex items-center gap-3">
        {/* Save indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: saving ? "#f59e0b" : "#22c55e",
              transition: "background 0.3s",
            }}
          />
          <span className="text-xs" style={{ color: "#52525b" }}>
            {saving ? "Зберігається..." : "Збережено"}
          </span>
        </div>

        {/* Delete */}
        {boards.length > 1 && (
          <div className="relative">
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <span className="text-xs" style={{ color: "#ef4444" }}>
                  Видалити?
                </span>
                <button
                  onClick={() => {
                    onBoardDelete(board.id);
                    setConfirmDelete(false);
                  }}
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                  }}
                >
                  Так
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-2 py-1 rounded text-xs"
                  style={{ color: "#71717a" }}
                >
                  Ні
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                style={{ color: "#52525b" }}
                title="Видалити дошку"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "#52525b" }}
          title={fullscreen ? "Вийти з повного екрану" : "Повний екран"}
        >
          {fullscreen ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
