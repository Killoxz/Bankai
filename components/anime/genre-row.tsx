"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const ALL_GENRES = [
  "Action", "Adventure", "Award Winning", "Boys Love", "Comedy", "Drama",
  "Ecchi", "Fantasy", "Girls Love", "Gourmet", "Horror", "Isekai",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
  "Harem", "Vampire", "Demons", "Samurai", "Military", "Police",
  "School", "Game", "Historical", "Martial Arts", "Super Power", "Space",
  "Shounen", "Shoujo", "Seinen", "Josei", "Kodomomuke",
  "Cyberpunk", "Steampunk", "Post-Apocalyptic", "Time Travel", "Magic",
  "Reincarnation", "Villainess", "Dungeon", "Cultivation", "Manhwa",
  "Manhua", "Iyashikei", "Racing", "Cooking", "Idol", "Otome",
  "Reverse Harem", "Delinquents", "Ninja", "Pirates", "Zombies",
];

const GENRE_COLORS: Record<string, string> = {
  "Action":           "#ef4444",
  "Adventure":        "#f97316",
  "Award Winning":    "#eab308",
  "Boys Love":        "#ec4899",
  "Comedy":           "#facc15",
  "Drama":            "#a855f7",
  "Ecchi":            "#f472b6",
  "Fantasy":          "#8b5cf6",
  "Girls Love":       "#f9a8d4",
  "Gourmet":          "#fb923c",
  "Horror":           "#dc2626",
  "Isekai":           "#06b6d4",
  "Mahou Shoujo":     "#e879f9",
  "Mecha":            "#94a3b8",
  "Music":            "#c084fc",
  "Mystery":          "#6366f1",
  "Psychological":    "#7c3aed",
  "Romance":          "#fb7185",
  "Sci-Fi":           "#22d3ee",
  "Slice of Life":    "#4ade80",
  "Sports":           "#86efac",
  "Supernatural":     "#a78bfa",
  "Thriller":         "#f87171",
  "Harem":            "#f0abfc",
  "Vampire":          "#b91c1c",
  "Demons":           "#c2410c",
  "Samurai":          "#92400e",
  "Military":         "#65a30d",
  "Police":           "#3b82f6",
  "School":           "#38bdf8",
  "Game":             "#34d399",
  "Historical":       "#d97706",
  "Martial Arts":     "#ef4444",
  "Super Power":      "#fbbf24",
  "Space":            "#818cf8",
  "Shounen":          "#f97316",
  "Shoujo":           "#f472b6",
  "Seinen":           "#64748b",
  "Josei":            "#c084fc",
  "Kodomomuke":       "#a3e635",
  "Cyberpunk":        "#00ffff",
  "Steampunk":        "#b45309",
  "Post-Apocalyptic": "#dc2626",
  "Time Travel":      "#2dd4bf",
  "Magic":            "#d946ef",
  "Reincarnation":    "#10b981",
  "Villainess":       "#be185d",
  "Dungeon":          "#ca8a04",
  "Cultivation":      "#059669",
  "Manhwa":           "#6366f1",
  "Manhua":           "#ef4444",
  "Iyashikei":        "#86efac",
  "Racing":           "#f97316",
  "Cooking":          "#f59e0b",
  "Idol":             "#ec4899",
  "Otome":            "#e879f9",
  "Reverse Harem":    "#c084fc",
  "Delinquents":      "#ef4444",
  "Ninja":            "#166534",
  "Pirates":          "#0369a1",
  "Zombies":          "#4d7c0f",
};

function GenrePill({ genre }: { genre: string }) {
  const color = GENRE_COLORS[genre];

  const onEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!color) return;
    e.currentTarget.style.color = color;
    e.currentTarget.style.borderColor = color;
    e.currentTarget.style.backgroundColor = `${color}20`;
  };

  const onLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.color = "";
    e.currentTarget.style.borderColor = "";
    e.currentTarget.style.backgroundColor = "";
  };

  return (
    <Link
      href={`/browse?genre=${encodeURIComponent(genre)}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      className="shrink-0 rounded-[var(--radius)] border border-border bg-secondary px-4 py-1.5 text-sm font-medium text-muted-foreground transition-all duration-200 whitespace-nowrap"
    >
      {genre}
    </Link>
  );
}

export function GenreRow({ genres }: { genres?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const items = genres && genres.length >= 5 ? genres : ALL_GENRES;

  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => scroll("left")}
        aria-label="Scroll genres left"
        className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <ChevronLeft className="size-4" />
      </button>

      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-10 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-10 bg-gradient-to-l from-background to-transparent" />
        <div ref={ref} className="no-scrollbar flex gap-2 overflow-x-auto py-0.5">
          {items.map((g) => (
            <GenrePill key={g} genre={g} />
          ))}
        </div>
      </div>

      <button
        onClick={() => scroll("right")}
        aria-label="Scroll genres right"
        className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground transition hover:bg-accent hover:text-foreground"
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}
