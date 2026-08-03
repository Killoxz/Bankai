export const STREAMING_BASE = (
  process.env.STREAMING_API_URL?.trim() ?? "https://anivexa-api.vercel.app"
).replace(/\/$/, "");

export async function fetchEpisodesRaw(anilistId: number): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${STREAMING_BASE}/episodes/${anilistId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json() as Promise<Record<string, unknown>>;
  } catch {
    return null;
  }
}
