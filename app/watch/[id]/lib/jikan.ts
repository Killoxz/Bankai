const JIKAN_BASE = "https://api.jikan.moe/v4";

export interface MalScore {
  score: number;
  scoredBy: number | null;
  rank: number | null;
}

/**
 * MyAnimeList score via Jikan (unofficial MAL metadata API — no video/streaming
 * data involved). Resilient by design: Jikan/MAL upstream is occasionally flaky,
 * so any failure just means "don't show a MAL score," never a broken page.
 */
export async function getMalScore(malId: number): Promise<MalScore | null> {
  try {
    const res = await fetch(`${JIKAN_BASE}/anime/${malId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    const score = json?.data?.score;
    if (typeof score !== "number") return null;
    return {
      score,
      scoredBy: json?.data?.scored_by ?? null,
      rank: json?.data?.rank ?? null,
    };
  } catch {
    return null;
  }
}
