"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Bell, User, LogOut, ChevronDown, Settings, History } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useLanguageStore, type TitleLanguage } from "@/store/language-store";

const NAV_LINKS = [
  { label: "Home",     href: "/" },
  { label: "Trending", href: "/trending" },
  { label: "Schedule", href: "/schedule" },
  { label: "My List",  href: "/my-list" },
  { label: "Movie",    href: "/browse?format=MOVIE" },
];

const LANGUAGE_OPTIONS: { label: string; value: TitleLanguage }[] = [
  { label: "English", value: "english" },
  { label: "Romaji",  value: "romaji" },
  { label: "Native",  value: "native" },
];

interface SearchResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { medium: string };
  seasonYear: number | null;
  format: string | null;
}

export function Navbar() {
  const [search, setSearch]           = useState("");
  const [results, setResults]         = useState<SearchResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen]       = useState(false);
  const [mounted, setMounted]         = useState(false);

  const currentUser = useAuthStore((s) => s.currentUser);
  const logout      = useAuthStore((s) => s.logout);
  const avatar      = useAuthStore((s) => s.avatar);
  const setAvatar   = useAuthStore((s) => s.setAvatar);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!currentUser) { setAvatar(null); return; }
    let cancelled = false;
    fetch(`/api/profile?username=${encodeURIComponent(currentUser)}`)
      .then((r) => r.json())
      .then((json) => { if (!cancelled && !json.error) setAvatar(json.image ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [currentUser, setAvatar]);


  // Debounced live search
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=6`);
        const json = await res.json();
        setResults((json.results ?? []).map((a: Record<string, unknown> & { id: number; title?: Record<string, string>; coverImage?: Record<string, string>; seasonYear?: number; format?: string }) => ({
          id: a.id,
          title: { romaji: a.title?.romaji ?? "", english: a.title?.english ?? null },
          coverImage: { medium: a.coverImage?.large ?? a.coverImage?.extraLarge ?? "" },
          seasonYear: a.seasonYear ?? null,
          format: a.format ?? null,
        })));
      } catch { setResults([]); }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const showResults = searchFocused && search.trim().length >= 2 && results.length > 0;

  return (
    <header className="relative z-50 w-full">
<div className="flex h-16 items-center gap-5 bg-white/80 dark:bg-background/80 px-8 backdrop-blur-md">
        {/* Logo */}
        <Link href="/" aria-label="Bankai home" className="shrink-0">
          <Image src="/bankai-logo.svg" alt="Bankai" width={90} height={28} className="h-7 w-auto invert dark:invert-0" priority />
        </Link>

        {/* Nav links */}
        <Suspense fallback={<NavLinks pathname={null} searchParams={null} />}>
          <NavLinksWithSearchParams />
        </Suspense>

        <div className="flex-1" />

        {/* Live search */}
        <div
          className="relative hidden sm:block"
          onFocus={() => setSearchFocused(true)}
          onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setSearchFocused(false); }}
        >
          <div className="flex w-52 items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 px-3.5 py-2 transition-colors focus-within:border-gray-400 dark:focus-within:border-white/35">
            <input
              type="text"
              placeholder="Search here ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/40"
            />
            <Link href="/browse" aria-label="Advanced search" className="shrink-0 text-gray-400 dark:text-white/45 transition-colors hover:text-gray-700 dark:hover:text-white">
              <Search className="size-4" />
            </Link>
          </div>

          <AnimatePresence>
            {showResults && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card py-1.5 shadow-2xl"
              >
                {results.map((r) => (
                  <Link
                    key={r.id}
                    href={`/anime/${r.id}`}
                    onClick={() => { setSearch(""); setSearchFocused(false); }}
                    className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.coverImage.medium} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm text-gray-900 dark:text-white">{r.title.english || r.title.romaji}</p>
                      <p className="text-xs text-gray-400 dark:text-white/40">{[r.seasonYear, r.format].filter(Boolean).join(" · ")}</p>
                    </div>
                  </Link>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bell */}
        <button aria-label="Notifications" className="text-gray-500 dark:text-white/60 transition-colors hover:text-gray-900 dark:hover:text-white">
          <Bell className="size-5" />
        </button>

        {/* Account */}
        {mounted && currentUser ? (
          <div
            className="relative"
            onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false); }}
          >
            <button
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Account menu"
              className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-sm font-bold text-black ring-2 ring-gray-300 dark:ring-white/20 transition hover:ring-gray-400 dark:hover:ring-white/40"
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt="" className="size-full object-cover" />
              ) : (
                currentUser[0]?.toUpperCase()
              )}
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 w-52 overflow-hidden rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-card py-1 shadow-2xl"
                >
                  <p className="px-4 py-2.5 text-xs text-gray-500 dark:text-white/50">
                    Signed in as <span className="font-semibold text-gray-900 dark:text-white">{currentUser}</span>
                  </p>
                  <div className="h-px bg-gray-100 dark:bg-white/10" />
                  <Link
                    href="/profile"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-white/80 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <User className="size-4" /> Profile
                  </Link>
                  <Link
                    href="/history"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-white/80 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <History className="size-4" /> History
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 dark:text-white/80 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <Settings className="size-4" /> Settings
                  </Link>
                  <div className="h-px bg-gray-100 dark:bg-white/10" />
                  <button
                    onClick={() => { logout(); setMenuOpen(false); }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-gray-700 dark:text-white/80 transition-colors hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <LogOut className="size-4" /> Sign out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : mounted ? (
          <div className="flex shrink-0 items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 dark:text-white/70 transition-colors hover:text-gray-900 dark:hover:text-white">
              Log In
            </Link>
            <Link href="/signup" className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110">
              Sign Up
            </Link>
          </div>
        ) : (
          <div className="h-8 w-[124px] shrink-0" aria-hidden />
        )}
      </div>
    </header>
  );
}

function NavLinksWithSearchParams() {
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  return <NavLinks pathname={pathname} searchParams={searchParams} />;
}

function NavLinks({ pathname, searchParams }: { pathname: string | null; searchParams: URLSearchParams | null }) {
  return (
    <nav className="hidden items-center gap-5 md:flex">
      {NAV_LINKS.map((link) => {
        const [linkPath, linkQuery] = link.href.split("?");
        let active = false;
        if (pathname) {
          if (link.href === "/") {
            active = pathname === "/";
          } else if (linkQuery) {
            const linkParams = new URLSearchParams(linkQuery);
            active =
              !!searchParams &&
              pathname === linkPath &&
              [...linkParams.entries()].every(([k, v]) => searchParams.get(k) === v);
          } else {
            active = linkPath !== "#" && pathname.startsWith(linkPath);
          }
        }
        return (
          <Link
            key={link.label}
            href={link.href}
            className={cn(
              "text-sm transition-colors",
              active ? "font-semibold text-gray-900 dark:text-white" : "font-medium text-gray-500 dark:text-white/55 hover:text-gray-700 dark:hover:text-white/90"
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <LanguageDropdown />
    </nav>
  );
}

function LanguageDropdown() {
  const titleLanguage    = useLanguageStore((s) => s.titleLanguage);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const [open, setOpen]  = useState(false);
  const current = LANGUAGE_OPTIONS.find((o) => o.value === titleLanguage)?.label ?? "English";

  return (
    <div
      className="relative"
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false); }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-gray-500 dark:text-white/55 transition-colors hover:text-gray-700 dark:hover:text-white/90"
      >
        Language <ChevronDown className="size-3.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-card py-1 shadow-2xl"
          >
            <p className="px-3.5 pb-1 pt-2 text-[10px] uppercase tracking-widest text-gray-400 dark:text-white/40">
              Title Language
            </p>
            {LANGUAGE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => { setTitleLanguage(o.value); setOpen(false); }}
                className={cn(
                  "block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-gray-50 dark:hover:bg-white/5",
                  o.value === titleLanguage ? "text-primary" : "text-gray-700 dark:text-white/80"
                )}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
      <span className="sr-only">Currently: {current}</span>
    </div>
  );
}
