"use client";

import dynamic from "next/dynamic";

// dynamic + ssr:false MUST be inside a Client Component (Next.js 16 Turbopack)
const TldrawWrapper = dynamic(() => import("./TldrawWrapper"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "var(--a-bg, #08080c)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--a-text-4, #888)",
        fontSize: 14,
      }}
    >
      Завантаження дошки...
    </div>
  ),
});

interface BoardLoaderProps {
  boardId: string;
  initialSnapshot: unknown;
}

export default function BoardLoader({
  boardId,
  initialSnapshot,
}: BoardLoaderProps) {
  return <TldrawWrapper boardId={boardId} initialSnapshot={initialSnapshot} />;
}
