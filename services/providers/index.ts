import { config, type DataProvider } from "@/lib/config";
import type { AnimeProvider } from "./types";
import { MockProvider } from "./mock";
import { AniListProvider } from "./anilist";
import { JikanProvider } from "./jikan";

let cached: AnimeProvider | null = null;

function build(name: DataProvider): AnimeProvider {
  switch (name) {
    case "anilist":
      return new AniListProvider();
    case "jikan":
      return new JikanProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}

/**
 * Returns the active provider (singleton). The source is chosen by the
 * DATA_PROVIDER env var so the whole app can switch backends with one line.
 */
export function getProvider(): AnimeProvider {
  if (!cached) cached = build(config.dataProvider);
  return cached;
}

export type { AnimeProvider };
