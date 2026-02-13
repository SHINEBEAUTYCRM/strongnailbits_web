"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LayoutGrid, Calendar, BarChart3, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Task, ColumnId, Priority, TaskView, TeamMemberShort } from "@/types/tasks";
import { COLUMNS } from "@/types/tasks";
import { TaskBoard } from "./components/TaskBoard";
import { TaskFilters } from "./components/TaskFilters";
import { TaskCalendar } from "./components/TaskCalendar";
import { TaskDashboard } from "./components/TaskDashboard";
import { TaskModal } from "./components/TaskModal";

export default function TasksPage() {
  // ── State ──
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMemberShort[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<TaskView>("board");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<Priority | null>(null);

  // Mobile
  const [mobileColumn, setMobileColumn] = useState<ColumnId>("new");
  const [isMobile, setIsMobile] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Load data ──
  useEffect(() => {
    loadTasks();
    loadTeamMembers();
    loadCurrentUser();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch("/api/admin/tasks");
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from("team_members")
        .select("id, name, avatar_url")
        .eq("is_active", true)
        .order("name");
      if (data) setTeamMembers(data);
    } catch { /* ignore */ }
  };

  const loadCurrentUser = async () => {
    try {
      // Get from the admin session cookie — we'll extract from the page context
      // For simplicity, fetch from the auth API
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.id) setCurrentUserId(data.id);
      }
    } catch { /* ignore */ }
  };

  // ── Realtime ──
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, (payload: { eventType: string; new: unknown; old: unknown }) => {
        if (payload.eventType === "INSERT") {
          // Reload to get full joined data
          loadTasks();
        } else if (payload.eventType === "UPDATE") {
          const updated = payload.new as Task;
          setTasks((prev) =>
            prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t)),
          );
        } else if (payload.eventType === "DELETE") {
          const deleted = payload.old as { id: string };
          setTasks((prev) => prev.filter((t) => t.id !== deleted.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mobile detection ──
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;
      if (isInput) return;

      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        // Focus on the quick create input of the first column
        // This is handled by the board itself
      }
      if (e.key === "1") { e.preventDefault(); setView("board"); }
      if (e.key === "2") { e.preventDefault(); setView("calendar"); }
      if (e.key === "3") { e.preventDefault(); setView("dashboard"); }
      if (e.key === "/") { e.preventDefault(); searchInputRef.current?.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Filter tasks ──
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    if (assigneeFilter) {
      result = result.filter((t) => t.assignee_id === assigneeFilter);
    }
    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    return result;
  }, [tasks, search, assigneeFilter, priorityFilter]);

  // ── Stats ──
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.column_id === "done").length;
  const progressPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;

  // ── Handlers ──
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTask(task);
  }, []);

  const handleMoveTask = useCallback(
    async (taskId: string, toColumn: ColumnId, position: number) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, column_id: toColumn, position } : t,
        ),
      );

      try {
        await fetch(`/api/admin/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ column_id: toColumn, position, actor_id: currentUserId }),
        });
      } catch {
        // Reload on error
        loadTasks();
      }
    },
    [currentUserId],
  );

  const handleQuickCreate = useCallback(
    async (title: string, columnId: ColumnId) => {
      try {
        const res = await fetch("/api/admin/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, column_id: columnId, created_by: currentUserId }),
        });
        if (res.ok) {
          const task = await res.json();
          setTasks((prev) => [...prev, task]);
        }
      } catch { /* ignore */ }
    },
    [currentUserId],
  );

  const handleUpdateTask = useCallback(
    async (taskId: string, data: Record<string, unknown>) => {
      try {
        const res = await fetch(`/api/admin/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...data, actor_id: currentUserId }),
        });
        if (res.ok) {
          const updated = await res.json();
          setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t)));
          setSelectedTask((prev) => (prev?.id === taskId ? { ...prev, ...updated } : prev));
        }
      } catch { /* ignore */ }
    },
    [currentUserId],
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      try {
        await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE" });
        setTasks((prev) => prev.filter((t) => t.id !== taskId));
      } catch { /* ignore */ }
    },
    [],
  );

  // ── View tabs config ──
  const views: { id: TaskView; label: string; icon: React.ReactNode }[] = [
    { id: "board", label: "Дошка", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
    { id: "calendar", label: "Календар", icon: <Calendar className="w-3.5 h-3.5" /> },
    { id: "dashboard", label: "Дашборд", icon: <BarChart3 className="w-3.5 h-3.5" /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a855f7" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{ color: "var(--a-text)" }}>
            Задачі
          </h1>

          {/* View switcher */}
          <div
            className="flex items-center rounded-lg overflow-hidden"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            {views.map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors"
                style={{
                  background: view === v.id ? "rgba(168,85,247,0.12)" : "transparent",
                  color: view === v.id ? "#a855f7" : "var(--a-text-3)",
                }}
              >
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--a-text-3)" }}>
            Всього{" "}
            <span style={{ color: "var(--a-text-body)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              {totalTasks}
            </span>
          </span>
          <span className="text-xs" style={{ color: "var(--a-text-3)" }}>
            Готово{" "}
            <span style={{ color: "#22c55e", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              {doneTasks}
            </span>
          </span>
          <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--a-bg-hover)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: "#22c55e", opacity: 0.6 }}
            />
          </div>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="mb-5">
        <TaskFilters
          search={search}
          onSearchChange={setSearch}
          assigneeFilter={assigneeFilter}
          onAssigneeChange={setAssigneeFilter}
          priorityFilter={priorityFilter}
          onPriorityChange={setPriorityFilter}
          teamMembers={teamMembers}
          searchInputRef={searchInputRef}
        />
      </div>

      {/* ── Mobile column tabs (board view) ── */}
      {isMobile && view === "board" && (
        <div
          className="flex gap-1 mb-4 overflow-x-auto pb-1"
        >
          {COLUMNS.map((col) => {
            const count = filteredTasks.filter((t) => t.column_id === col.id).length;
            return (
              <button
                key={col.id}
                onClick={() => setMobileColumn(col.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: mobileColumn === col.id ? `${col.color}15` : "transparent",
                  color: mobileColumn === col.id ? col.color : "var(--a-text-3)",
                  border: `1px solid ${mobileColumn === col.id ? `${col.color}30` : "transparent"}`,
                }}
              >
                <span>{col.icon}</span>
                {col.label}
                <span
                  className="text-[10px] font-mono"
                  style={{ fontFamily: "var(--font-jetbrains-mono, monospace)" }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Content ── */}
      {view === "board" && (
        <TaskBoard
          tasks={filteredTasks}
          onTaskClick={handleTaskClick}
          onMoveTask={handleMoveTask}
          onQuickCreate={handleQuickCreate}
          mobileColumn={isMobile ? mobileColumn : undefined}
        />
      )}
      {view === "calendar" && (
        <TaskCalendar tasks={filteredTasks} onTaskClick={handleTaskClick} />
      )}
      {view === "dashboard" && (
        <TaskDashboard tasks={filteredTasks} teamMembers={teamMembers} onTaskClick={handleTaskClick} />
      )}

      {/* ── Modal ── */}
      {selectedTask && (
        <TaskModal
          task={selectedTask}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onClose={() => setSelectedTask(null)}
          onUpdate={handleUpdateTask}
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}
