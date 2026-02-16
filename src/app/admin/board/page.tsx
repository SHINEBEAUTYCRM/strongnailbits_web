import { createClient } from "@/lib/supabase/server";
import BoardLoader from "./BoardLoader";

export default async function BoardPage() {
  const supabase = await createClient();

  let { data: board } = await supabase
    .from("boards")
    .select("id, name")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!board) {
    const { data: newBoard } = await supabase
      .from("boards")
      .insert({ name: "Головна дошка" })
      .select("id, name")
      .single();
    board = newBoard;
  }

  if (!board) {
    return (
      <div style={{ padding: 40, color: "#ef4444" }}>
        Помилка створення дошки
      </div>
    );
  }

  return (
    <div className="board-page">
      {/* Header */}
      <div
        style={{
          height: 44,
          minHeight: 44,
          flexShrink: 0,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--a-bg-card, #0e0e14)",
          borderBottom: "1px solid var(--a-border, rgba(255,255,255,0.06))",
        }}
      >
        <span
          style={{
            color: "var(--a-text, #f0f0f0)",
            fontFamily: "Outfit, sans-serif",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {board.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            id="shine-board-status"
            style={{ fontSize: 12, fontFamily: "Outfit, sans-serif" }}
          />
          <button
            id="shine-board-save-btn"
            style={{
              background: "#a855f7",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "7px 20px",
              fontSize: 13,
              fontFamily: "Outfit, sans-serif",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Зберегти
          </button>
        </div>
      </div>

      {/* Canvas — fills remaining space */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <BoardLoader boardId={board.id} />
      </div>
    </div>
  );
}
