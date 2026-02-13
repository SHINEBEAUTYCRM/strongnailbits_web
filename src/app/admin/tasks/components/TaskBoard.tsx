"use client";

import { useState, useCallback } from "react";
import type { Task, ColumnId } from "@/types/tasks";
import { COLUMNS } from "@/types/tasks";
import { TaskCard } from "./TaskCard";
import { TaskQuickCreate } from "./TaskQuickCreate";

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, toColumn: ColumnId, position: number) => void;
  onQuickCreate: (title: string, columnId: ColumnId) => void;
  /** Mobile: show only one column at a time */
  mobileColumn?: ColumnId;
}

export function TaskBoard({ tasks, onTaskClick, onMoveTask, onQuickCreate, mobileColumn }: TaskBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData("text/plain", task.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedTaskId(task.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colId: ColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverColumn(colId);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, colId: ColumnId) => {
      e.preventDefault();
      const taskId = e.dataTransfer.getData("text/plain");
      if (taskId) {
        const colTasks = tasks.filter((t) => t.column_id === colId);
        const maxPos = colTasks.length > 0 ? Math.max(...colTasks.map((t) => t.position)) + 1 : 0;
        onMoveTask(taskId, colId, maxPos);
      }
      setDragOverColumn(null);
      setDraggedTaskId(null);
    },
    [tasks, onMoveTask],
  );

  const columnsToShow = mobileColumn ? COLUMNS.filter((c) => c.id === mobileColumn) : COLUMNS;

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4"
      style={{
        minHeight: "calc(100vh - 220px)",
      }}
    >
      {columnsToShow.map((col) => {
        const colTasks = tasks
          .filter((t) => t.column_id === col.id)
          .sort((a, b) => a.position - b.position);

        const isDragOver = dragOverColumn === col.id;

        return (
          <div
            key={col.id}
            className="shrink-0"
            style={{
              width: mobileColumn ? "100%" : 280,
              flex: mobileColumn ? "1 1 auto" : "0 0 280px",
            }}
            onDragOver={(e) => handleDragOver(e, col.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.id)}
          >
            {/* Column header */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span style={{ color: col.color, fontSize: 14 }}>{col.icon}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--a-text-body)" }}>
                  {col.label}
                </span>
                <span
                  className="text-xs px-1.5 py-0.5 rounded"
                  style={{
                    background: "var(--a-bg-hover)",
                    color: "var(--a-text-3)",
                    fontFamily: "var(--font-jetbrains-mono, 'JetBrains Mono'), monospace",
                  }}
                >
                  {colTasks.length}
                </span>
              </div>
            </div>

            {/* Column body */}
            <div
              className="flex flex-col gap-2 rounded-xl p-2 transition-colors"
              style={{
                background: isDragOver ? "rgba(168,85,247,0.06)" : "var(--a-bg-hover)",
                border: `1px solid ${isDragOver ? "rgba(168,85,247,0.2)" : "var(--a-border)"}`,
                minHeight: 120,
              }}
            >
              {colTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    opacity: draggedTaskId === task.id ? 0.4 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  <TaskCard task={task} onClick={onTaskClick} onDragStart={handleDragStart} />
                </div>
              ))}

              <TaskQuickCreate columnId={col.id} onSubmit={onQuickCreate} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
