// Shared types and helpers for the streaming API episode data

export interface ProviderEpisode {
  id: string;            // e.g. "watch/kiwi/178005/sub/animepahe-1" — use directly as watch URL
  number: number;
  title?: string | null;
  thumbnail?: string | null;
  image?: string | null;
  airDate?: string | null;
  duration?: number | null;
  filler?: boolean;
}

export interface ProviderData {
  provider?: string;
  episodes?: {
    sub?: ProviderEpisode[];
    dub?: ProviderEpisode[];
  };
  error?: string;
}

export type EpisodesMap = Record<string, ProviderData>;

export const PROVIDER_LABELS: Record<string, string> = {
  // Miruro API providers
  kiwi: "Kiwi",
  arc:  "Arc",
  zoro: "Zoro",
  hop:  "Hop",
  // Legacy / fallback
  reanime:    "Reanime",
  anikoto:    "AniKoto",
  animegg:    "AnimeGG",
  anineko:    "AniNeko",
  anidbapp:   "AniDB App",
  "2dhive":   "2DHive",
  animenosub: "AnimeNoSub",
  anizone:    "AniZone",
  anibd:      "AniBD",
  senshi:     "Senshi",
  kaa:        "KickAssAnime",
  animedunya: "AnimeDunya",
};

export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

/**
 * Normalise a raw API response into EpisodesMap.
 * The new API wraps providers under a top-level "providers" key:
 *   { mappings: {...}, providers: { kiwi: {...}, zoro: {...} } }
 * The old API had providers at the top level — both shapes are handled.
 */
export function parseProviders(raw: Record<string, unknown>): EpisodesMap {
  const result: EpisodesMap = {};

  const src = (
    typeof raw.providers === "object" && raw.providers !== null
      ? raw.providers
      : raw
  ) as Record<string, unknown>;

  for (const [key, val] of Object.entries(src)) {
    if (["mappings", "page", "type", "_unknownProviders"].includes(key)) continue;
    if (typeof val !== "object" || val === null) continue;
    const v = val as Record<string, unknown>;
    if (v.episodes || v.error) {
      result[key] = v as ProviderData;
    }
  }
  return result;
}

export function getEpisodeList(
  providers: EpisodesMap,
  provider: string,
  audio: "sub" | "dub"
): ProviderEpisode[] {
  return providers[provider]?.episodes?.[audio] ?? [];
}

export function findEpisode(
  providers: EpisodesMap,
  provider: string,
  audio: "sub" | "dub",
  num: number
): ProviderEpisode | null {
  const list = getEpisodeList(providers, provider, audio);
  return list.find((e) => e.number === num) ?? null;
}

export function firstAvailableProvider(
  providers: EpisodesMap,
  audio: "sub" | "dub",
  num: number
): string | null {
  for (const [name, data] of Object.entries(providers)) {
    if (data.error) continue;
    if ((data.episodes?.[audio] ?? []).some((e) => e.number === num)) return name;
  }
  return null;
}

export function hasAudio(
  providers: EpisodesMap,
  audio: "sub" | "dub",
  num: number
): boolean {
  return Object.values(providers).some(
    (p) => !p.error && (p.episodes?.[audio] ?? []).some((e) => e.number === num)
  );
}

/** Merge episode metadata across all providers, highest-quality source wins. */
export function mergedEpisodeList(providers: EpisodesMap, audio: "sub" | "dub"): ProviderEpisode[] {
  const byNumber = new Map<number, ProviderEpisode>();

  // Lowest-priority first; later entries overwrite with richer data.
  // zoro (hianime) has the best episode titles + images so it goes last.
  const PRIORITY = [
    "kiwi", "hop", "arc", "zoro",
    // legacy providers kept as fallback
    "kaa", "anineko", "animegg", "anikoto", "animedunya",
    "animenosub", "2dhive", "anidbapp", "reanime", "senshi", "anibd", "anizone",
  ];

  // Also include any providers not in the explicit list
  const allProviders = [
    ...PRIORITY,
    ...Object.keys(providers).filter((k) => !PRIORITY.includes(k)),
  ];

  for (const provName of allProviders) {
    const list = providers[provName]?.episodes?.[audio] ?? [];
    for (const ep of list) {
      const existing = byNumber.get(ep.number);
      if (!existing) {
        byNumber.set(ep.number, { ...ep });
      } else {
        if (ep.title && ep.title !== `Episode ${ep.number}`) existing.title = ep.title;
        if (ep.thumbnail) existing.thumbnail = ep.thumbnail;
        if (ep.image)     existing.image     = ep.image;
        if (ep.airDate)   existing.airDate   = ep.airDate;
        if (ep.duration)  existing.duration  = ep.duration;
        if (ep.filler !== undefined) existing.filler = ep.filler;
      }
    }
  }

  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}
