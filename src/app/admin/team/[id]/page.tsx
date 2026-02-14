"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ListTodo, BarChart3, History } from "lucide-react";
import type { TeamMemberFull } from "@/types/team";
import type { Task, TeamMemberShort } from "@/types/tasks";
import { MemberProfile } from "./components/MemberProfile";
import { MemberTasks } from "./components/MemberTasks";
import { MemberKPI } from "./components/MemberKPI";
import { MemberActivity } from "./components/MemberActivity";

type TabId = "tasks" | "kpi" | "activity";

export default function TeamMemberPage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [member, setMember] = useState<TeamMemberFull | null>(null);
  const [currentUser, setCurrentUser] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("tasks");

  // For TaskModal reuse
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberShort[]>([]);

  useEffect(() => {
    loadMember();
    loadCurrentUser();
    loadTeamMembers();
  }, [memberId]);

  const loadMember = async () => {
    try {
      const res = await fetch(`/api/admin/team/${memberId}`);
      if (res.ok) {
        const data = await res.json();
        setMember(data);
      } else {
        router.push("/admin/team");
      }
    } catch (err) {
      console.error('[TeamMember] Load failed:', err);
      router.push("/admin/team");
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({ id: data.id, role: data.role });
      }
    } catch (err) {
      console.error('[TeamMember] Load current user failed:', err);
    }
  };

  const loadTeamMembers = async () => {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(data.map((m: TeamMemberFull) => ({ id: m.id, name: m.name, avatar_url: m.avatar_url })));
      }
    } catch (err) {
      console.error('[TeamMember] Load team members failed:', err);
    }
  };

  const handleUpdate = useCallback(
    async (field: string, value: unknown) => {
      try {
        const res = await fetch(`/api/admin/team/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        });
        if (res.ok) {
          const updated = await res.json();
          setMember((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      } catch (err) {
        console.error('[TeamMember] Update failed:', err);
      }
    },
    [memberId],
  );

  const isCeo = currentUser?.role === "ceo";
  const isSelf = currentUser?.id === memberId;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "tasks", label: "Задачі", icon: <ListTodo className="w-3.5 h-3.5" /> },
    { id: "kpi", label: "KPI", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "activity", label: "Активність", icon: <History className="w-3.5 h-3.5" /> },
  ];

  if (loading || !member) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "var(--a-accent)" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/admin/team")}
        className="flex items-center gap-2 text-xs mb-5 transition-colors"
        style={{ color: "var(--a-text-3)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--a-text-2)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--a-text-3)"; }}
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Команда
      </button>

      {/* Layout: 2 columns desktop, 1 mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5">
        {/* Left: Profile */}
        <MemberProfile member={member} isCeo={isCeo} isSelf={isSelf} onUpdate={handleUpdate} />

        {/* Right: Tabs */}
        <div>
          {/* Tab bar */}
          <div
            className="flex gap-1 mb-4 rounded-lg overflow-hidden inline-flex"
            style={{ background: "var(--a-bg-card)", border: "1px solid var(--a-border)" }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  background: activeTab === tab.id ? "rgba(168,85,247,0.12)" : "transparent",
                  color: activeTab === tab.id ? "var(--a-accent)" : "var(--a-text-3)",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            className="rounded-xl p-4"
            style={{
              background: "var(--a-bg-card)",
              border: "1px solid var(--a-border)",
              minHeight: 300,
            }}
          >
            {activeTab === "tasks" && (
              <MemberTasks memberId={memberId} onTaskClick={setSelectedTask} />
            )}
            {activeTab === "kpi" && (
              <MemberKPI memberId={memberId} memberRole={member.role} isCeo={isCeo} />
            )}
            {activeTab === "activity" && (
              <MemberActivity memberId={memberId} />
            )}
          </div>
        </div>
      </div>

      {/* Task Modal (reuse from tasks) */}
      {selectedTask && (
        <TaskModalWrapper
          task={selectedTask}
          teamMembers={teamMembers}
          currentUserId={currentUser?.id || ""}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}

// Lazy import wrapper for TaskModal to avoid circular deps
function TaskModalWrapper({
  task,
  teamMembers,
  currentUserId,
  onClose,
}: {
  task: Task;
  teamMembers: TeamMemberShort[];
  currentUserId: string;
  onClose: () => void;
}) {
  // Dynamic import
  const [Modal, setModal] = useState<React.ComponentType<{
    task: Task;
    teamMembers: TeamMemberShort[];
    currentUserId: string;
    onClose: () => void;
    onUpdate: (taskId: string, data: Record<string, unknown>) => Promise<void>;
    onDelete: (taskId: string) => Promise<void>;
  }> | null>(null);

  useEffect(() => {
    import("../../tasks/components/TaskModal").then((mod) => {
      setModal(() => mod.TaskModal);
    });
  }, []);

  const handleUpdate = async (taskId: string, data: Record<string, unknown>) => {
    await fetch(`/api/admin/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, actor_id: currentUserId }),
    });
  };

  const handleDelete = async (taskId: string) => {
    await fetch(`/api/admin/tasks/${taskId}`, { method: "DELETE" });
    onClose();
  };

  if (!Modal) return null;

  return (
    <Modal
      task={task}
      teamMembers={teamMembers}
      currentUserId={currentUserId}
      onClose={onClose}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
