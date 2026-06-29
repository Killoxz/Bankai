/**
 * Streaming client for Miruro-API.
 * Repo: https://github.com/walterwhite-69/Miruro-API
 * Accepts AniList IDs directly — no title-search mapping needed.
 * Set STREAMING_API_URL in .env to your self-hosted (or public) Miruro-API instance.
 */

import type { Episode, StreamData } from "@/types/anime";

const BASE = (process.env.STREAMING_API_URL ?? process.env.CONSUMET_URL ?? "").replace(/\/$/, "");

function enabled() {
  return !!BASE;
}

const PROVIDERS = ["kiwi", "ally", "bee", "hop", "bonk", "pewe", "moo"] as const;
type Provider = (typeof PROVIDERS)[number];

// Map user-facing server names → provider IDs
const SERVER_TO_PROVIDER: Record<string, Provider> = {
  Kiwi: "kiwi",
  Ally: "ally",
  Bee:  "bee",
  Hop:  "hop",
  Bonk: "bonk",
  Pewe: "pewe",
  Moo:  "moo",
};

// ── Response shapes ────────────────────────────────────────────────────────────

interface RawEpisode {
  /** Full watch path, e.g. "watch/kiwi/178005/sub/animepahe-1" */
  id: string;
  number: number;
  title?: string | null;
  image?: string | null;
  description?: string | null;
  airDate?: string | null;
  filler?: boolean;
  duration?: number;
}

interface ProviderEpisodes {
  episodes?: {
    sub?: RawEpisode[];
    dub?: RawEpisode[];
  };
}

interface EpisodesResponse {
  providers?: Partial<Record<Provider, ProviderEpisodes>>;
}

interface MiruroStream {
  url: string;
  type: "hls" | "hls-redirect" | string;
  quality?: string;
  referer?: string;
  isActive?: boolean;
}

interface MiruroSubtitle {
  file: string;
  label: string;
}

interface MiruroWatchResponse {
  streams?: MiruroStream[];
  subtitles?: MiruroSubtitle[];
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
}

// ── HTTP helper ────────────────────────────────────────────────────────────────

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate: 300 },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      "Referer": "https://www.miruro.to/",
      "Origin": "https://www.miruro.to",
    },
  });
  if (!res.ok) throw new Error(`Miruro ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// Strip the "anilist:" prefix to get the bare numeric AniList ID.
function numId(id: string) {
  return id.replace("anilist:", "");
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function getEpisodes(
  anilistId: string,
  _title?: string
): Promise<Episode[] | null> {
  if (!enabled()) return null;
  try {
    const data = await get<EpisodesResponse>(`/episodes/${numId(anilistId)}`);
    const providers = data.providers ?? {};

    for (const provider of PROVIDERS) {
      const eps = providers[provider]?.episodes?.sub ?? providers[provider]?.episodes?.dub;
      if (eps && eps.length > 0) {
        return eps.map((e) => ({
          id: e.id,
          number: e.number,
          title: e.title ?? `Episode ${e.number}`,
          thumbnail: e.image ?? undefined,
          description: e.description ?? undefined,
          airDate: e.airDate ?? null,
          isFiller: e.filler ?? false,
        }));
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function getStream(
  anilistId: string,
  episode: number,
  category: "sub" | "dub" = "sub",
  _title?: string,
  _episodes?: Episode[],
  server?: string
): Promise<StreamData | null> {
  if (!enabled()) return null;

  const nid = numId(anilistId);

  // Fetch episode list once — needed to resolve the provider-specific episode slug.
  // Next.js caches this for 5 min so rapid sub/dub/server switches are cheap.
  let episodesData: EpisodesResponse;
  try {
    episodesData = await get<EpisodesResponse>(`/episodes/${nid}`);
  } catch {
    return null;
  }

  const providers = episodesData.providers ?? {};

  // Put the user-selected server's provider first, then fall back to the rest.
  const preferred = server ? SERVER_TO_PROVIDER[server] : undefined;
  const order: readonly Provider[] = preferred
    ? [preferred, ...PROVIDERS.filter((p) => p !== preferred)]
    : PROVIDERS;

  for (const provider of order) {
    try {
      const providerEps = providers[provider]?.episodes;
      if (!providerEps) continue;

      // Prefer the requested category; fall back to the other if unavailable.
      const epList =
        providerEps[category] ??
        providerEps[category === "sub" ? "dub" : "sub"];
      if (!epList?.length) continue;

      const ep = epList.find((e) => e.number === episode);
      if (!ep) continue;

      // ep.id is the full watch path: "watch/kiwi/178005/sub/animepahe-1"
      const data = await get<MiruroWatchResponse>(`/${ep.id}`);

      const hlsSources = (data.streams ?? []).filter(
        (s) => s.type === "hls" && s.url && s.isActive !== false
      );
      if (!hlsSources.length) continue;

      return {
        sources: hlsSources.map((s) => {
          const ref = s.referer ? `&ref=${encodeURIComponent(s.referer)}` : "";
          return {
            url: `/api/proxy/stream?url=${encodeURIComponent(s.url)}${ref}`,
            quality: s.quality ?? "auto",
            isM3U8: true,
          };
        }),
        subtitles: (data.subtitles ?? []).map((s) => ({
          url: s.file,
          lang: s.label,
          default: s.label.toLowerCase().includes("english"),
        })),
        intro: data.intro ?? undefined,
        outro: data.outro ?? undefined,
      };
    } catch {
      // Provider failed — try the next one.
      continue;
    }
  }

  return null;
}
