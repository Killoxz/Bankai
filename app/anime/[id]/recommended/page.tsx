import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAnimeDetail, preferredTitle } from "@/lib/anilist";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "Not Found • Bankai" };
  return { title: `Recommended • ${preferredTitle(detail)} • Bankai` };
}

export default async function RecommendedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animeId = Number(id);
  if (!Number.isInteger(animeId)) notFound();

  const detail = await getAnimeDetail(animeId).catch(() => null);
  if (!detail) notFound();

  const title = preferredTitle(detail);
  const recs  = detail.recommendations.nodes
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
        {/* Back */}
        <Link href={`/watch/${animeId}`} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Back to {title}
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-foreground">Suggested Series</h1>
        <p className="mb-8 text-sm text-muted-foreground">{recs.length} titles recommended if you like {title}</p>

        {recs.length === 0 ? (
          <p className="text-muted-foreground">No recommendations found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {recs.map((anime) => {
              const recTitle = anime.title.english ?? anime.title.romaji;
              return (
                <Link
                  key={anime.id}
                  href={`/watch/${anime.id}`}
                  className="group flex flex-col gap-2 rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5">
                    {anime.coverImage.large && (
                      <img
                        src={anime.coverImage.large}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    {(anime.averageScore || anime.episodes) && (
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8">
                        <div className="flex items-center gap-2 text-[11px] text-white/70">
                          {anime.averageScore && (
                            <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                              ★ {anime.averageScore}
                            </span>
                          )}
                          {anime.episodes && <span>{anime.episodes} ep</span>}
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-foreground/80 px-1">
                    {recTitle}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
