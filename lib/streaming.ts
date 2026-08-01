// Shared streaming API base URL and server-side fetch helpers.
// Used by both Next.js API routes and the watch page server component.

export const STREAMING_BASE = (process.env.STREAMING_API_URL?.trim() ?? "https://bankai-s-api.onrender.com")
  .replace(/\/$/, "")
  .replace(/^(?!https?:\/\/)/, "https://");

export async function fetchEpisodesRaw(anilistId: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${STREAMING_BASE}/episodes/${anilistId}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}
