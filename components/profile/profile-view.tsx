"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Eye, Bookmark, CheckCircle2, Folder, ChevronDown, Filter as FilterIcon } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

const PROFILE_BANNER =
  "https://s4.anilist.co/file/anilistcdn/media/anime/banner/178789-9nHWmoRLlcLu.jpg";

interface AnimeStub {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  seasonYear: number | null;
  genres: string[];
  format: string | null;
}

interface ProfileData {
  username: string;
  createdAt: string;
  lists: {
    watching: AnimeStub[];
    toWatch: AnimeStub[];
    watched: AnimeStub[];
  };
}

type ListTabKey = "watching" | "toWatch" | "watched";
type TabKey = ListTabKey | "collections";
type SortKey = "recent" | "title" | "year";

const TABS: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "watching", label: "Watching", icon: Eye },
  { key: "toWatch", label: "To Watch", icon: Bookmark },
  { key: "watched", label: "Watched", icon: CheckCircle2 },
  { key: "collections", label: "Collections", icon: Folder },
];

const SORT_OPTIONS: [SortKey, string][] = [
  ["recent", "Recently Updated"],
  ["title", "Title (A-Z)"],
  ["year", "Year"],
];

export function ProfileView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("watching");
  const [sort, setSort] = useState<SortKey>("recent");
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/profile?username=${encodeURIComponent(currentUser)}`)
      .then((res) => res.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) setError(json.error);
        else setData(json);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your profile. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mounted, currentUser, router]);

  const activeItems = useMemo<AnimeStub[]>(() => {
    if (!data) return [];
    const key: ListTabKey | null = tab === "collections" ? null : tab;
    if (!key) return [];
    const items = [...data.lists[key]];
    if (sort === "title") items.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === "year") items.sort((a, b) => (b.seasonYear ?? 0) - (a.seasonYear ?? 0));
    return items;
  }, [data, tab, sort]);

  if (!mounted || (loading && !data)) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) return null; // redirect in flight

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#141414] px-4 text-center">
        <p className="text-white/60">{error}</p>
        <Link href="/" className="text-sm text-primary hover:underline">
          Back to Home
        </Link>
      </div>
    );
  }

  const counts: Record<TabKey, number> = {
    watching: data?.lists.watching.length ?? 0,
    toWatch: data?.lists.toWatch.length ?? 0,
    watched: data?.lists.watched.length ?? 0,
    collections: 0,
  };
  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />

      <div className="pt-24">
        {/* Banner */}
        <div className="relative h-44 w-full overflow-hidden bg-[#0a0a0a] sm:h-56">
          <Image
            src={PROFILE_BANNER}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-[#141414]" />
        </div>

        <div className="px-8 sm:px-12">
          {/* Avatar + username — relative z-10 so this paints above the
              banner (position:relative content painting rules would
              otherwise put a positioned-but-earlier sibling underneath it) */}
          <div className="relative z-10 -mt-16 flex flex-col gap-4 sm:-mt-20 sm:flex-row sm:items-end">
            <div className="grid size-24 shrink-0 place-items-center rounded-full border-4 border-[#141414] bg-primary text-3xl font-bold text-black shadow-xl sm:size-28">
              {currentUser[0]?.toUpperCase()}
            </div>
            <div className="pb-1">
              <h1 className="text-2xl font-bold text-white sm:text-3xl">{currentUser}</h1>
              <p className="mt-1 text-sm text-white/50">0 Following · 0 Followers</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-6">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={[
                    "flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors",
                    tab === key
                      ? "border-primary text-white"
                      : "border-transparent text-white/45 hover:text-white/75",
                  ].join(" ")}
                >
                  <Icon className="size-4" />
                  {label}
                  <span className="text-xs text-white/40">{counts[key]}</span>
                </button>
              ))}
            </div>

            <div className="mb-3 flex items-center gap-2">
              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setSortOpen(false);
                }}
              >
                <button
                  onClick={() => setSortOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30"
                >
                  Sort By
                  <ChevronDown className="size-3.5" />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-9 z-10 w-40 overflow-hidden rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-xl">
                    {SORT_OPTIONS.map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSort(key);
                          setSortOpen(false);
                        }}
                        className={[
                          "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                          sort === key ? "text-primary" : "text-white/70",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div
                className="relative"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setFilterOpen(false);
                }}
              >
                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-black transition hover:brightness-95"
                >
                  <FilterIcon className="size-3.5" />
                  Filters
                </button>
                {filterOpen && (
                  <div className="absolute right-0 top-9 z-10 w-48 rounded-lg border border-white/10 bg-[#1c1c1c] px-3 py-2.5 text-xs text-white/50 shadow-xl">
                    Filters are coming soon.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Grid */}
          <div className="py-8">
            {tab === "collections" ? (
              <EmptyState message="Collections aren't available yet — check back soon." />
            ) : activeItems.length === 0 ? (
              <EmptyState
                message={`Nothing in ${activeLabel} yet.`}
                hint="Anime you add to your list will show up here."
              />
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {activeItems.map((anime) => (
                  <Link key={anime.id} href={`/anime/${anime.slug}`} className="group">
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-white/5">
                      {anime.coverImage && (
                        <Image
                          src={anime.coverImage}
                          alt={anime.title}
                          fill
                          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      )}
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-white/90">
                      {anime.title}
                    </p>
                    <p className="text-xs text-white/40">
                      {[anime.seasonYear, anime.genres[0]].filter(Boolean).join(", ")}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}

function EmptyState({ message, hint }: { message: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
      <p className="text-sm text-white/50">{message}</p>
      {hint && <p className="text-xs text-white/30">{hint}</p>}
    </div>
  );
}
