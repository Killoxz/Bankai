import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { getHomeData, preferredTitle, type AnimeMedia } from "@/lib/anilist";
import { stripHtml } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";

export const revalidate = 3600;

const GENRES = [
  "All Genres",
  "Action",
  "Fantasy",
  "Slice of Life",
  "Adventure",
  "Comedy",
  "Romance",
  "School",
  "Time Travel",
  "Comic Adaptation",
  "Supernatural",
  "Drama",
  "Sci-Fi",
  "Sports",
  "Music",
];

export default async function HomePage() {
  let hero: AnimeMedia | undefined;
  let trending: AnimeMedia[] = [];
  let popular: AnimeMedia[] = [];
  let topRated: AnimeMedia[] = [];
  let newSeason: AnimeMedia[] = [];

  try {
    const data = await getHomeData();
    hero = data.hero;
    trending = data.trending;
    popular = data.popular;
    topRated = data.topRated;
    newSeason = data.newSeason;
  } catch {
    /* render fallback state below */
  }

  const heroTitle = hero ? preferredTitle(hero) : "Bankai";
  const heroDesc = hero?.description
    ? stripHtml(hero.description).slice(0, 220)
    : "Stream the best anime in HD — sub and dub.";

  return (
    <div className="min-h-screen" style={{ background: "#141414" }}>
      <Navbar />

      {/* ── Hero ─────────────────────────────────── */}
      <section
        className="relative w-full"
        style={{ height: "min(72vh, 720px)", minHeight: 520 }}
      >
        {/* Background image */}
        {hero?.bannerImage ? (
          <Image
            src={hero.bannerImage}
            alt={heroTitle}
            fill
            priority
            sizes="100vw"
            className="object-cover object-top"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
        )}

        {/* Left gradient — makes text readable */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, #141414 0%, rgba(20,20,20,.85) 30%, rgba(20,20,20,.4) 60%, transparent 85%)",
          }}
        />
        {/* Bottom fade into page */}
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: "linear-gradient(to top, #141414 0%, transparent 100%)" }}
        />

        {/* Content */}
        <div className="absolute bottom-20 left-0 right-0 px-8 sm:px-12">
          <div className="max-w-lg">
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-white/60 line-clamp-3">
              {heroDesc}
              {hero?.description && stripHtml(hero.description).length > 220 ? "…" : ""}
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link
                href={hero ? `/watch/${hero.id}` : "#"}
                className="flex items-center gap-2 rounded-full border border-white bg-white/10 px-6 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Play className="size-4 fill-white" />
                Play
              </Link>
              <Link
                href={hero ? `/anime/${hero.id}` : "#"}
                className="rounded-full border border-white/25 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/50"
              >
                More Info
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Page content ─────────────────────────── */}
      <div className="relative z-10 -mt-4 space-y-10 px-8 pb-16 sm:px-12">

        {/* Trending Now */}
        <AnimeRow title="Trending Now" items={trending} />

        {/* Genre filter */}
        <GenrePills />

        {/* Continue Watching — using popular as stand-in */}
        <AnimeRow
          title="Continue Watching for You"
          items={popular.slice(0, 10)}
          showProgress
        />

        {/* New Season */}
        <AnimeRow title="New Season" items={newSeason} showBadge />

        {/* Recommended */}
        <AnimeRow title="Recommended For You" items={topRated} />
      </div>
    </div>
  );
}

/* ─── Anime Row ──────────────────────────────────── */
function AnimeRow({
  title,
  items,
  showProgress = false,
  showBadge = false,
}: {
  title: string;
  items: AnimeMedia[];
  showProgress?: boolean;
  showBadge?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 text-base font-semibold text-white">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {items.map((anime) => (
          <AnimeCard
            key={anime.id}
            anime={anime}
            showProgress={showProgress}
            showBadge={showBadge}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Anime Card ─────────────────────────────────── */
function AnimeCard({
  anime,
  showProgress,
  showBadge,
}: {
  anime: AnimeMedia;
  showProgress?: boolean;
  showBadge?: boolean;
}) {
  const title = preferredTitle(anime);
  const isNew = anime.status === "RELEASING";
  const progress = showProgress ? ((anime.id % 65) + 15) : 0;

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group flex-shrink-0"
      style={{ width: 148 }}
    >
      {/* Poster */}
      <div className="relative overflow-hidden rounded-xl bg-white/5" style={{ aspectRatio: "2/3" }}>
        {anime.coverImage.large && (
          <Image
            src={anime.coverImage.large}
            alt={title}
            fill
            sizes="148px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* "New Season" badge */}
        {(showBadge || isNew) && (
          <span className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            New Season
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-white/0 transition-all duration-200 group-hover:ring-white/30" />

        {/* Progress bar */}
        {showProgress && (
          <div className="absolute inset-x-0 bottom-0">
            <div className="h-[3px] w-full bg-white/20">
              <div
                className="h-full bg-red-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Title */}
      <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-white/90">
        {title}
      </p>
    </Link>
  );
}

/* ─── Genre Pills ────────────────────────────────── */
function GenrePills() {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {GENRES.map((genre, i) => (
        <button
          key={genre}
          className={[
            "flex-shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
            i === 0
              ? "bg-white text-black"
              : "border border-white/25 text-white/75 hover:border-white/50 hover:text-white",
          ].join(" ")}
        >
          {genre}
        </button>
      ))}
    </div>
  );
}
