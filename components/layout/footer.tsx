import Link from "next/link";
import Image from "next/image";
import { Github, Twitter, MessageSquare } from "lucide-react";

const VERSION = "v1.9.6";

const FOOTER_SECTIONS = [
  {
    title: "Discover",
    links: [
      { label: "Home", href: "/" },
      { label: "Trending", href: "/trending" },
      { label: "Browse", href: "/browse" },
      { label: "Schedule", href: "/schedule" },
      { label: "Genres", href: "/genres" },
    ],
  },
  {
    title: "Library",
    links: [
      { label: "Watchlist", href: "/watchlist" },
      { label: "History", href: "/history" },
      { label: "Top Rated", href: "/browse?sort=SCORE_DESC" },
      { label: "Movies", href: "/browse?format=MOVIE" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", href: "/profile" },
      { label: "Settings", href: "/settings" },
      { label: "Sign in", href: "/login" },
    ],
  },
];

const SOCIAL = [
  { icon: Github, href: "https://github.com", label: "GitHub" },
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: MessageSquare, href: "#", label: "Discord" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 pt-12 sm:px-6">

        {/* Top grid */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">

          {/* Brand column */}
          <div className="col-span-2 lg:col-span-2">
            <Link href="/" aria-label="Bankai home">
              <Image
                src="/bankai-logo.svg"
                alt="Bankai"
                width={120}
                height={36}
                className="h-8 w-auto object-contain object-left"
              />
            </Link>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-muted-foreground">
              Your ultimate anime streaming destination. Watch sub and dub in HD,
              track your progress, and discover new series.
            </p>
            <div className="mt-5 flex items-center gap-2">
              {SOCIAL.map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <Icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Nav columns */}
          {FOOTER_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {section.title}
              </h3>
              <ul className="space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>© {year} Bankai. All rights reserved.</span>
            <span className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-foreground/60">
              {VERSION}
            </span>
          </div>
          <p className="max-w-md text-[10px] leading-relaxed text-muted-foreground/50">
            This website does not retain any files on its server. It solely provides
            links to media content hosted by third-party services. For educational and
            personal use only.
          </p>
        </div>
      </div>
    </footer>
  );
}
