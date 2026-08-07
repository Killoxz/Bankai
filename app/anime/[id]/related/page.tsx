import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAnimeDetail, preferredTitle } from "@/lib/anilist";
import { Footer } from "@/components/layout/footer";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const detail = await getAnimeDetail(Number(id)).catch(() => null);
  if (!detail) return { title: "Not Found • Bankai" };
  return { title: `Related Series • ${preferredTitle(detail)} • Bankai` };
}

export default async function RelatedPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const animeId = Number(id);
  if (!Number.isInteger(animeId)) notFound();

  const detail = await getAnimeDetail(animeId).catch(() => null);
  if (!detail) notFound();

  const title   = preferredTitle(detail);
  const related = detail.relations.edges.filter((r) => r.node.type === "ANIME");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-8 md:pt-20">
        {/* Back */}
        <Link href={`/watch/${animeId}`} className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <span className="material-symbols-rounded" style={{ fontSize: 18 }}>arrow_back</span>
          Back to {title}
        </Link>

        <h1 className="mb-1 text-2xl font-bold text-foreground">Related Series</h1>
        <p className="mb-8 text-sm text-muted-foreground">{related.length} titles related to {title}</p>

        {related.length === 0 ? (
          <p className="text-muted-foreground">No related anime found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {related.map(({ node, relationType }) => {
              const label = relationType
                .replace(/_/g, " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
              return (
                <Link
                  key={node.id}
                  href={`/watch/${node.id}`}
                  className="group flex flex-col gap-2 rounded-xl overflow-hidden transition-transform duration-200 hover:scale-[1.02]"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden rounded-xl bg-white/5">
                    {node.coverImage.large && (
                      <img
                        src={node.coverImage.large}
                        alt=""
                        className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-2 pt-8">
                      <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {label}
                      </span>
                    </div>
                  </div>
                  <p className="line-clamp-2 text-xs font-medium text-foreground/80 px-1">
                    {node.title.english ?? node.title.romaji}
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
