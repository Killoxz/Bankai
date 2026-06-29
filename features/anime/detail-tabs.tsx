"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AnimeCard } from "@/components/anime/anime-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EpisodeList } from "./episode-list";
import { Comments } from "./comments";
import { formatScore, formatNumber, preferredTitle } from "@/lib/utils";
import { usePlayerStore } from "@/store/player-store";
import { useQuery } from "@tanstack/react-query";
import type { AnimeDetail } from "@/types/anime";

export function DetailTabs({ detail }: { detail: AnimeDetail }) {
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  return (
    <Tabs defaultValue="overview" className="space-y-5">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="episodes">Episodes</TabsTrigger>
        <TabsTrigger value="characters">Characters</TabsTrigger>
        <TabsTrigger value="reviews">Reviews</TabsTrigger>
        <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <p className="whitespace-pre-line leading-relaxed text-foreground/90">
              {detail.description || "No synopsis available."}
            </p>

            {detail.relations.length > 0 && (
              <section>
                <h3 className="mb-3 font-semibold">Related</h3>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
                  {detail.relations.map((r) => (
                    <Link key={r.id} href={`/anime/${r.slug}`} className="group">
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-muted">
                        {r.coverImage && (
                          <Image src={r.coverImage} alt="" fill sizes="120px" className="object-cover transition group-hover:scale-105" />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] uppercase tracking-wide text-primary">
                        {r.relationType?.replace(/_/g, " ")}
                      </p>
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {preferredTitle(r.title, titleLanguage)}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <Comments />
          </div>

          <aside className="space-y-4">
            <Stat label="Score" value={detail.averageScore ? `★ ${formatScore(detail.averageScore)}` : "N/A"} />
            <Stat label="Popularity" value={`#${detail.stats?.rankPopularity ?? "—"}`} />
            <Stat label="Favorites" value={formatNumber(detail.stats?.favourites)} />
            {detail.producers.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Producers</p>
                <p className="text-sm">{detail.producers.join(", ")}</p>
              </div>
            )}
            {detail.externalLinks && detail.externalLinks.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">External &amp; Streaming</p>
                <div className="flex flex-wrap gap-2">
                  {detail.externalLinks.map((l) => (
                    <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
                      <Badge variant="secondary" className="cursor-pointer hover:bg-accent">{l.site}</Badge>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </TabsContent>

      <TabsContent value="episodes">
        <EpisodeList animeId={detail.id} slug={detail.slug} layout="grid" />
      </TabsContent>

      <TabsContent value="characters">
        {detail.characters.length === 0 ? (
          <p className="text-sm text-muted-foreground">No character data available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {detail.characters.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2">
                <div className="flex items-center gap-2">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {c.image && <Image src={c.image} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.role}</p>
                  </div>
                </div>
                {c.voiceActor && (
                  <div className="flex items-center gap-2 text-right">
                    <div>
                      <p className="text-sm font-medium">{c.voiceActor.name}</p>
                      <p className="text-xs text-muted-foreground">{c.voiceActor.language}</p>
                    </div>
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                      {c.voiceActor.image && (
                        <Image src={c.voiceActor.image} alt="" fill sizes="48px" className="object-cover" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="reviews">
        <Reviews animeId={detail.id} score={detail.averageScore} />
      </TabsContent>

      <TabsContent value="recommendations">
        {detail.recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommendations yet.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {detail.recommendations.map((a, i) => (
              <AnimeCard key={a.id} anime={a} index={i} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

interface AniListReview {
  id: number;
  rating: number;
  ratingAmount: number;
  summary: string;
  score: number;
  createdAt: number;
  user: { name: string; avatar: { large: string } | null };
}

function Reviews({ animeId, score }: { animeId: string; score?: number | null }) {
  const { data: reviews, isLoading } = useQuery<AniListReview[]>({
    queryKey: ["reviews", animeId],
    queryFn: async () => {
      const res = await fetch(`/api/anime/${encodeURIComponent(animeId)}/reviews`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-4">
        <Star className="size-5 fill-amber-400 text-amber-400" />
        <span className="text-2xl font-bold">{score ? formatScore(score) : "N/A"}</span>
        <span className="text-sm text-muted-foreground">community score</span>
      </div>

      {isLoading && (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && (!reviews || reviews.length === 0) && (
        <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          No reviews yet for this title.
        </p>
      )}

      {reviews?.map((r) => (
        <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Avatar src={r.user.avatar?.large} fallback={r.user.name} size={32} />
              <span className="font-medium">{r.user.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.createdAt * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
              </span>
            </div>
            <Badge variant="default" className="gap-1 shrink-0">
              <Star className="size-3 fill-current" /> {formatScore(r.score)}
            </Badge>
          </div>
          {r.summary && <p className="text-sm font-medium text-foreground/90 italic">&ldquo;{r.summary}&rdquo;</p>}
          {r.rating != null && r.ratingAmount > 0 && (
            <p className="text-xs text-muted-foreground">
              {r.rating} of {r.ratingAmount} found this helpful
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
