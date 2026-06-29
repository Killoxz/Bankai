"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { X, Settings, LogIn, Monitor, Sun, Moon, Cat, Languages, Library } from "lucide-react";
import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { SIDEBAR_SECTIONS } from "@/lib/nav";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { usePlayerStore } from "@/store/player-store";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

function QuickSettingsDock() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const homeLayout = usePlayerStore((s) => s.homeLayout ?? "classic");
  const setSettings = usePlayerStore((s) => s.setSettings);

  const cycleLayout = () => setSettings({ homeLayout: homeLayout === "classic" ? "compact" : "classic" });
  const cycleLanguage = () => {
    const langs = ["romaji", "english", "native"] as const;
    setSettings({ titleLanguage: langs[(langs.indexOf(titleLanguage) + 1) % langs.length] });
  };

  const btn = "grid size-9 place-items-center rounded-xl transition-colors text-muted-foreground hover:bg-accent hover:text-foreground";
  const active = "grid size-9 place-items-center rounded-xl bg-primary/15 text-primary";

  return (
    <div className="shrink-0 border-t border-border px-3 py-2">
      <div className="flex items-center justify-between">
        <button onClick={cycleLayout} title="Toggle layout" className={btn}><Monitor className="size-4" /></button>
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Toggle theme" className={btn}>
          {mounted ? (theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />) : <Moon className="size-4" />}
        </button>
        <div title="Bankai" className={active}>
          <Cat className="size-4" />
        </div>
        <button onClick={cycleLanguage} title={`Title: ${titleLanguage}`} className={btn}><Languages className="size-4" /></button>
        <button title="Library" className={btn}><Library className="size-4" /></button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed);
  const toggle = useUIStore((s) => s.toggleSidebar);
  const currentUser = useAuthStore((s) => s.currentUser);
  const pathname = usePathname();
  const open = !collapsed;
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={toggle}
          />

          {/* Drawer panel */}
          <motion.aside
            key="drawer"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 38 }}
            className="fixed left-0 top-0 z-50 flex h-screen w-72 flex-col overflow-hidden rounded-r-2xl border-r border-border bg-card shadow-2xl"
          >
            {/* Header — logo + version + close */}
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <div className="flex items-center gap-2">
                <Logo />
                <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  v1.8.7
                </span>
              </div>
              <button
                onClick={toggle}
                aria-label="Close menu"
                className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Navigation */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-2 py-3">
              {SIDEBAR_SECTIONS.map((section, si) => (
                <div key={si}>
                  {section.heading && (
                    <>
                      <div className="my-2 h-px bg-border" />
                      <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {section.heading}
                      </p>
                    </>
                  )}
                  <nav className="space-y-0.5">
                    {section.items.map((item) => {
                      const active =
                        item.href === "/"
                          ? pathname === "/"
                          : pathname.startsWith(item.href.split("?")[0]) &&
                            item.href.split("?")[0] !== "/";
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          onClick={toggle}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors",
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-muted-foreground hover:bg-accent hover:text-foreground"
                          )}
                        >
                          <item.icon className="size-6 shrink-0" />
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>

            {/* Quick settings dock */}
            <QuickSettingsDock />

            {/* User profile footer — rendered client-side only to prevent
                hydration mismatch between SSR guest state and client auth state */}
            <div className="shrink-0 border-t border-border p-3">
              {mounted && currentUser ? (
                <div className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent">
                  <Link href="/profile" onClick={toggle} className="flex flex-1 items-center gap-3 min-w-0">
                    <Avatar src={currentUser.avatar} fallback={currentUser.username ?? currentUser.email} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{currentUser.username}</p>
                      <p className="truncate text-xs text-muted-foreground">{currentUser.email}</p>
                    </div>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={toggle}
                    aria-label="Settings"
                    className="grid size-8 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    <Settings className="size-4" />
                  </Link>
                </div>
              ) : mounted ? (
                <Link
                  href="/login"
                  onClick={toggle}
                  className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-accent"
                >
                  <div className="grid size-9 place-items-center rounded-full bg-secondary">
                    <LogIn className="size-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">Guest</p>
                    <p className="truncate text-xs text-primary">Sign in →</p>
                  </div>
                </Link>
              ) : (
                <div className="h-[52px]" /> /* placeholder matches footer height */
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
