"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Home, Search, Tv, Bookmark, User, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { useSettingsModalStore } from "@/store/settings-modal-store";

interface NavItem {
  key: string;
  label: string;
  href?: string;
  icon: typeof Home;
}

const NAV_ITEMS: NavItem[] = [
  { key: "home",    label: "Home",    href: "/",       icon: Home },
  { key: "series",  label: "Browse",  href: "/browse", icon: Tv },
  { key: "search",  label: "Search",                   icon: Search },
  { key: "list",    label: "My List", href: "/my-list", icon: Bookmark },
  { key: "profile", label: "Profile", href: "/profile", icon: User },
];

export function MobileNav() {
  const pathname    = usePathname();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted]     = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <>
      <nav className="fixed inset-x-3 bottom-3 z-40 lg:hidden">
        <div className="flex items-center justify-around rounded-2xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-[#1c1c1c]/95 py-2 shadow-2xl backdrop-blur-md">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;

            if (!item.href) {
              return (
                <button
                  key={item.key}
                  onClick={() => setSearchOpen(true)}
                  className="flex flex-1 flex-col items-center gap-1 py-1 text-gray-500 dark:text-white/50"
                >
                  <Icon className="size-5" />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </button>
              );
            }

            const href = item.key === "profile" && mounted && !currentUser ? "/login" : item.href;
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                key={item.key}
                href={href}
                className="relative flex flex-1 flex-col items-center gap-1 py-1"
              >
                {active && (
                  <motion.span
                    layoutId="mobile-tab-indicator"
                    className="absolute -top-2 h-0.5 w-5 rounded-full bg-primary"
                  />
                )}
                <Icon className={active ? "size-5 text-primary" : "size-5 text-gray-500 dark:text-white/50"} />
                <span
                  className={
                    active
                      ? "text-[10px] font-medium text-primary"
                      : "text-[10px] font-medium text-gray-500 dark:text-white/50"
                  }
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {searchOpen && <MobileSearchOverlay onClose={() => setSearchOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

interface SearchResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { medium: string };
  seasonYear: number | null;
  format: string | null;
}

function MobileSearchOverlay({ onClose }: { onClose: () => void }) {
  const openSettings = useSettingsModalStore((s) => s.setOpen);
  const [query, setQuery]     = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=12`);
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
  }, [query]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col bg-background lg:hidden"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <div className="flex min-w-0 items-center gap-3 border-b border-gray-200 dark:border-white/10 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-gray-300 dark:border-white/15 bg-gray-100 dark:bg-white/5 px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-gray-400 dark:text-white/45" />
          <input
            autoFocus
            type="text"
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 dark:text-white outline-none placeholder:text-gray-400 dark:placeholder:text-white/40"
          />
        </div>
        <button onClick={onClose} aria-label="Close search" className="shrink-0 text-gray-500 dark:text-white/60">
          <X className="size-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {results.map((r) => (
          <Link
            key={r.id}
            href={`/anime/${r.id}`}
            onClick={onClose}
            className="flex items-center gap-3 border-b border-gray-100 dark:border-white/5 py-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.coverImage.medium} alt="" className="h-14 w-10 shrink-0 rounded object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm text-gray-900 dark:text-white">{r.title.english || r.title.romaji}</p>
              <p className="text-xs text-gray-400 dark:text-white/40">{[r.seasonYear, r.format].filter(Boolean).join(" · ")}</p>
            </div>
          </Link>
        ))}
        {query.trim().length >= 2 && results.length === 0 && (
          <p className="py-10 text-center text-sm text-gray-400 dark:text-white/40">No results for &quot;{query}&quot;.</p>
        )}
        {!query.trim() && (
          <div className="pt-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-white/30">Quick Links</p>
            <div className="space-y-1">
              {[
                { label: "Trending", href: "/trending" },
                { label: "Schedule", href: "/schedule" },
                { label: "Movies",   href: "/browse?format=MOVIE" },
                { label: "History",  href: "/history" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white"
                >
                  {l.label}
                  <span className="text-gray-300 dark:text-white/30">→</span>
                </Link>
              ))}
              <button
                onClick={() => { onClose(); openSettings(true); }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm text-gray-600 dark:text-white/70 transition-colors hover:bg-gray-50 dark:hover:bg-white/6 hover:text-gray-900 dark:hover:text-white"
              >
                Settings
                <span className="text-gray-300 dark:text-white/30">→</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
