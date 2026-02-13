import { createClient } from "@/lib/supabase/server";
import dynamic from "next/dynamic";

// CRITICAL: tldraw only runs client-side, never SSR
const BoardClient = dynamic(() => import("./components/BoardClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "calc(100vh - 64px)",
        background: "#0e0e14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#52525b",
        fontSize: 14,
      }}
    >
      Завантаження дошки...
    </div>
  ),
});

export default async function BoardPage() {
  const supabase = await createClient();

  // Fetch board list (without heavy snapshots)
  const { data: boards } = await supabase
    .from("boards")
    .select("id, name, updated_at")
    .order("updated_at", { ascending: false });

  const defaultBoard = boards?.[0];

  // Fetch snapshot for the default board
  let snapshot = null;
  if (defaultBoard) {
    const { data } = await supabase
      .from("boards")
      .select("snapshot")
      .eq("id", defaultBoard.id)
      .single();
    snapshot = data?.snapshot ?? null;
  }

  return (
    <BoardClient
      boardId={defaultBoard?.id || null}
      boardName={defaultBoard?.name || "Нова дошка"}
      initialSnapshot={snapshot}
      boards={boards || []}
    />
  );
}
