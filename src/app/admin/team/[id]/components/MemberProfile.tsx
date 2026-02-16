"use client";

import { useState } from "react";
import {
  Phone,
  Mail,
  AtSign,
  Cake,
  Calendar,
  Clock,
  DollarSign,
  Eye,
  EyeOff,
  FileText,
  Tag,
  Loader2,
} from "lucide-react";
import { ROLES, DEPARTMENTS } from "@/lib/admin/team-config";
import type { RoleKey, DepartmentKey } from "@/lib/admin/team-config";
import type { TeamMemberFull } from "@/types/team";

interface MemberProfileProps {
  member: TeamMemberFull;
  isCeo: boolean;
  isSelf: boolean;
  onUpdate: (field: string, value: unknown) => Promise<void>;
}

export function MemberProfile({ member, isCeo, isSelf, onUpdate }: MemberProfileProps) {
  const [saving, setSaving] = useState<string | null>(null);
  const [showSalary, setShowSalary] = useState(false);

  const canEdit = isCeo || isSelf;

  const roleConfig = ROLES[member.role as RoleKey] || { label: member.role, color: "#71717a" };
  const deptConfig = member.department ? DEPARTMENTS[member.department as DepartmentKey] : null;

  const handleSave = async (field: string, value: unknown) => {
    setSaving(field);
    await onUpdate(field, value);
    setSaving(null);
  };

  const initials = member.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
      }}
    >
      {/* Avatar + Name + Role */}
      <div className="flex flex-col items-center text-center mb-5">
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.name}
            className="w-20 h-20 rounded-full object-cover mb-3"
            style={{ border: `3px solid ${roleConfig.color}` }}
          />
        ) : (
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-white text-xl font-bold mb-3"
            style={{ background: roleConfig.color }}
          >
            {initials}
          </div>
        )}
        <h2 className="text-base font-semibold" style={{ color: "var(--a-text)" }}>
          {member.name}
        </h2>

        {/* Role badge */}
        <span
          className="mt-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full"
          style={{
            background: `${roleConfig.color}18`,
            color: roleConfig.color,
          }}
        >
          {roleConfig.label}
        </span>

        {/* Department */}
        {deptConfig && (
          <span className="mt-1 text-[11px]" style={{ color: "var(--a-text-4)" }}>
            {deptConfig.label}
          </span>
        )}

        {/* Position */}
        {member.position_title && (
          <span className="text-[11px]" style={{ color: "var(--a-text-4)" }}>
            {member.position_title}
          </span>
        )}

        {/* Active/Inactive */}
        <span
          className="mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{
            background: member.is_active ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            color: member.is_active ? "#22c55e" : "#ef4444",
          }}
        >
          {member.is_active ? "Активний" : "Неактивний"}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {/* Phone */}
        {member.phone && (
          <InfoRow icon={Phone} label="Телефон">
            <a
              href={`tel:${member.phone}`}
              className="text-xs transition-colors"
              style={{
                color: "var(--a-text-body)",
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {member.phone}
            </a>
          </InfoRow>
        )}

        {/* Email */}
        <EditableRow
          icon={Mail}
          label="Email"
          value={member.email || ""}
          field="email"
          type="email"
          canEdit={canEdit}
          saving={saving}
          onSave={handleSave}
        />

        {/* Telegram */}
        <EditableRow
          icon={AtSign}
          label="Telegram"
          value={member.telegram_username || ""}
          field="telegram_username"
          canEdit={canEdit}
          saving={saving}
          onSave={handleSave}
          renderDisplay={(val) =>
            val ? (
              <a
                href={`https://t.me/${val.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs transition-colors"
                style={{ color: "#38bdf8" }}
              >
                @{val.replace("@", "")}
              </a>
            ) : null
          }
        />

        {/* Birthday */}
        <EditableRow
          icon={Cake}
          label="День народження"
          value={member.birthday || ""}
          field="birthday"
          type="date"
          canEdit={canEdit}
          saving={saving}
          onSave={handleSave}
        />

        {/* Hire date */}
        {member.hire_date && (
          <InfoRow icon={Calendar} label="В команді з">
            <span className="text-xs" style={{ color: "var(--a-text-body)" }}>
              {new Date(member.hire_date).toLocaleDateString("uk-UA")}
            </span>
          </InfoRow>
        )}

        {/* Schedule */}
        <EditableRow
          icon={Clock}
          label="Графік"
          value={member.schedule || ""}
          field="schedule"
          canEdit={canEdit}
          saving={saving}
          onSave={handleSave}
          placeholder="Пн–Пт, 9:00–18:00"
        />

        {/* Work hours */}
        <EditableRow
          icon={Clock}
          label="Робочий час"
          value={member.work_hours || ""}
          field="work_hours"
          canEdit={canEdit}
          saving={saving}
          onSave={handleSave}
          placeholder="40 год/тиждень"
        />

        {/* Salary — CEO only */}
        {isCeo && (
          <InfoRow icon={DollarSign} label="Зарплата">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono" style={{ color: "var(--a-text-body)" }}>
                {showSalary && member.salary != null
                  ? `${member.salary.toLocaleString("uk-UA")} ₴`
                  : "••••••"}
              </span>
              <button
                onClick={() => setShowSalary(!showSalary)}
                className="flex items-center justify-center w-5 h-5 rounded"
                style={{ color: "var(--a-text-4)" }}
              >
                {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </InfoRow>
        )}

        {/* Skills */}
        {member.skills && member.skills.length > 0 && (
          <InfoRow icon={Tag} label="Скіли">
            <div className="flex flex-wrap gap-1">
              {member.skills.map((skill) => (
                <span
                  key={skill}
                  className="text-[10px] px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(168,85,247,0.1)",
                    color: "#a78bfa",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </InfoRow>
        )}

        {/* Notes — CEO only */}
        {isCeo && member.notes && (
          <InfoRow icon={FileText} label="Нотатки">
            <span className="text-xs" style={{ color: "var(--a-text-3)" }}>
              {member.notes}
            </span>
          </InfoRow>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helper Components                                                  */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-3 py-2.5 px-2 rounded-lg"
      style={{ borderBottom: "1px solid var(--a-border)" }}
    >
      <Icon className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: "var(--a-text-4)" }} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium mb-0.5" style={{ color: "var(--a-text-4)" }}>
          {label}
        </div>
        {children}
      </div>
    </div>
  );
}

function EditableRow({
  icon,
  label,
  value,
  field,
  type = "text",
  canEdit,
  saving,
  onSave,
  placeholder,
  renderDisplay,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  field: string;
  type?: string;
  canEdit: boolean;
  saving: string | null;
  onSave: (field: string, value: string) => Promise<void>;
  placeholder?: string;
  renderDisplay?: (val: string) => React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleStartEdit = () => {
    if (!canEdit) return;
    setEditValue(value);
    setEditing(true);
  };

  const handleSave = async () => {
    if (editValue !== value) {
      await onSave(field, editValue);
    }
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") setEditing(false);
  };

  const isSaving = saving === field;

  return (
    <InfoRow icon={icon} label={label}>
      {editing ? (
        <div className="flex items-center gap-1.5">
          <input
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            autoFocus
            placeholder={placeholder}
            className="text-xs rounded-md px-2 py-1 outline-none flex-1"
            style={{
              background: "var(--a-bg-input)",
              border: "1px solid var(--a-accent)",
              color: "var(--a-text)",
            }}
          />
          {isSaving && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--a-accent)" }} />}
        </div>
      ) : (
        <div
          onClick={handleStartEdit}
          className="text-xs"
          style={{
            color: value ? "var(--a-text-body)" : "var(--a-text-5)",
            cursor: canEdit ? "pointer" : "default",
          }}
        >
          {renderDisplay ? renderDisplay(value) : value || placeholder || "—"}
        </div>
      )}
    </InfoRow>
  );
}
