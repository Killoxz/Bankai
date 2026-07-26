"use client";

import Link from "next/link";
import Image from "next/image";
import { Search, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home",        href: "/" },
  { label: "My List",     href: "/my-list" },
  { label: "Movie",       href: "/browse?format=MOVIE" },
  { label: "New Season",  href: "/browse?status=RELEASING" },
  { label: "Language",    href: "#" },
];

export function Navbar() {
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center gap-5 px-8 transition-all duration-300",
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

      {/* Desktop nav */}
      <nav className="flex items-center gap-5">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href.split("?")[0]) && link.href.split("?")[0] !== "/";
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
      </nav>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="flex w-52 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 transition-colors focus-within:border-white/35">
        <input
          type="text"
          placeholder="Search here ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        />
        <Search className="size-4 shrink-0 text-white/45" />
      </div>

      {/* Bell */}
      <button
        aria-label="Notifications"
        className="text-white/60 transition-colors hover:text-white"
      >
        <Bell className="size-5" />
      </button>

      {/* Avatar */}
      <div className="size-8 shrink-0 overflow-hidden rounded-full ring-2 ring-white/20">
        <div className="size-full bg-gradient-to-br from-sky-400 to-violet-500" />
      </div>
    </header>
  );
}
