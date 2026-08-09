"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useTvMode } from "@/hooks/use-tv-mode";
import { useSpatialNav } from "@/hooks/use-spatial-nav";

interface TvContext {
  isTvMode: boolean;
  toggle: () => void;
}

const TvCtx = createContext<TvContext>({ isTvMode: false, toggle: () => {} });

export function TvProvider({ children }: { children: ReactNode }) {
  const { isTvMode, toggle } = useTvMode();
  useSpatialNav(isTvMode);

  return (
    <TvCtx.Provider value={{ isTvMode, toggle }}>
      {children}
    </TvCtx.Provider>
  );
}

export function useTvContext() {
  return useContext(TvCtx);
}
