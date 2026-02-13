import { createClient } from "@/lib/supabase/server";
import BoardLoader from "./components/BoardLoader";
import SaveButton from "./components/SaveButton";

export default async function BoardPage() {
  const supabase = await createClient();

  // Get or create default board
  let { data: board } = await supabase
    .from("boards")
    .select("id, name, snapshot")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (!board) {
    const { data: newBoard } = await supabase
      .from("boards")
      .insert({ name: "Головна дошка" })
      .select("id, name, snapshot")
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
    <div className="board-fullbleed">
      {/* Minimal header */}
      <div
        style={{
          height: 40,
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
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {board.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            id="shine-board-status"
            style={{ fontSize: 12, color: "var(--a-text-4, #888)" }}
          />
          <SaveButton />
        </div>
      </div>

      {/* TLDRAW — fills remaining space via flex */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
        <BoardLoader boardId={board.id} initialSnapshot={board.snapshot} />
      </div>
    </div>
  );
}
