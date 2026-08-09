"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, TrendingUp, CalendarDays, Bookmark, Film, History, Settings, Tv2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTvContext } from "./tv-provider";
import { useSettingsModalStore } from "@/store/settings-modal-store";

const TV_NAV = [
  { label: "Home",     href: "/",                   icon: Home         },
  { label: "Trending", href: "/trending",            icon: TrendingUp   },
  { label: "Schedule", href: "/schedule",            icon: CalendarDays },
  { label: "My List",  href: "/my-list",             icon: Bookmark     },
  { label: "Movies",   href: "/browse?format=MOVIE", icon: Film         },
  { label: "History",  href: "/history",             icon: History      },
];

export function TvNav() {
  const { isTvMode, toggle } = useTvContext();
  const pathname = usePathname();
  const openSettings = useSettingsModalStore((s) => s.setOpen);

  if (!isTvMode) return null;

  return (
    <nav className="tv-sidebar fixed inset-y-0 left-0 z-50 flex w-20 flex-col items-center gap-1 border-r border-white/10 bg-[#0d0d0d]/95 py-4 backdrop-blur-xl">
      {/* Logo */}
      <Link href="/" className="mb-4 flex shrink-0 items-center justify-center p-2">
        <Image
          src="/bankai-logo.svg"
          alt="Bankai"
          width={40}
          height={14}
          className="w-10 invert-0"
          priority
        />
      </Link>

      {/* Nav links */}
      <div className="flex flex-1 flex-col items-center gap-1">
        {TV_NAV.map((link) => {
          const [linkPath] = link.href.split("?");
          const active = link.href === "/" ? pathname === "/" : pathname.startsWith(linkPath);
          const Icon = link.icon;
          return (
            <Link
              key={link.label}
              href={link.href}
              data-tv-focusable
              className={cn(
                "group flex w-16 flex-col items-center gap-1 rounded-xl px-2 py-3 text-center transition-all outline-none",
                "focus-visible:ring-4 focus-visible:ring-primary/70",
                active
                  ? "bg-primary/15 text-primary"
                  : "text-white/50 hover:bg-white/8 hover:text-white focus-visible:bg-white/10 focus-visible:text-white",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span className="text-[10px] font-medium leading-tight">{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={() => openSettings(true)}
          data-tv-focusable
          aria-label="Settings"
          className="flex w-16 flex-col items-center gap-1 rounded-xl px-2 py-3 text-white/50 transition-all hover:bg-white/8 hover:text-white outline-none focus-visible:ring-4 focus-visible:ring-primary/70 focus-visible:bg-white/10 focus-visible:text-white"
        >
          <Settings className="size-5 shrink-0" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>

        {/* Exit TV mode */}
        <button
          onClick={toggle}
          data-tv-focusable
          aria-label="Exit TV mode"
          className="flex w-16 flex-col items-center gap-1 rounded-xl px-2 py-3 text-white/50 transition-all hover:bg-white/8 hover:text-white outline-none focus-visible:ring-4 focus-visible:ring-primary/70"
        >
          <Tv2 className="size-5 shrink-0" />
          <span className="text-[10px] font-medium">Exit TV</span>
        </button>
      </div>
    </nav>
  );
}
