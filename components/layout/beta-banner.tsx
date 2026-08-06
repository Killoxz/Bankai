"use client";

import { useState, useEffect } from "react";

const DISMISS_KEY = "bankai-beta-banner-dismissed";

export function BetaBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function dismiss() {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="relative z-50 flex items-center justify-center gap-3 bg-primary/10 px-4 py-2.5 text-center">
      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary">
        Beta
      </span>
      <p className="text-xs text-white/70">
        Bankai is currently in early beta • some features may be incomplete, change, or break without notice. Thanks for trying it out.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="ml-auto shrink-0 rounded-full p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
