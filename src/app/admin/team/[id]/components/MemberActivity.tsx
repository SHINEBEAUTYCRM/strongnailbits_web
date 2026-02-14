"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { TaskActivity } from "@/types/tasks";

interface MemberActivityProps {
  memberId: string;
}

const ACTION_LABELS: Record<string, string> = {
  created: "створив задачу",
  moved: "перемістив",
  assigned: "призначив",
  comment: "додав коментар",
  checklist: "оновив чеклист",
};

const COL_LABELS: Record<string, string> = {
  new: "Нові",
  progress: "В роботі",
  review: "Перевірка",
  done: "Готово",
};

export function MemberActivity({ memberId }: MemberActivityProps) {
  const [activity, setActivity] = useState<TaskActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/team/${memberId}/activity`);
        if (res.ok) {
          const data = await res.json();
          setActivity(data);
        }
      } catch (err) {
        console.error('[MemberActivity] Fetch failed:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin" style={{ color: "#52525b" }} />
      </div>
    );
  }

  if (activity.length === 0) {
    return <p className="text-xs text-center py-8" style={{ color: "#52525b" }}>Немає активності</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {activity.map((a) => {
        let detail = ACTION_LABELS[a.action] || a.action;
        if (a.action === "moved" && a.details) {
          const d = a.details as Record<string, string>;
          const from = COL_LABELS[d.from] || d.from;
          const to = COL_LABELS[d.to] || d.to;
          detail = `перемістив з ${from} → ${to}`;
        }
        if (a.action === "created" && a.details) {
          const d = a.details as Record<string, string>;
          detail = `створив задачу «${d.title || ""}»`;
        }

        return (
          <div key={a.id} className="flex items-start gap-2.5 py-1.5">
            <div className="shrink-0 w-1.5 h-1.5 rounded-full mt-1.5" style={{ background: "#52525b" }} />
            <div className="flex-1 min-w-0">
              <span className="text-xs" style={{ color: "#a1a1aa" }}>
                {detail}
              </span>
              <div className="text-[10px] mt-0.5" style={{ color: "#52525b", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                {formatTime(a.created_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${day}.${month} ${h}:${m}`;
}
