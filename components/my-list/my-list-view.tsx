"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Eye, Bookmark, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

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
      <div className="grid min-h-screen place-items-center bg-[#141414]">
        <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-primary" />
      </div>
    );
  }

  if (!currentUser) return null; // redirect in flight

  const counts: Record<TabKey, number> = {
    watching: data?.lists.watching.length ?? 0,
    toWatch: data?.lists.toWatch.length ?? 0,
    watched: data?.lists.watched.length ?? 0,
  };
  const items = data?.lists[tab] ?? [];
  const activeLabel = TABS.find((t) => t.key === tab)?.label ?? "";

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[1600px] px-6 pb-16 pt-24 sm:px-10">
        <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">My List</h1>

        <div className="flex flex-wrap items-center gap-6 border-b border-white/10">
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

        <div className="py-8">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-16 text-center">
              <p className="text-sm text-white/50">Nothing in {activeLabel} yet.</p>
              <p className="text-xs text-white/30">
                Anime you add to your list will show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((anime) => (
                <Link key={anime.id} href={`/anime/${anime.id.replace("anilist:", "")}`} className="group">
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
      <Footer />
    </div>
  );
}
