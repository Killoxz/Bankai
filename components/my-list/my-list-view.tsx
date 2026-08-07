"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, Bookmark, CheckCircle2, Play } from "lucide-react";
import { motion } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { Footer } from "@/components/layout/footer";
import { useCardAnimation } from "@/hooks/use-card-animation";

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
  lists: { watching: AnimeStub[]; toWatch: AnimeStub[]; watched: AnimeStub[] };
}

type TabKey = "watching" | "toWatch" | "watched";

const TABS: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "watching", label: "Watching", icon: Eye },
  { key: "toWatch", label: "To Watch", icon: Bookmark },
  { key: "watched", label: "Watched", icon: CheckCircle2 },
];

function MyListCard({ anime, index }: { anime: AnimeStub; index: number }) {
  const { wrapRef, cardRef, glareRef, onMove, onLeave } = useCardAnimation();
  const href = `/anime/${anime.id.replace("anilist:", "")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.035, 0.5) }}
    >
      <Link href={href} className="group block">
        <div
          ref={wrapRef}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          style={{ perspective: "700px" }}
        >
          <div
            ref={cardRef}
            className="relative aspect-[2/3] overflow-hidden rounded-xl bg-gray-200 dark:bg-white/5"
            style={{
              transformStyle: "preserve-3d",
              transition:     "transform 0.12s ease-out, box-shadow 0.12s ease-out",
              willChange:     "transform",
            }}
          >
            {anime.coverImage && (
              <Image
                src={anime.coverImage}
                alt={anime.title}
                fill
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 180px"
                className="object-cover"
              />
            )}

            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-200 group-hover:bg-black/35">
              <div className="scale-75 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100">
                <div className="grid size-12 place-items-center rounded-full bg-primary shadow-xl">
                  <Play className="size-5 fill-black text-black" />
                </div>
              </div>
            </div>

            <div
              ref={glareRef}
              className="pointer-events-none absolute inset-0 z-10 rounded-xl"
              style={{ opacity: 0, transition: "opacity 0.25s ease-out" }}
            />

            <div className="absolute inset-0 rounded-xl ring-2 ring-inset ring-transparent transition-all duration-200 group-hover:ring-white/20" />
          </div>
        </div>

        <p className="mt-2 line-clamp-2 text-sm font-medium text-card-foreground group-hover:text-foreground">
          {anime.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {[anime.seasonYear, anime.genres[0]].filter(Boolean).join(", ")}
        </p>
      </Link>
    </motion.div>
  );
}

export function MyListView() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.currentUser);
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("watching");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    setLoading(true);
    fetch(`/api/profile?username=${encodeURIComponent(currentUser)}`)
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [mounted, currentUser, router]);

  if (!mounted || loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) return null;

  const counts: Record<TabKey, number> = {
    watching: data?.lists.watching.length ?? 0,
    toWatch: data?.lists.toWatch.length ?? 0,
    watched: data?.lists.watched.length ?? 0,
  };
  const items = data?.lists[tab] ?? [];
  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1600px] px-6 pb-16 pt-6 sm:px-10 md:pt-20">
        <h1 className="mb-6 text-2xl font-bold text-foreground sm:text-3xl">My List</h1>

        <div className="flex flex-wrap items-center gap-6 border-b border-border">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={[
                "flex items-center gap-1.5 border-b-2 pb-3 text-sm font-medium transition-colors",
                tab === key
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {label}
              <span className="text-xs text-muted-foreground">{counts[key]}</span>
            </button>
          ))}
        </div>

        <div className="py-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
              <p className="text-sm text-muted-foreground">Nothing in {activeLabel} yet.</p>
              <p className="text-xs text-muted-foreground/60">
                Anime you add to your list will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((anime, i) => (
                <MyListCard key={anime.id} anime={anime} index={i} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
