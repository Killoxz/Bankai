import { fetchAnikotoEpisodesAsMap } from "./anikoto";

// When STREAMING_API_URL is set (Anivexa-API deployed), use it.
// Otherwise fall back to the direct Anikoto integration.
const ANIVEXA_BASE = process.env.STREAMING_API_URL?.trim().replace(/\/$/, "");

export const STREAMING_BASE = ANIVEXA_BASE ?? "https://anikotoapi.site";

export async function fetchEpisodesRaw(anilistId: number): Promise<Record<string, unknown> | null> {
  if (ANIVEXA_BASE) {
    try {
      const res = await fetch(`${ANIVEXA_BASE}/episodes/${anilistId}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8_000),
        next: { revalidate: 3600 },
      });
      if (res.ok) return (await res.json()) as Record<string, unknown>;
    } catch {}
  }

  try {
    return await fetchAnikotoEpisodesAsMap(anilistId);
  } catch {
    return null;
  }
}
