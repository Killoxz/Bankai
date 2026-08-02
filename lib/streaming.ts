import { fetchAnikotoEpisodesAsMap } from "./anikoto";

export const STREAMING_BASE = "https://anikotoapi.site";

export async function fetchEpisodesRaw(anilistId: number): Promise<Record<string, unknown> | null> {
  try {
    return await fetchAnikotoEpisodesAsMap(anilistId);
  } catch {
    return null;
  }
}
