"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Bell, User, LogOut, ChevronDown, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";
import { useLanguageStore, type TitleLanguage } from "@/store/language-store";

const NAV_LINKS = [
  { label: "Home",    href: "/" },
  { label: "My List", href: "/my-list" },
  { label: "Movie",   href: "/browse?format=MOVIE" },
  { label: "Series",  href: "/series" },
];

const LANGUAGE_OPTIONS: { label: string; value: TitleLanguage }[] = [
  { label: "English", value: "english" },
  { label: "Romaji", value: "romaji" },
  { label: "Native", value: "native" },
];

interface SearchResult {
  id: number;
  title: { romaji: string; english: string | null };
  coverImage: { medium: string };
  seasonYear: number | null;
  format: string | null;
}

export function Navbar() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const currentUser = useAuthStore((s) => s.currentUser);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Debounced live search against AniList
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const res = await fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: `query ($q: String) { Page(perPage: 6) { media(search: $q, type: ANIME) {
              id title { romaji english } coverImage { medium } seasonYear format
            } } }`,
            variables: { q },
          }),
        });
        const json = await res.json();
        setResults(json.data?.Page?.media ?? []);
      } catch {
        setResults([]);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const showResults = searchFocused && search.trim().length >= 2 && results.length > 0;

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Site-wide status notice */}
      <div className="flex items-center justify-center gap-1.5 border-b border-white/10 bg-black/40 px-4 py-1.5 text-center text-xs font-medium text-white/60 backdrop-blur-sm">
        <AlertCircle className="size-3.5 shrink-0 text-white/40" />
        Streaming Services Are Currently Down At The Moment.
      </div>

      <div
        className={cn(
          "flex h-16 items-center gap-5 px-8 transition-all duration-300",
          scrolled
            ? "bg-[#141414]/95 backdrop-blur-sm"
            : "bg-gradient-to-b from-black/70 to-transparent"
        )}
      >
      {/* Logo */}
      <Link href="/" aria-label="Bankai home" className="shrink-0">
        <Image
          src="/bankai-logo.svg"
          alt="Bankai"
          width={90}
          height={28}
          className="h-7 w-auto"
          priority
        />
      </Link>

      {/* Nav links */}
      <nav className="hidden items-center gap-5 md:flex">
        {NAV_LINKS.map((link) => {
          const base = link.href.split("?")[0];
          const active =
            link.href === "/" ? pathname === "/" : base !== "/" && base !== "#" && pathname.startsWith(base);
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                active
                  ? "font-semibold text-white"
                  : "font-medium text-white/55 hover:text-white/90"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        <LanguageDropdown />
      </nav>

      <div className="flex-1" />

      {/* Live search */}
      <div
        className="relative hidden sm:block"
        onFocus={() => setSearchFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setSearchFocused(false);
        }}
      >
        <div className="flex w-52 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 transition-colors focus-within:border-white/35">
          <input
            type="text"
            placeholder="Search here ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
          />
          <Search className="size-4 shrink-0 text-white/45" />
        </div>

        {showResults && (
          <div className="absolute right-0 top-12 w-80 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1.5 shadow-2xl">
            {results.map((r) => (
              <Link
                key={r.id}
                href={`/anime/${r.id}`}
                onClick={() => {
                  setSearch("");
                  setSearchFocused(false);
                }}
                className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-white/5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.coverImage.medium} alt="" className="h-12 w-9 shrink-0 rounded object-cover" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{r.title.english || r.title.romaji}</p>
                  <p className="text-xs text-white/40">
                    {[r.seasonYear, r.format].filter(Boolean).join(" · ")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Bell */}
      <button aria-label="Notifications" className="text-white/60 transition-colors hover:text-white">
        <Bell className="size-5" />
      </button>

      {/* Account */}
      {mounted && currentUser ? (
        <div
          className="relative"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setMenuOpen(false);
          }}
        >
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Account menu"
            className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-black ring-2 ring-white/20"
          >
            {currentUser[0]?.toUpperCase()}
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
              <p className="px-4 py-2.5 text-xs text-white/50">
                Signed in as <span className="font-semibold text-white">{currentUser}</span>
              </p>
              <div className="h-px bg-white/10" />
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-white/80 transition-colors hover:bg-white/5"
              >
                <User className="size-4" />
                Profile
              </Link>
              <button
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
              >
                <LogOut className="size-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      ) : mounted ? (
        <div className="flex shrink-0 items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-white/70 transition-colors hover:text-white"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
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

function LanguageDropdown() {
  const titleLanguage = useLanguageStore((s) => s.titleLanguage);
  const setTitleLanguage = useLanguageStore((s) => s.setTitleLanguage);
  const [open, setOpen] = useState(false);
  const current = LANGUAGE_OPTIONS.find((o) => o.value === titleLanguage)?.label ?? "English";

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-sm font-medium text-white/55 transition-colors hover:text-white/90"
      >
        Language
        <ChevronDown className="size-3.5" />
      </button>
      {open && (
        <div className="absolute left-0 top-8 z-20 w-36 overflow-hidden rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
          <p className="px-3.5 pb-1 pt-2 text-[10px] uppercase tracking-widest text-white/40">
            Title Language
          </p>
          {LANGUAGE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                setTitleLanguage(o.value);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/5",
                o.value === titleLanguage ? "text-primary" : "text-white/80"
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <span className="sr-only">Currently: {current}</span>
    </div>
  );
}
