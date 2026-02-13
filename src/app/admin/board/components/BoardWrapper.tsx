"use client";

import dynamic from "next/dynamic";
import type { TLEditorSnapshot, TLStoreSnapshot } from "tldraw";

// dynamic + ssr:false must be in a Client Component (Next.js 16 Turbopack requirement)
const BoardClient = dynamic(() => import("./BoardClient"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "calc(100vh - 64px)",
        background: "var(--a-bg-card)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "var(--a-text-4)",
        fontSize: 14,
      }}
    >
      Завантаження дошки...
    </div>
  ),
});

interface Props {
  boardId: string | null;
  boardName: string;
  initialSnapshot: TLEditorSnapshot | TLStoreSnapshot | null;
  boards: Array<{ id: string; name: string; updated_at: string }>;
}

export default function BoardWrapper(props: Props) {
  return <BoardClient {...props} />;
}
