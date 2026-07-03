/**
 * Streaming client for Miruro TV.
 * Calls the Miruro.tv secure pipe directly from our Next.js API routes
 * (Vercel) instead of going through the Railway proxy, which was broken
 * because Miruro.tv added Cloudflare protection to their pipe endpoint
 * and Railway IPs fail the challenge.
 *
 * Pipe encoding:  JSON payload → base64url → ?e= query param
 * Pipe decoding:  base64url → (optional XOR) → gzip → JSON
 * XOR key (hex):  71951034f8fbcf53d89db52ceb3dc22c  (from Miruro.tv env)
 */

import { gunzipSync } from "zlib";
import type { Episode, StreamData } from "@/types/anime";

const PIPE_URL = "https://www.miruro.tv/api/secure/pipe";
const XOR_KEY_HEX = "71951034f8fbcf53d89db52ceb3dc22c";
const XOR_KEY = Buffer.from(XOR_KEY_HEX, "hex");

const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Accept": "text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://www.miruro.tv/",
  "sec-ch-ua": '"Chromium";v="130", "Not?A_Brand";v="99"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
};

// ── Encoding ──────────────────────────────────────────────────────────────────

function encodePipe(path: string, query: Record<string, unknown> = {}): string {
  const payload = { path, method: "GET", query, body: null, version: "0.1.0" };
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

// ── Decoding ──────────────────────────────────────────────────────────────────

function xorDecrypt(buf: Uint8Array): Uint8Array {
  const out = new Uint8Array(buf.length);
  for (let i = 0; i < buf.length; i++) {
    out[i] = buf[i] ^ XOR_KEY[i % XOR_KEY.length];
  }
  return out;
}

function decodeResponse(text: string, obfuscated: string | null): unknown {
  if (!obfuscated) {
    // Plain JSON response
    return JSON.parse(text);
  }
  // Base64url → bytes
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  let bytes: Uint8Array = new Uint8Array(Buffer.from(b64, "base64"));
  if (obfuscated === "2") {
    bytes = xorDecrypt(bytes);
  }
  // Gzip decompress
  return JSON.parse(gunzipSync(bytes).toString("utf-8"));
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function pipe<T>(path: string, query: Record<string, unknown> = {}): Promise<T> {
  const e = encodePipe(path, query);
  const url = `${PIPE_URL}?e=${encodeURIComponent(e)}`;
  const res = await fetch(url, {
    headers: HEADERS,
    // Short cache — episode lists don't change often
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`Miruro pipe ${res.status} for ${path}`);
  }
  const text = await res.text();
  const obfuscated = res.headers.get("x-obfuscated");
  return decodeResponse(text, obfuscated) as T;
}

// ── Response shapes ───────────────────────────────────────────────────────────

interface RawEpisode {
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
  providers?: Record<string, ProviderEpisodes>;
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

interface MiruroSourcesResponse {
  streams?: MiruroStream[];
  subtitles?: MiruroSubtitle[];
  intro?: { start: number; end: number } | null;
  outro?: { start: number; end: number } | null;
}

// ── AniSkip fallback ──────────────────────────────────────────────────────────

async function getMalId(numericAnilistId: string): Promise<number | null> {
  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: "query($id:Int){Media(id:$id){idMal}}",
        variables: { id: Number(numericAnilistId) },
      }),
      next: { revalidate: 86400 },
    });
    const data = await res.json();
    return (data as any).data?.Media?.idMal ?? null;
  } catch {
    return null;
  }
}

async function getAniSkipTimes(
  malId: number,
  episode: number
): Promise<{ intro?: { start: number; end: number }; outro?: { start: number; end: number } }> {
  try {
    const res = await fetch(
      `https://api.aniskip.com/v2/skip-times/${malId}/${episode}?types[]=op&types[]=ed&episodeLength=0`,
      { next: { revalidate: 86400 } }
    );
    if (!res.ok) return {};
    const data = await res.json() as any;
    if (!data.found) return {};
    const op = data.results?.find((r: any) => r.skipType === "op");
    const ed = data.results?.find((r: any) => r.skipType === "ed");
    return {
      intro: op ? { start: op.interval.startTime, end: op.interval.endTime } : undefined,
      outro: ed ? { start: ed.interval.startTime, end: ed.interval.endTime } : undefined,
    };
  } catch {
    return {};
  }
}

// ── ID helpers ────────────────────────────────────────────────────────────────

function numId(id: string) {
  return id.replace("anilist:", "");
}

// Provider preference order (matches Miruro.tv v2 providers)
const PROVIDERS = ["kiwi", "arc", "zoro", "jet", "ally", "bee", "hop", "bonk", "pewe", "moo"] as const;
type Provider = (typeof PROVIDERS)[number];

const SERVER_TO_PROVIDER: Record<string, Provider> = {
  Kiwi: "kiwi",
  Arc:  "arc",
  Zoro: "zoro",
  Jet:  "jet",
  Ally: "ally",
  Bee:  "bee",
  Hop:  "hop",
  Bonk: "bonk",
};

// ── Public API ────────────────────────────────────────────────────────────────

export async function getEpisodes(
  anilistId: string,
  _title?: string
): Promise<Episode[] | null> {
  try {
    const nid = numId(anilistId);
    const data = await pipe<EpisodesResponse>("episodes", { anilistId: nid });
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
  const nid = numId(anilistId);

  // Fetch episode list to resolve provider-specific episode IDs
  let episodesData: EpisodesResponse;
  try {
    episodesData = await pipe<EpisodesResponse>("episodes", { anilistId: nid });
  } catch {
    return null;
  }

  const providers = episodesData.providers ?? {};

  const preferred = server ? SERVER_TO_PROVIDER[server] : undefined;
  const order: readonly string[] = preferred
    ? [preferred, ...PROVIDERS.filter((p) => p !== preferred)]
    : PROVIDERS;

  for (const provider of order) {
    try {
      const providerEps = providers[provider]?.episodes;
      if (!providerEps) continue;

      const epList =
        providerEps[category] ??
        providerEps[category === "sub" ? "dub" : "sub"];
      if (!epList?.length) continue;

      const ep = epList.find((e) => e.number === episode);
      if (!ep) continue;

      // ep.id is the full source ID (provider-specific format)
      const data = await pipe<MiruroSourcesResponse>("sources", {
        episodeId: ep.id,
        provider,
        category,
        anilistId: nid,
      });

      const hlsSources = (data.streams ?? []).filter(
        (s) => s.type === "hls" && s.url && s.isActive !== false
      );
      if (!hlsSources.length) continue;

      let intro: StreamData["intro"] = data.intro ?? undefined;
      let outro: StreamData["outro"] = data.outro ?? undefined;

      if (!intro && !outro) {
        const malId = await getMalId(nid);
        if (malId) {
          const skip = await getAniSkipTimes(malId, episode);
          intro = skip.intro;
          outro = skip.outro;
        }
      }

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
        intro,
        outro,
      };
    } catch {
      continue;
    }
  }

  return null;
}
