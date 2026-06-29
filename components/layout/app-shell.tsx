"use client";

import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Navbar } from "./navbar";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";
import { Footer } from "./footer";
import { CommandPalette } from "@/components/search/command-palette";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <Sidebar />
      <main className="min-w-0 flex-1 pb-20 lg:pb-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
        {/* Footer — hidden on watch pages since the episode sidebar is the focus there */}
        {!pathname.startsWith("/watch") && <Footer />}
      </main>
      <MobileNav />
      <CommandPalette />
    </div>
  );
}
