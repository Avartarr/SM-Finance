export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="S&M">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[8px] border border-white/15 bg-navy/80 shadow-glow">
        <svg viewBox="0 0 64 64" className="h-9 w-9" role="img" aria-hidden="true">
          <path
            d="M32 9v22M32 33v22M21 15l22 34M43 15 21 49M12 32h40M17 24l8 8-8 8M47 24l-8 8 8 8"
            fill="none"
            stroke="#dbeafe"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="3.8"
          />
          <path
            d="M18 35c2-8 9-12 14-12s12 4 14 12l-3 17H21L18 35Z"
            fill="#d6b76a"
            opacity="0.96"
            stroke="#f4e4b6"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.4"
          />
          <path
            d="M23 33c1-4 5-6 9-6s8 2 9 6"
            fill="none"
            stroke="#fff6d8"
            strokeLinecap="round"
            strokeWidth="3"
          />
          <path d="M24 39h16M25 45h14" stroke="#071a33" strokeLinecap="round" strokeWidth="2.5" />
          <path d="M28 31h.1M35 29h.1M39 34h.1" stroke="#071a33" strokeLinecap="round" strokeWidth="3" />
        </svg>
      </div>
      {!compact ? (
        <div>
          <div
            className="text-2xl font-bold tracking-normal text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
          >
            S&amp;M
          </div>
        </div>
      ) : null}
    </div>
  );
}
