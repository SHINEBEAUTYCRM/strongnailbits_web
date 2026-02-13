"use client";

import { useState } from "react";
import {
  Phone, Mail, AtSign, Cake, Calendar, Clock, DollarSign, Eye, EyeOff,
  FileText, Tag, Loader2,
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
  const [showSalary, setShowSalary] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  const roleConfig = ROLES[member.role as RoleKey];
  const color = member.color || roleConfig?.color || "#a855f7";
  const initials = member.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  const canEdit = isCeo || isSelf;

  const handleSave = async (field: string, value: unknown) => {
    setSaving(field);
    await onUpdate(field, value);
    setSaving(null);
  };

  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: "var(--a-bg-card)",
        border: "1px solid var(--a-border)",
      }}
    >
      {/* Avatar + Name */}
      <div className="flex flex-col items-center mb-5">
        <div
          className="flex items-center justify-center text-2xl font-bold mb-3"
          style={{
            width: 100,
            height: 100,
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

        <h2 className="text-lg font-bold" style={{ color: "var(--a-text-body)" }}>
          {member.name}
        </h2>

        <div className="flex items-center gap-2 mt-1">
          <span
            className="text-xs px-2 py-0.5 rounded-md font-medium"
            style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
          >
            {roleConfig?.label || member.role}
          </span>
          {member.department && (
            <span className="text-xs" style={{ color: "var(--a-text-4)" }}>
              · {DEPARTMENTS[member.department as DepartmentKey]?.label || member.department}
            </span>
          )}
        </div>

        {member.position_title && (
          <p className="text-xs mt-1" style={{ color: "var(--a-text-3)" }}>{member.position_title}</p>
        )}

        <span
          className="inline-flex items-center gap-1 text-[10px] mt-2 px-2 py-0.5 rounded-full"
          style={{
            background: member.is_active ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
            color: member.is_active ? "#22c55e" : "#ef4444",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: member.is_active ? "#22c55e" : "#ef4444" }} />
          {member.is_active ? "Активний" : "Неактивний"}
        </span>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-3">
        {/* Phone */}
        <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Телефон">
          <a href={`tel:${member.phone}`} className="font-mono text-xs" style={{ color: "var(--a-text-name)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
            {member.phone}
          </a>
        </InfoRow>

        {/* Email */}
        <EditableRow
          icon={<Mail className="w-3.5 h-3.5" />}
          label="Email"
          value={member.email || ""}
          canEdit={canEdit}
          saving={saving === "email"}
          onSave={(v) => handleSave("email", v || null)}
          placeholder="email@example.com"
        />

        {/* Telegram */}
        <EditableRow
          icon={<AtSign className="w-3.5 h-3.5" />}
          label="Telegram"
          value={member.telegram_username || ""}
          canEdit={canEdit}
          saving={saving === "telegram_username"}
          onSave={(v) => handleSave("telegram_username", v || null)}
          placeholder="@username"
          link={member.telegram_username ? `https://t.me/${member.telegram_username.replace("@", "")}` : undefined}
        />

        {/* Birthday */}
        <EditableRow
          icon={<Cake className="w-3.5 h-3.5" />}
          label="День народження"
          value={member.birthday || ""}
          canEdit={canEdit}
          saving={saving === "birthday"}
          onSave={(v) => handleSave("birthday", v || null)}
          type="date"
        />

        <Divider />

        {/* Hire date */}
        {(isCeo || member.hire_date) && (
          <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="В команді з">
            {isCeo ? (
              <input
                type="date"
                defaultValue={member.hire_date || ""}
                onBlur={(e) => handleSave("hire_date", e.target.value || null)}
                className="bg-transparent border-none outline-none text-xs"
                style={{ color: "var(--a-text-name)", colorScheme: "dark" }}
              />
            ) : (
              <span className="text-xs font-mono" style={{ color: "var(--a-text-name)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                {member.hire_date ? formatDate(member.hire_date) : "—"}
              </span>
            )}
          </InfoRow>
        )}

        {/* Schedule */}
        <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Графік">
          <span className="text-xs" style={{ color: "var(--a-text-name)" }}>
            {member.schedule || "5/2"} {member.work_hours || "09:00-18:00"}
          </span>
        </InfoRow>

        {/* Salary (CEO only) */}
        {isCeo && member.salary !== null && member.salary !== undefined && (
          <InfoRow icon={<DollarSign className="w-3.5 h-3.5" />} label="Зарплата">
            <div className="flex items-center gap-2">
              {showSalary ? (
                <span className="text-xs font-mono" style={{ color: "var(--a-text-name)", fontFamily: "var(--font-jetbrains-mono, monospace)" }}>
                  {Number(member.salary).toLocaleString("uk-UA")} ₴
                </span>
              ) : (
                <span className="text-xs" style={{ color: "var(--a-text-4)" }}>••••••</span>
              )}
              <button onClick={() => setShowSalary(!showSalary)} style={{ color: "var(--a-text-4)" }}>
                {showSalary ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          </InfoRow>
        )}

        <Divider />

        {/* Bio */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileText className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Про себе</span>
          </div>
          {canEdit ? (
            <textarea
              defaultValue={member.personal_bio || ""}
              onBlur={(e) => handleSave("personal_bio", e.target.value)}
              placeholder="Розкажіть про себе..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
              style={{
                background: "var(--a-bg-card)",
                border: "1px solid var(--a-border)",
                color: "var(--a-text-name)",
              }}
            />
          ) : (
            <p className="text-xs" style={{ color: "var(--a-text-2)" }}>
              {member.personal_bio || "—"}
            </p>
          )}
        </div>

        {/* Skills */}
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Tag className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
            <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Навички</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {(member.skills || []).map((skill) => (
              <span
                key={skill}
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: "rgba(168,85,247,0.1)", color: "#a78bfa" }}
              >
                {skill}
              </span>
            ))}
            {(member.skills || []).length === 0 && (
              <span className="text-xs" style={{ color: "var(--a-text-4)" }}>—</span>
            )}
          </div>
        </div>

        {/* CEO notes */}
        {isCeo && (
          <>
            <Divider />
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <FileText className="w-3.5 h-3.5" style={{ color: "var(--a-text-4)" }} />
                <span className="text-xs font-medium" style={{ color: "var(--a-text-3)" }}>Нотатки CEO</span>
              </div>
              <textarea
                defaultValue={member.notes || ""}
                onBlur={(e) => handleSave("notes", e.target.value)}
                placeholder="Нотатки..."
                rows={2}
                className="w-full px-3 py-2 rounded-lg text-xs outline-none resize-none"
                style={{
                  background: "var(--a-bg-card)",
                  border: "1px solid var(--a-border)",
                  color: "var(--a-text-name)",
                }}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Helpers ──

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span style={{ color: "var(--a-text-4)" }}>{icon}</span>
        <span className="text-xs" style={{ color: "var(--a-text-3)" }}>{label}</span>
      </div>
      {children}
    </div>
  );
}

function EditableRow({
  icon, label, value, canEdit, saving, onSave, placeholder, type = "text", link,
}: {
  icon: React.ReactNode; label: string; value: string; canEdit: boolean;
  saving: boolean; onSave: (v: string) => void; placeholder?: string;
  type?: string; link?: string;
}) {
  if (!canEdit) {
    return (
      <InfoRow icon={icon} label={label}>
        {link && value ? (
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs" style={{ color: "var(--a-accent)" }}>
            {value}
          </a>
        ) : (
          <span className="text-xs" style={{ color: "var(--a-text-name)" }}>{value || "—"}</span>
        )}
      </InfoRow>
    );
  }

  return (
    <InfoRow icon={icon} label={label}>
      <div className="flex items-center gap-1">
        <input
          type={type}
          defaultValue={value}
          onBlur={(e) => onSave(e.target.value)}
          placeholder={placeholder}
          className="text-right bg-transparent border-none outline-none text-xs max-w-[160px]"
          style={{ color: "var(--a-text-name)", colorScheme: "dark" }}
        />
        {saving && <Loader2 className="w-3 h-3 animate-spin" style={{ color: "var(--a-accent)" }} />}
      </div>
    </InfoRow>
  );
}

function Divider() {
  return <div className="my-1" style={{ borderTop: "1px solid var(--a-border)" }} />;
}

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("uk-UA");
}
