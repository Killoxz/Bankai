import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getAnimeDetail, preferredTitle } from "@/lib/anilist";
import { Navbar } from "@/components/layout/navbar";
import { WatchView } from "@/components/watch/watch-view";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "Not found — Bankai" };
  return { title: `Watch ${preferredTitle(detail)} — Bankai` };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  const detail = await getAnimeDetail(anilistId).catch(() => null);
  if (!detail) notFound();

  const initialEpisode = Math.max(1, Number(sp.ep ?? 1) || 1);
  const title = preferredTitle(detail);
  const subtitle = [
    detail.episodes ? `${detail.episodes} Episodes` : null,
    detail.format,
    detail.genres.slice(0, 2).join(", "),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-28 sm:px-10">
        <h1 className="mb-1 text-xl font-bold text-white sm:text-2xl">{title}</h1>
        {subtitle && <p className="mb-6 text-sm text-white/50">{subtitle}</p>}
        <Suspense>
          <WatchView detail={detail} animeId={anilistId} initialEpisode={initialEpisode} />
        </Suspense>
      </div>
    </div>
  );
}
