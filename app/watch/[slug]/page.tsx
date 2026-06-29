import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProvider } from "@/services/providers";
import { WatchView } from "@/features/watch/watch-view";
import { preferredTitle } from "@/lib/utils";
import type { AnimeDetail } from "@/types/anime";

export type SeasonEntry = {
  id: string;
  slug: string;
  title: { english?: string | null; romaji?: string | null };
};

const TV_FORMATS = new Set(["TV"]);

async function buildSeasonChain(detail: AnimeDetail): Promise<SeasonEntry[]> {
  const provider = getProvider();
  const numId = (id: string) => Number(id.replace("anilist:", "")) || 0;

  const map = new Map<string, SeasonEntry>();
  const visited = new Set<string>();

  // Word tokens used for title similarity check
  const tok = (t: string) =>
    t.toLowerCase().replace(/[^\w\s]/g, " ").split(/\s+/).filter((w) => w.length > 1);

  // One word-set per language variant of the main title
  const mainSets = [detail.title.english, detail.title.romaji]
    .filter(Boolean)
    .map((t) => new Set(tok(t!)));

  // True when the candidate title (any language) contains ALL words from at least
  // one of the main title's variants — keeps BFS inside the same franchise.
  const sameSeries = (relTitle: { english?: string | null; romaji?: string | null }): boolean => {
    if (mainSets.length === 0) return true;
    const cands = [relTitle.english, relTitle.romaji].filter(Boolean) as string[];
    return cands.some((t) => {
      const s = new Set(tok(t));
      return mainSets.some((ms) => ms.size > 0 && [...ms].every((w) => s.has(w)));
    });
  };

  const isSeasonRel = (r: {
    relationType?: string | null;
    format?: string | null;
    title?: { english?: string | null; romaji?: string | null } | null;
  }) =>
    (r.relationType === "PREQUEL" || r.relationType === "SEQUEL") &&
    TV_FORMATS.has(r.format ?? "") &&
    (!r.title || sameSeries(r.title));

  const add = (e: SeasonEntry) => { if (!map.has(e.id)) map.set(e.id, e); };

  add({ id: detail.id, slug: detail.slug, title: detail.title });
  visited.add(detail.slug);

  const directSeasons = detail.relations.filter(isSeasonRel);
  for (const r of directSeasons) add({ id: r.id, slug: r.slug, title: r.title });

  // BFS: 2 rounds — discovers up to ~7 seasons from any position in the chain
  let queue = [...new Set(directSeasons.map((r) => r.slug).filter((s) => !visited.has(s)))];

  for (let depth = 0; depth < 2 && queue.length > 0; depth++) {
    const batch = queue.slice(0, 6);
    batch.forEach((s) => visited.add(s));
    queue = [];

    const results = await Promise.allSettled(batch.map((slug) => provider.getBySlug(slug).catch(() => null)));

    for (const result of results) {
      if (result.status !== "fulfilled" || !result.value) continue;
      for (const r of result.value.relations) {
        if (!isSeasonRel(r)) continue;
        add({ id: r.id, slug: r.slug, title: r.title });
        if (!visited.has(r.slug)) queue.push(r.slug);
      }
    }
    queue = [...new Set(queue)];
  }

  return [...map.values()].sort((a, b) => numId(a.id) - numId(b.id));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProvider().getBySlug(slug);
  return { title: detail ? `Watch ${preferredTitle(detail.title)}` : "Watch" };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ep?: string }>;
}) {
  const { slug } = await params;
  const { ep: epStr } = await searchParams;
  const initialEp = Math.max(1, Number(epStr ?? "1"));

  const detail = await getProvider().getBySlug(slug);
  if (!detail) notFound();

  const seasonChain = await buildSeasonChain(detail);

  return <WatchView detail={detail} seasonChain={seasonChain} initialEp={initialEp} />;
}
