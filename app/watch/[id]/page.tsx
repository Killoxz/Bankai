import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAnimeDetail, preferredTitle } from "@/lib/anilist";
import { fetchEpisodesRaw } from "@/lib/streaming";
import { Footer }    from "@/components/layout/footer";
import { WatchView } from "@/components/watch/watch-view";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "Not found • Bankai" };
  return { title: `Watch ${preferredTitle(detail)} • Bankai` };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string; audio?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  const episodesTimeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), 800),
  );

  const [detail, episodesRaw] = await Promise.all([
    getAnimeDetail(anilistId).catch(() => null),
    Promise.race([fetchEpisodesRaw(anilistId), episodesTimeout]),
  ]);

  if (!detail) notFound();

  const initialEpisode = Math.max(1, Number(sp.ep ?? 1) || 1);
  const initialAudio: "sub" | "dub" = sp.audio === "dub" ? "dub" : "sub";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-6 sm:px-10 md:pt-20">
        <Suspense>
          <WatchView
            detail={detail}
            animeId={anilistId}
            initialEpisode={initialEpisode}
            initialEpisodesRaw={episodesRaw}
            initialAudio={initialAudio}
          />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
