"use client";

import dynamic from "next/dynamic";

const BoardCanvas = dynamic(() => import("./BoardCanvas"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--a-text-4, #888)",
        fontFamily: "Outfit, sans-serif",
        fontSize: 14,
      }}
    >
      Завантаження дошки...
    </div>
  ),
});

export default function BoardLoader({ boardId }: { boardId: string }) {
  return <BoardCanvas boardId={boardId} />;
}
