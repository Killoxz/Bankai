"use client";

import { ThemeProvider } from "next-themes";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      themes={["dark", "light", "anilist"]}
      value={{ dark: "dark", light: "light", anilist: "dark anilist" }}
    >
      {children}
    </ThemeProvider>
  );
}
