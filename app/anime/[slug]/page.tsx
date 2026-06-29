import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Calendar, Clock, Film, Layers, Tv, Building2 } from "lucide-react";
import { getProvider } from "@/services/providers";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { AnimeActions } from "@/features/anime/anime-actions";
import { TrailerButton } from "@/features/anime/trailer-button";
import { DetailTabs } from "@/features/anime/detail-tabs";
import {
  formatFormat,
  formatStatus,
  preferredTitle,
  formatNumber,
} from "@/lib/utils";
import { toCardFromDetail } from "@/lib/to-card";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProvider().getBySlug(slug);
  if (!detail) return { title: "Not found" };
  return {
    title: preferredTitle(detail.title),
    description: detail.description?.slice(0, 160),
  };
}

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getProvider().getBySlug(slug);
  if (!detail) notFound();

  const card = toCardFromDetail(detail);
  const title = preferredTitle(detail.title);

  const meta = [
    detail.format && { icon: Film, label: formatFormat(detail.format) },
    detail.episodes && { icon: Layers, label: `${detail.episodes} eps` },
    detail.duration && { icon: Clock, label: `${detail.duration} min` },
    detail.seasonYear && { icon: Calendar, label: String(detail.seasonYear) },
    detail.status && { icon: Tv, label: formatStatus(detail.status) },
  ].filter(Boolean) as { icon: typeof Film; label: string }[];

  return (
    <div>
      {/* Banner */}
      <div className="relative h-[34vh] min-h-[240px] w-full overflow-hidden">
        {detail.bannerImage || detail.coverImage ? (
          <Image
            src={detail.bannerImage || detail.coverImage}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="size-full bg-gradient-to-br from-primary/20 to-fuchsia-500/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
      </div>

      <PageContainer className="-mt-28 space-y-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          {/* Poster */}
          <div className="relative aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-xl border-4 border-background bg-muted shadow-2xl sm:w-48">
            {detail.coverImage && (
              <Image src={detail.coverImage} alt={title} fill sizes="192px" className="object-cover" />
            )}
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap gap-2">
              {detail.genres.slice(0, 5).map((g) => (
                <Badge key={g} variant="glass">{g}</Badge>
              ))}
            </div>
            <h1 className="text-balance text-3xl font-bold sm:text-4xl">{title}</h1>
            {detail.title.native && (
              <p className="text-muted-foreground">{detail.title.native}</p>
            )}

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
              {meta.map((m, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  <m.icon className="size-4" />
                  {m.label}
                </span>
              ))}
              {detail.studios.length > 0 && (
                <span className="flex items-center gap-1.5">
                  <Building2 className="size-4" />
                  {detail.studios.join(", ")}
                </span>
              )}
              {detail.popularity ? (
                <span>{formatNumber(detail.popularity)} members</span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <AnimeActions anime={card} slug={detail.slug} />
              {detail.trailer?.site === "youtube" && detail.trailer.id && (
                <TrailerButton youtubeId={detail.trailer.id} />
              )}
            </div>
          </div>
        </div>

        <DetailTabs detail={detail} />
      </PageContainer>
    </div>
  );
}
