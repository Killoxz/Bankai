"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { CommandPalette } from "@/components/search/command-palette";
import { useDBSync } from "@/hooks/use-db-sync";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useDBSync();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Sidebar />
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        {children}
        {/* Footer — hidden on watch pages since the episode sidebar is the focus there */}
        {!pathname.startsWith("/watch") && <Footer />}
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
