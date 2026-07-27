import { notFound } from "next/navigation";
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
  return { title: `${preferredTitle(detail)} — Bankai` };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { id } = await params;
  const { ep } = await searchParams;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  const detail = await getAnimeDetail(anilistId).catch(() => null);
  if (!detail) notFound();

  const totalEpisodes = detail.episodes ?? 1;
  const currentEp = Math.min(Math.max(Number(ep) || 1, 1), totalEpisodes);
  const title = preferredTitle(detail);

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-24 sm:px-10">
        <h1 className="mb-1 text-xl font-bold text-white sm:text-2xl">{title}</h1>
        <p className="mb-6 text-sm text-white/50">
          Episode {currentEp} of {totalEpisodes}
        </p>
        <WatchView detail={detail} animeId={anilistId} currentEp={currentEp} />
      </div>
    </div>
  );
}
