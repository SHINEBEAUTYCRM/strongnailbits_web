"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2, Phone, AtSign, X } from "lucide-react";
import { ROLES, DEPARTMENTS } from "@/lib/admin/team-config";
import type { RoleKey, DepartmentKey } from "@/lib/admin/team-config";
import type { TeamMemberCard } from "@/types/team";

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<TeamMemberCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState<DepartmentKey | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<string>("");

  useEffect(() => {
    loadMembers();
    loadCurrentUser();
  }, []);

  const loadMembers = async () => {
    try {
      const res = await fetch("/api/admin/team");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const res = await fetch("/api/admin/auth/me");
      if (res.ok) {
        const data = await res.json();
        setCurrentRole(data.role || "");
      }
    } catch { /* ignore */ }
  };

  const isCeo = currentRole === "ceo";

  // Filter
  const filtered = members.filter((m) => {
    if (deptFilter && m.department !== deptFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAdd = useCallback(async (name: string, phone: string, role: string) => {
    try {
      const res = await fetch("/api/admin/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, role }),
      });
      if (res.ok) {
        setShowAddModal(false);
        loadMembers();
      }
    } catch { /* ignore */ }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#a855f7" }} />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <h1 className="text-xl font-bold" style={{ color: "#f4f4f5" }}>
          Команда
          <span
            className="ml-2 text-sm font-normal"
            style={{ color: "#52525b", fontFamily: "var(--font-jetbrains-mono, monospace)" }}
          >
            {members.filter((m) => m.is_active).length}
          </span>
        </h1>

        {isCeo && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity"
            style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
          >
            <Plus className="w-4 h-4" />
            Додати співробітника
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Search */}
        <div className="relative" style={{ minWidth: 180 }}>
          <Search
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: "#52525b" }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none"
            style={{
              background: "#111116",
              border: "1px solid rgba(255,255,255,0.06)",
              color: "#e4e4e7",
            }}
          />
        </div>

        <div style={{ width: 1, height: 20, background: "rgba(255,255,255,0.06)" }} />

        {/* Department filter */}
        <DeptButton label="Всі" active={deptFilter === null} onClick={() => setDeptFilter(null)} />
        {(Object.entries(DEPARTMENTS) as [DepartmentKey, typeof DEPARTMENTS[DepartmentKey]][]).map(([key, dept]) => (
          <DeptButton
            key={key}
            label={dept.label}
            active={deptFilter === key}
            onClick={() => setDeptFilter(deptFilter === key ? null : key)}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((member) => (
          <MemberCard key={member.id} member={member} onClick={() => router.push(`/admin/team/${member.id}`)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-center py-12 text-sm" style={{ color: "#52525b" }}>
          Нікого не знайдено
        </p>
      )}

      {/* Add modal */}
      {showAddModal && (
        <AddMemberModal onClose={() => setShowAddModal(false)} onSubmit={handleAdd} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Member Card ────
// ═══════════════════════════════════════

function MemberCard({ member, onClick }: { member: TeamMemberCard; onClick: () => void }) {
  const roleConfig = ROLES[member.role as RoleKey];
  const color = member.color || roleConfig?.color || "#a855f7";
  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      onClick={onClick}
      className="group cursor-pointer rounded-xl p-4 transition-all"
      style={{
        background: "#0e0e14",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${color}40`;
        e.currentTarget.style.boxShadow = `0 0 0 1px ${color}15`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div
          className="shrink-0 flex items-center justify-center text-lg font-bold"
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: `${color}15`,
            color,
            border: `2px solid ${color}`,
          }}
        >
          {member.avatar_url ? (
            <img src={member.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name */}
          <h3 className="text-sm font-semibold truncate" style={{ color: "#e4e4e7" }}>
            {member.name}
          </h3>

          {/* Role badge */}
          <span
            className="inline-block text-[10px] px-2 py-0.5 rounded-md mt-1 font-medium"
            style={{
              background: `${color}15`,
              color,
              border: `1px solid ${color}25`,
            }}
          >
            {roleConfig?.label || member.role}
          </span>

          {/* Department */}
          {member.department && (
            <p className="text-[11px] mt-1" style={{ color: "#52525b" }}>
              {DEPARTMENTS[member.department as DepartmentKey]?.label || member.department}
            </p>
          )}
        </div>

        {/* Status dot */}
        <span
          className="shrink-0 w-2 h-2 rounded-full mt-1"
          style={{ background: member.is_active ? "#22c55e" : "#ef4444" }}
          title={member.is_active ? "Активний" : "Неактивний"}
        />
      </div>

      {/* Meta row */}
      <div
        className="flex items-center justify-between mt-3 pt-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div className="flex items-center gap-3">
          {/* Phone */}
          <a
            href={`tel:${member.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-[11px] transition-colors"
            style={{ color: "#71717a" }}
          >
            <Phone className="w-3 h-3" />
            <span className="font-mono" style={{ fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
              {member.phone}
            </span>
          </a>

          {/* Telegram */}
          {member.telegram_username && (
            <a
              href={`https://t.me/${member.telegram_username.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-[11px]"
              style={{ color: "#71717a" }}
            >
              <AtSign className="w-3 h-3" />
              {member.telegram_username}
            </a>
          )}
        </div>

        {/* Task stats */}
        <span className="text-[10px]" style={{ color: "#52525b" }}>
          {member.tasks_count} задач
          {member.overdue_count > 0 && (
            <span style={{ color: "#ef4444" }}> / {member.overdue_count} простр.</span>
          )}
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// ──── Department Filter Button ────
// ═══════════════════════════════════════

function DeptButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? "rgba(168,85,247,0.12)" : "transparent",
        color: active ? "#a855f7" : "#71717a",
        border: `1px solid ${active ? "rgba(168,85,247,0.2)" : "transparent"}`,
      }}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════
// ──── Add Member Modal ────
// ═══════════════════════════════════════

function AddMemberModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (name: string, phone: string, role: string) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("sales_manager");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && phone.trim()) {
      onSubmit(name.trim(), phone.trim(), role);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl p-5"
        style={{
          maxWidth: 420,
          background: "#0c0c12",
          border: "1px solid rgba(255,255,255,0.06)",
          animation: "modalIn 0.2s ease-out",
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold" style={{ color: "#e4e4e7" }}>
            Новий співробітник
          </h2>
          <button type="button" onClick={onClose} style={{ color: "#52525b" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <ModalInput label="Ім'я" value={name} onChange={setName} placeholder="Ім'я Прізвище" />
          <ModalInput label="Телефон" value={phone} onChange={setPhone} placeholder="+380XXXXXXXXX" type="tel" />

          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "#71717a" }}>Роль</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
              style={{
                background: "#111116",
                border: "1px solid rgba(255,255,255,0.06)",
                color: "#d4d4d8",
              }}
            >
              {(Object.entries(ROLES) as [RoleKey, typeof ROLES[RoleKey]][]).map(([key, r]) => (
                <option key={key} value={key}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={!name.trim() || !phone.trim()}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}
        >
          Додати
        </button>
      </form>
    </div>
  );
}

function ModalInput({ label, value, onChange, placeholder, type = "text" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium mb-1 block" style={{ color: "#71717a" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
        style={{
          background: "#111116",
          border: "1px solid rgba(255,255,255,0.06)",
          color: "#d4d4d8",
        }}
      />
    </div>
  );
}
