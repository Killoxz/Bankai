// Shared types and helpers for the Anivexa episode data used across watch components

export interface ProviderEpisode {
  id: string;            // "watch/reanime/21/sub/reanime-1"
  number: number;
  title?: string | null;
  thumbnail?: string | null;
  image?: string | null;
  airDate?: string | null;
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
  allmanga:   "AllManga",
  reanime:    "Reanime",
  anikoto:    "AniKoto",
  animegg:    "AnimeGG",
  anineko:    "AniNeko",
  anidbapp:   "AniDB App",
  "2dhive":   "2DHive",
  animenosub: "AnimeNoSub",
  anizone:    "AniZone",
  anibd:      "Anibd",
  senshi:     "Senshi",
  kaa:        "KickAss",
  animedunya: "AnimeDunya",
};

export function providerLabel(name: string): string {
  return PROVIDER_LABELS[name] ?? name;
}

export function parseProviders(raw: Record<string, unknown>): EpisodesMap {
  const result: EpisodesMap = {};
  for (const [key, val] of Object.entries(raw)) {
    if (["mappings", "page", "type", "_unknownProviders"].includes(key)) continue;
    if (typeof val !== "object" || val === null) continue;
    const v = val as Record<string, unknown>;
    // Keep ALL provider entries: those with episodes AND those with errors.
    // Error providers are shown in the server selector so users know they exist.
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

/** Picks the provider with the richest episode metadata for display purposes. */
export function bestMetadataProvider(providers: EpisodesMap, audio: "sub" | "dub"): string | null {
  const PREFERRED = ["anizone", "anibd", "reanime", "anikoto", "animegg"];
  for (const name of PREFERRED) {
    const list = providers[name]?.episodes?.[audio] ?? [];
    if (list.length > 0 && list.some((e) => e.title && e.title !== `Episode ${e.number}`)) {
      return name;
    }
  }
  // fall back to any provider with episodes
  for (const [name, data] of Object.entries(providers)) {
    if (!data.error && (data.episodes?.[audio] ?? []).length > 0) return name;
  }
  return null;
}

/** Merge episode metadata across all providers: prefer providers with real titles/thumbnails. */
export function mergedEpisodeList(providers: EpisodesMap, audio: "sub" | "dub"): ProviderEpisode[] {
  const byNumber = new Map<number, ProviderEpisode>();

  // Process lowest-priority providers first, then overwrite with better ones
  const PRIORITY = ["kaa", "allmanga", "anineko", "animegg", "anikoto", "animedunya",
                    "animenosub", "senshi", "2dhive", "anidbapp", "reanime", "anibd", "anizone"];

  for (const provName of PRIORITY) {
    const list = providers[provName]?.episodes?.[audio] ?? [];
    for (const ep of list) {
      const existing = byNumber.get(ep.number);
      if (!existing) {
        byNumber.set(ep.number, { ...ep });
      } else {
        // Overwrite with better data
        if (ep.title && ep.title !== `Episode ${ep.number}`) existing.title = ep.title;
        if (ep.thumbnail) existing.thumbnail = ep.thumbnail;
        if (ep.image) existing.image = ep.image;
        if (ep.airDate) existing.airDate = ep.airDate;
      }
    }
  }

  return Array.from(byNumber.values()).sort((a, b) => a.number - b.number);
}
