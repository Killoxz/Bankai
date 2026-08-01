// Shared streaming API base URL and server-side fetch helpers.
// Used by both Next.js API routes and the watch page server component.

export const STREAMING_BASE = (process.env.STREAMING_API_URL?.trim() ?? "https://miruro-api-production-55b5.up.railway.app")
  .replace(/\/$/, "")
  .replace(/^(?!https?:\/\/)/, "https://");

export async function fetchEpisodesRaw(anilistId: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${STREAMING_BASE}/episodes/${anilistId}`, {
      // 4-second SSR timeout — if the streaming API is cold/sleeping, don't
      // block the entire page. The client-side fallback fetch will pick it up.
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
