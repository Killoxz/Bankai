"use client";

import { createContext, useContext, type ReactNode } from "react";
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

export function TvProvider({ children }: { children: ReactNode }) {
  const { isTvMode, isTvDevice, toggle, showPrompt, dismissPrompt } = useTvMode();
  useSpatialNav(isTvMode);

  return (
    <TvCtx.Provider value={{ isTvMode, isTvDevice, toggle, showPrompt, dismissPrompt }}>
      {children}
    </TvCtx.Provider>
  );
}

export function useTvContext() {
  return useContext(TvCtx);
}
