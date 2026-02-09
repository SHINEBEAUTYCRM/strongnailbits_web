import Link from "next/link";

interface SectionHeaderProps {
  /** Small uppercase label above title */
  label?: string;
  /** Label color — CSS color value */
  labelColor?: string;
  /** Section title */
  title: string;
  /** "View all" link text */
  linkText?: string;
  /** "View all" link href */
  linkHref?: string;
}

export function SectionHeader({
  label,
  labelColor = "var(--coral)",
  title,
  linkText,
  linkHref,
}: SectionHeaderProps) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {label && (
          <span
            className="font-unbounded mb-1 block text-[10px] font-extrabold uppercase tracking-[3px]"
            style={{ color: labelColor }}
          >
            {label}
          </span>
        )}
        <h2 className="font-unbounded text-2xl font-black text-dark sm:text-[32px]">
          {title}
        </h2>
      </div>
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className="shrink-0 text-[13px] font-medium text-coral transition-colors hover:text-coral-2"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
