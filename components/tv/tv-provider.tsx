"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTvMode } from "@/hooks/use-tv-mode";
import { useSpatialNav } from "@/hooks/use-spatial-nav";

interface TvContext {
  isTvMode: boolean;
  toggle: () => void;
  showPrompt: boolean;
  dismissPrompt: () => void;
}

const TvCtx = createContext<TvContext>({
  isTvMode: false,
  toggle: () => {},
  showPrompt: false,
  dismissPrompt: () => {},
});

export function TvProvider({ children }: { children: ReactNode }) {
  const { isTvMode, toggle, showPrompt, dismissPrompt } = useTvMode();
  useSpatialNav(isTvMode);

  return (
    <TvCtx.Provider value={{ isTvMode, toggle, showPrompt, dismissPrompt }}>
      {children}
    </TvCtx.Provider>
  );
}

export function useTvContext() {
  return useContext(TvCtx);
}
