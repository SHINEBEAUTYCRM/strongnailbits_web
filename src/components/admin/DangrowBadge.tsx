/* Powered by DANGROW — Subtle Branded Badge */
export function DangrowBadge({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="https://dangrow.agency"
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-1.5 no-underline transition-all duration-300"
      style={{
        padding: compact ? "4px 8px 4px 6px" : "5px 10px 5px 8px",
        borderRadius: "100px",
        background: "transparent",
        border: "1px solid rgba(255,255,255,0.04)",
        opacity: 0.45,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.opacity = "0.85";
        el.style.borderColor = "rgba(204,255,0,0.15)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.opacity = "0.45";
        el.style.borderColor = "rgba(255,255,255,0.04)";
      }}
    >
      <svg viewBox="0 0 64 64" width={compact ? 10 : 12} height={compact ? 10 : 12} xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="14" fill="#CCFF00" />
        <path d="M21 44 L32 20 L43 44" stroke="#06060A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="32" y1="20" x2="32" y2="14" stroke="#06060A" strokeWidth="5" strokeLinecap="round" />
        <line x1="27" y1="18" x2="32" y2="14" stroke="#06060A" strokeWidth="4" strokeLinecap="round" />
        <line x1="37" y1="18" x2="32" y2="14" stroke="#06060A" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <span style={{ fontFamily: "system-ui, sans-serif", fontSize: compact ? "8px" : "9px", color: "#52525b", fontWeight: 500 }}>
        powered by
      </span>

      <span style={{ fontFamily: "var(--font-unbounded), 'Unbounded', cursive", fontSize: compact ? "8px" : "9px", fontWeight: 800, color: "#71717a", letterSpacing: "0.5px" }}>
        DAN<span style={{ color: "#9ba33a" }}>GROW</span>
      </span>
    </a>
  );
}
