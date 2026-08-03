"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { useLayoutEffect } from "react";

// Ensures "dark" class is present alongside "anilist" so all dark: Tailwind
// variants keep working. useLayoutEffect fires before paint — no flash.
function ThemeSyncer() {
  const { theme } = useTheme();
  useLayoutEffect(() => {
    const el = document.documentElement;
    if (theme === "anilist") el.classList.add("dark");
    else if (theme === "light") el.classList.remove("dark");
  }, [theme]);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light", "anilist"]}
    >
      <ThemeSyncer />
      {children}
    </ThemeProvider>
  );
}
