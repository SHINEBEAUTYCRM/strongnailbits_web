"use client";

// ================================================================
//  IntegrationStatus — Бейдж статусу інтеграції
// ================================================================

interface IntegrationStatusProps {
  isActive: boolean;
  isVerified: boolean;
  hasConfig: boolean;
  errorMessage?: string | null;
  size?: "sm" | "md";
}

export function IntegrationStatus({
  isActive,
  isVerified,
  hasConfig,
  errorMessage,
  size = "sm",
}: IntegrationStatusProps) {
  let label: string;
  let colorClass: string;

  if (isActive && isVerified) {
    label = "Активний";
    colorClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  } else if (isActive && !isVerified && hasConfig) {
    label = errorMessage ? "Помилка" : "Не перевірено";
    colorClass = errorMessage
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : "bg-amber-500/10 text-amber-400 border-amber-500/30";
  } else if (hasConfig) {
    label = "Неактивний";
    colorClass = "bg-zinc-500/10 text-zinc-500 border-zinc-500/30";
  } else {
    label = "Не налаштовано";
    colorClass = "bg-zinc-500/10 text-zinc-600 border-zinc-700/30";
  }

  const sizeClass = size === "sm"
    ? "text-[10px] px-1.5 py-0.5"
    : "text-xs px-2 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${colorClass} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
