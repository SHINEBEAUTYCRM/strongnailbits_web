import { createClient } from "@/lib/supabase/server";
import BoardWrapper from "./components/BoardWrapper";

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
    <BoardWrapper
      boardId={defaultBoard?.id || null}
      boardName={defaultBoard?.name || "Нова дошка"}
      initialSnapshot={snapshot}
      boards={boards || []}
    />
  );
}
