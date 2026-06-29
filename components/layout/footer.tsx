import Link from "next/link";
import Image from "next/image";
import { Monitor, Search, TrendingUp, Star, Bookmark, Settings } from "lucide-react";

const VERSION = "v1.8.6";

const NAV_LINKS = [
  { label: "Trending",  href: "/trending"              },
  { label: "Search",    href: "/search"                },
  { label: "Top Rated", href: "/browse?sort=SCORE_DESC"},
  { label: "Browse",    href: "/browse"                },
  { label: "Settings",  href: "/settings"              },
];

const ICONS = [
  { icon: Monitor,    href: "/",         label: "Home"      },
  { icon: TrendingUp, href: "/trending", label: "Trending"  },
  { icon: Search,     href: "/search",   label: "Search"    },
  { icon: Bookmark,   href: "/profile",  label: "Watchlist" },
  { icon: Star,       href: "/browse?sort=SCORE_DESC", label: "Top Rated" },
  { icon: Settings,   href: "/settings", label: "Settings"  },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-card/30">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-5 sm:px-6">

        {/* Single compact row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          {/* Left: mascot + copyright + version */}
          <div className="flex items-center gap-3">
            <Link href="/" aria-label="Bankai home">
              <Image
                src="/Bankai Second Logo.svg"
                alt="Bankai"
                width={40}
                height={40}
                className="h-10 w-auto object-contain"
              />
            </Link>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>© {year} Bankai</span>
              <span className="opacity-30">|</span>
              <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/60">
                {VERSION}
              </span>
            </div>
          </div>

          {/* Center: nav links */}
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </div>

          {/* Right: icon shortcuts */}
          <div className="flex items-center gap-0.5 shrink-0">
            {ICONS.map(({ icon: Icon, href, label }) => (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="size-3.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-[10px] text-muted-foreground/50 leading-relaxed">
          This website does not retain any files on its server. It solely provides links to media content hosted by third-party services. For educational and personal use only.
        </p>

      </div>
    </footer>
  );
}
