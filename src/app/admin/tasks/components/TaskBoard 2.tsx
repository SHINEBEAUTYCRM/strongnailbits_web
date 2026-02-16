"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task, ColumnId, Priority } from "@/types/tasks";
import { COLUMNS } from "@/types/tasks";
import { TaskCard } from "./TaskCard";
import { TaskQuickCreate } from "./TaskQuickCreate";

interface TaskBoardProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onMoveTask: (taskId: string, toColumn: ColumnId, position: number) => void;
  onQuickCreate: (title: string, columnId: ColumnId, priority?: Priority) => void;
  mobileColumn?: ColumnId;
}

/* ─── Sortable Card Wrapper ─── */
function SortableCard({
  task,
  onTaskClick,
}: {
  task: Task;
  onTaskClick: (task: Task) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || "transform 200ms ease",
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : 0,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <TaskCard task={task} onClick={onTaskClick} />
    </div>
  );
}

/* ─── Droppable Column ─── */
function DroppableColumn({
  col,
  tasks: colTasks,
  isOver,
  onTaskClick,
  onQuickCreate,
  mobileColumn,
}: {
  col: (typeof COLUMNS)[number];
  tasks: Task[];
  isOver: boolean;
  onTaskClick: (task: Task) => void;
  onQuickCreate: (title: string, columnId: ColumnId, priority?: Priority) => void;
  mobileColumn?: ColumnId;
}) {
  const taskIds = useMemo(() => colTasks.map((t) => t.id), [colTasks]);

  return (
    <div
      className="shrink-0"
      style={{
        width: mobileColumn ? "100%" : 280,
        flex: mobileColumn ? "1 1 auto" : "0 0 280px",
      }}
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
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div
          className="flex flex-col gap-2 rounded-xl p-2 transition-all duration-200"
          style={{
            background: isOver ? "rgba(168,85,247,0.06)" : "var(--a-bg-hover)",
            border: `1px solid ${isOver ? "rgba(168,85,247,0.25)" : "var(--a-border)"}`,
            boxShadow: isOver ? "inset 0 0 0 1px rgba(168,85,247,0.1)" : "none",
            minHeight: 120,
          }}
        >
          {colTasks.map((task) => (
            <SortableCard
              key={task.id}
              task={task}
              onTaskClick={onTaskClick}
            />
          ))}

          <TaskQuickCreate columnId={col.id} onSubmit={onQuickCreate} />
        </div>
      </SortableContext>
    </div>
  );
}

/* ─── Main Board ─── */
export function TaskBoard({ tasks, onTaskClick, onMoveTask, onQuickCreate, mobileColumn }: TaskBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [overColumnId, setOverColumnId] = useState<ColumnId | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 300, tolerance: 5 } }),
    useSensor(KeyboardSensor),
  );

  // Organize tasks by column
  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnId, Task[]> = { new: [], progress: [], review: [], done: [] };
    for (const t of tasks) {
      if (map[t.column_id]) {
        map[t.column_id].push(t);
      }
    }
    // Sort by position within each column
    for (const col of Object.keys(map) as ColumnId[]) {
      map[col].sort((a, b) => a.position - b.position);
    }
    return map;
  }, [tasks]);

  const findColumnForTask = useCallback(
    (taskId: string): ColumnId | null => {
      for (const col of Object.keys(tasksByColumn) as ColumnId[]) {
        if (tasksByColumn[col].some((t) => t.id === taskId)) {
          return col;
        }
      }
      return null;
    },
    [tasksByColumn],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const task = tasks.find((t) => t.id === event.active.id);
      if (task) setActiveTask(task);
    },
    [tasks],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) { setOverColumnId(null); return; }

      // Check if we're over a column directly or over a task in a column
      const overId = over.id as string;
      const colIds = COLUMNS.map((c) => c.id);

      if (colIds.includes(overId as ColumnId)) {
        setOverColumnId(overId as ColumnId);
      } else {
        const col = findColumnForTask(overId);
        setOverColumnId(col);
      }
    },
    [findColumnForTask],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);
      setOverColumnId(null);

      if (!over) return;

      const taskId = active.id as string;
      const overId = over.id as string;

      // Determine the target column
      const colIds = COLUMNS.map((c) => c.id);
      let targetColumn: ColumnId;
      let targetPosition: number;

      if (colIds.includes(overId as ColumnId)) {
        // Dropped on an empty column area
        targetColumn = overId as ColumnId;
        targetPosition = tasksByColumn[targetColumn].length;
      } else {
        // Dropped on another task
        const overTaskCol = findColumnForTask(overId);
        if (!overTaskCol) return;
        targetColumn = overTaskCol;

        const colTasks = tasksByColumn[targetColumn];
        const overIndex = colTasks.findIndex((t) => t.id === overId);
        targetPosition = overIndex >= 0 ? overIndex : colTasks.length;
      }

      const sourceColumn = findColumnForTask(taskId);
      if (!sourceColumn) return;

      // Same column, same position — nothing to do
      if (sourceColumn === targetColumn) {
        const colTasks = tasksByColumn[targetColumn];
        const oldIndex = colTasks.findIndex((t) => t.id === taskId);
        if (oldIndex === targetPosition) return;
      }

      onMoveTask(taskId, targetColumn, targetPosition);
    },
    [tasksByColumn, findColumnForTask, onMoveTask],
  );

  const columnsToShow = mobileColumn ? COLUMNS.filter((c) => c.id === mobileColumn) : COLUMNS;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex gap-4 overflow-x-auto pb-4"
        style={{ minHeight: "calc(100vh - 220px)" }}
      >
        {columnsToShow.map((col) => (
          <DroppableColumn
            key={col.id}
            col={col}
            tasks={tasksByColumn[col.id]}
            isOver={overColumnId === col.id}
            onTaskClick={onTaskClick}
            onQuickCreate={onQuickCreate}
            mobileColumn={mobileColumn}
          />
        ))}
      </div>

      {/* Drag overlay — floating card */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask ? (
          <div style={{ opacity: 0.9, transform: "rotate(2deg)" }}>
            <TaskCard task={activeTask} onClick={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
