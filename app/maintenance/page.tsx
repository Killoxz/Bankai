export const metadata = {
  title: "Down for Maintenance · Bankai",
  robots: "noindex",
};

export default function MaintenancePage() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-8 bg-background px-6 text-center overflow-hidden">
      <style>{`
        @keyframes bearRun {
          0%   { transform: translateX(-220px); }
          100% { transform: translateX(calc(100vw + 220px)); }
        }
        @keyframes dashFade {
          0%,100% { opacity: 0.8; }
          50%      { opacity: 0.1; }
        }
        .bear-runner {
          position: fixed;
          bottom: 72px;
          left: 0;
          animation: bearRun 2.6s linear infinite;
          filter: drop-shadow(0 4px 10px rgba(0,0,0,.6));
        }
        .sd1 { animation: dashFade 0.25s ease-in-out infinite alternate; }
        .sd2 { animation: dashFade 0.25s ease-in-out 0.08s infinite alternate; }
        .sd3 { animation: dashFade 0.25s ease-in-out 0.14s infinite alternate; }
      `}</style>

      {/* Ground line */}
      <div className="fixed bottom-[68px] left-0 right-0 h-px bg-border opacity-30" />

      <h1 className="text-2xl font-bold tracking-tight">Down for Maintenance</h1>

      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        Bankai is temporarily offline while we work on improving the streaming experience.
        Check back soon.
      </p>

      <div className="h-px w-24 bg-border" />

      <p className="text-xs text-muted-foreground/50">Bankai</p>

      {/* Running bear — SVG + SMIL limb animations, CSS across-screen translate */}
      <div className="bear-runner">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="190"
          height="220"
          viewBox="0 0 190 220"
        >
          <defs>
            <clipPath id="bc">
              <ellipse cx="80" cy="118" rx="38" ry="44" />
            </clipPath>
          </defs>

          {/* Whole-character body bounce */}
          <g>
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; 0,-8; 0,0"
              dur="0.45s"
              repeatCount="indefinite"
              calcMode="spline"
              keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
            />

            {/* Speed dashes (behind feet) */}
            <g className="sd1"><rect x="-8" y="185" width="22" height="3" rx="1.5" fill="#555" /></g>
            <g className="sd2"><rect x="-14" y="194" width="14" height="2.5" rx="1.2" fill="#444" /></g>
            <g className="sd3"><rect x="-4" y="201" width="18" height="2" rx="1" fill="#3a3a3a" /></g>

            {/* ── REAR LEG ── */}
            <g transform="translate(56,148)">
              <animateTransform
                attributeName="transform" type="rotate"
                values="30,0,0;-32,0,0;30,0,0"
                dur="0.45s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                additive="sum"
              />
              <ellipse cx="0" cy="16" rx="12" ry="17" fill="#D48000" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="3" cy="42" rx="10" ry="16" fill="#B86800" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="10" cy="62" rx="14" ry="8" fill="#E8A000" stroke="#111" strokeWidth="1.8" />
              <line x1="3" y1="69" x2="1" y2="77" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="10" y1="70" x2="10" y2="78" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="17" y1="69" x2="19" y2="77" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* ── REAR ARM ── */}
            <g transform="translate(50,102)">
              <animateTransform
                attributeName="transform" type="rotate"
                values="-40,0,0;38,0,0;-40,0,0"
                dur="0.45s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                additive="sum"
              />
              <ellipse cx="0" cy="13" rx="10" ry="14" fill="#E8C000" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="1" cy="33" rx="9" ry="12" fill="#D4A800" stroke="#111" strokeWidth="1.8" />
              <line x1="-5" y1="44" x2="-7" y2="51" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="45" x2="1" y2="52" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="7" y1="44" x2="9" y2="51" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* ── BODY ── */}
            <ellipse cx="80" cy="118" rx="38" ry="44" fill="#FFD700" stroke="#111" strokeWidth="2.2" />
            <g clipPath="url(#bc)">
              <ellipse cx="80" cy="103" rx="40" ry="13" fill="#E8A000" opacity="0.75" />
              <ellipse cx="80" cy="125" rx="38" ry="11" fill="#CC7000" opacity="0.55" />
            </g>
            <ellipse cx="80" cy="118" rx="38" ry="44" fill="none" stroke="#111" strokeWidth="2.2" />

            {/* ── TAIL ── */}
            <g transform="translate(44,148)">
              <animateTransform
                attributeName="transform" type="rotate"
                values="-18,0,0;22,0,0;-18,0,0"
                dur="0.45s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                additive="sum"
              />
              <path d="M0,0 Q-16,-12 -18,-28" stroke="#FFD700" strokeWidth="6" fill="none" strokeLinecap="round" />
              <circle cx="-18" cy="-28" r="5.5" fill="#FFD700" stroke="#111" strokeWidth="1.5" />
            </g>

            {/* ── FRONT LEG ── */}
            <g transform="translate(98,150)">
              <animateTransform
                attributeName="transform" type="rotate"
                values="-32,0,0;30,0,0;-32,0,0"
                dur="0.45s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                additive="sum"
              />
              <ellipse cx="0" cy="16" rx="12" ry="17" fill="#D48000" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="3" cy="42" rx="10" ry="16" fill="#B86800" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="10" cy="62" rx="14" ry="8" fill="#E8A000" stroke="#111" strokeWidth="1.8" />
              <line x1="3" y1="69" x2="1" y2="77" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="10" y1="70" x2="10" y2="78" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="17" y1="69" x2="19" y2="77" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* ── FRONT ARM ── */}
            <g transform="translate(112,104)">
              <animateTransform
                attributeName="transform" type="rotate"
                values="38,0,0;-40,0,0;38,0,0"
                dur="0.45s" repeatCount="indefinite"
                calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                additive="sum"
              />
              <ellipse cx="0" cy="13" rx="10" ry="14" fill="#E8C000" stroke="#111" strokeWidth="1.8" />
              <ellipse cx="1" cy="33" rx="9" ry="12" fill="#D4A800" stroke="#111" strokeWidth="1.8" />
              <line x1="-5" y1="44" x2="-7" y2="51" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="45" x2="1" y2="52" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
              <line x1="7" y1="44" x2="9" y2="51" stroke="#ccc" strokeWidth="2" strokeLinecap="round" />
            </g>

            {/* ── HEAD ── */}

            {/* Hair tufts */}
            <path d="M 100,18 Q 96,4 91,0 Q 89,12 91,20" fill="#3a2000" stroke="#111" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M 106,22 Q 104,9 101,7 Q 99,17 101,23" fill="#3a2000" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />

            {/* Head oval */}
            <ellipse cx="100" cy="58" rx="43" ry="40" fill="#FFD700" stroke="#111" strokeWidth="2.2" />

            {/* Head highlight */}
            <ellipse cx="106" cy="46" rx="22" ry="18" fill="#FFE840" opacity="0.25" />

            {/* Dark vertical face stripe */}
            <path
              d="M 74,21 C 67,36 67,56 68,76 C 69,90 74,100 78,106"
              stroke="#1a1000" strokeWidth="9" fill="none" strokeLinecap="round"
            />

            {/* Blue headband */}
            <path d="M 66,38 Q 100,26 134,46 L 134,58 Q 100,42 64,50 Z" fill="#4A8FFF" stroke="#111" strokeWidth="1.8" />
            <path d="M 70,38 Q 100,28 128,44 L 128,47 Q 100,33 70,42 Z" fill="#7AAFFF" opacity="0.35" />

            {/* Muzzle */}
            <ellipse cx="132" cy="76" rx="18" ry="13" fill="#F5E6C0" stroke="#111" strokeWidth="1.8" />
            <ellipse cx="132" cy="70" rx="5" ry="3.5" fill="#111" />
            <path d="M 127,78 Q 132,83 137,78" stroke="#111" strokeWidth="1.5" fill="none" strokeLinecap="round" />

            {/* Eye */}
            <circle cx="114" cy="60" r="8" fill="#fff" />
            <circle cx="114" cy="60" r="6" fill="#111" />
            <circle cx="117" cy="57" r="2.5" fill="white" opacity="0.9" />
            <circle cx="112" cy="64" r="1" fill="white" opacity="0.5" />

            {/* Eyebrow */}
            <path d="M 105,49 L 114,44 L 122,49" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />

            {/* Cheek mark */}
            <path d="M 118,68 Q 126,65 132,68" stroke="#E8A000" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      </div>
    </div>
  );
}
