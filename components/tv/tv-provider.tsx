"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useTvMode } from "@/hooks/use-tv-mode";
import { useSpatialNav } from "@/hooks/use-spatial-nav";

interface TvContext {
  isTvMode: boolean;
  isTvDevice: boolean;
  toggle: () => void;
  showPrompt: boolean;
  dismissPrompt: () => void;
}

const TvCtx = createContext<TvContext>({
  isTvMode: false,
  isTvDevice: false,
  toggle: () => {},
  showPrompt: false,
  dismissPrompt: () => {},
});

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
  "[data-tv-focusable]",
].join(", ");

export function TvProvider({ children }: { children: ReactNode }) {
  const { isTvMode, isTvDevice, toggle, showPrompt, dismissPrompt } = useTvMode();
  useSpatialNav(isTvMode);

  const pathname = usePathname();
  useEffect(() => {
    if (!isTvMode) return;
    // After every route change, restore focus to the first visible element so the
    // TV cursor is never lost between page navigations.
    const id = setTimeout(() => {
      const first = Array.from(document.querySelectorAll<HTMLElement>(FOCUSABLE))
        .find(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
      first?.focus();
    }, 150);
    return () => clearTimeout(id);
  }, [pathname, isTvMode]);

  return (
    <TvCtx.Provider value={{ isTvMode, isTvDevice, toggle, showPrompt, dismissPrompt }}>
      {children}
    </TvCtx.Provider>
  );
}

export function useTvContext() {
  return useContext(TvCtx);
}
