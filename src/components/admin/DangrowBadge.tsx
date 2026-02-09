/* Powered by DANGROW — Branded Pill Badge */
export function DangrowBadge({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="https://dangrow.agency"
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 no-underline transition-all duration-300"
      style={{
        padding: compact ? "6px 12px 6px 8px" : "8px 16px 8px 10px",
        borderRadius: "100px",
        background: "rgba(6,6,10,0.85)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "rgba(204,255,0,0.25)";
        el.style.background = "rgba(6,6,10,0.95)";
        el.style.transform = "translateY(-1px)";
        el.style.boxShadow = "0 4px 16px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = "rgba(255,255,255,0.08)";
        el.style.background = "rgba(6,6,10,0.85)";
        el.style.transform = "translateY(0)";
        el.style.boxShadow = "none";
      }}
    >
      {/* DANGROW logo icon */}
      <svg viewBox="0 0 64 64" width={compact ? 14 : 16} height={compact ? 14 : 16} xmlns="http://www.w3.org/2000/svg">
        <rect width="64" height="64" rx="14" fill="#CCFF00" />
        <path d="M21 44 L32 20 L43 44" stroke="#06060A" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="32" y1="20" x2="32" y2="14" stroke="#06060A" strokeWidth="5" strokeLinecap="round" />
        <line x1="27" y1="18" x2="32" y2="14" stroke="#06060A" strokeWidth="4" strokeLinecap="round" />
        <line x1="37" y1="18" x2="32" y2="14" stroke="#06060A" strokeWidth="4" strokeLinecap="round" />
      </svg>

      <span style={{ fontFamily: "'Inter', sans-serif", fontSize: compact ? "10px" : "11px", color: "#888", fontWeight: 500 }}>
        powered by
      </span>

      <span style={{ fontFamily: "'Unbounded', cursive", fontSize: compact ? "10px" : "11px", fontWeight: 800, color: "#fff", letterSpacing: "1px" }}>
        DAN<span style={{ color: "#CCFF00" }}>GROW</span>
      </span>
    </a>
  );
}
