import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getAnimeDetail, preferredTitle } from "@/lib/anilist";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { StatusButtons } from "@/components/anime/status-buttons";
import { TrailerButton } from "@/components/anime/trailer-button";
import { DetailTabs } from "@/components/anime/detail-tabs";
import { AddToCollectionButton } from "@/components/anime/add-to-collection-button";

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

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const anilistId = Number(id);
  if (!Number.isInteger(anilistId)) notFound();

  const detail = await getAnimeDetail(anilistId).catch(() => null);
  if (!detail) notFound();

  const title = preferredTitle(detail);

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />

      {/* Banner */}
      <div className="relative h-[34vh] min-h-[240px] w-full overflow-hidden pt-16">
        {detail.bannerImage || detail.coverImage.large ? (
          <Image
            src={detail.bannerImage || detail.coverImage.large}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-primary/20 to-emerald-900/20" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/50 to-black/20" />

        {detail.trailer?.site === "youtube" && detail.trailer.id && (
          <div className="absolute bottom-6 right-6 z-10 hidden sm:block">
            <TrailerButton youtubeId={detail.trailer.id} />
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-16 sm:px-10">
        {/* Poster + info row */}
        <div className="-mt-24 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl border-4 border-[#141414] bg-white/5 shadow-2xl sm:w-48">
            {detail.coverImage.large && (
              <Image
                src={detail.coverImage.large}
                alt={title}
                fill
                sizes="192px"
                className="object-cover"
              />
            )}
          </div>

          <div className="flex-1 pb-1">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            {detail.averageScore && (
              <p className="mt-2 flex items-center gap-1.5 text-white/70">
                <span className="text-primary">★</span>
                {(detail.averageScore / 10).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          <StatusButtons animeId={anilistId} />
          <AddToCollectionButton />
        </div>

        {/* Trailer button — mobile fallback (banner overlay is desktop-only) */}
        {detail.trailer?.site === "youtube" && detail.trailer.id && (
          <div className="mt-4 sm:hidden">
            <TrailerButton youtubeId={detail.trailer.id} />
          </div>
        )}

        <div className="mt-10">
          <DetailTabs detail={detail} animeId={anilistId} />
        </div>
      </div>

      <Footer />
    </div>
  );
}
