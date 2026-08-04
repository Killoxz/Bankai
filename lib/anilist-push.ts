const GQL = "https://graphql.anilist.co";

const STATUS_MAP: Record<string, string> = {
  WATCHING:      "CURRENT",
  COMPLETED:     "COMPLETED",
  PLAN_TO_WATCH: "PLANNING",
  DROPPED:       "DROPPED",
  ON_HOLD:       "PAUSED",
};

async function gql(token: string, query: string, variables: Record<string, unknown>) {
  const res = await fetch(GQL, {
    method:  "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body:    JSON.stringify({ query, variables }),
    signal:  AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
  return res.json() as Promise<{ data: Record<string, unknown>; errors?: { message: string }[] }>;
}

/**
 * Push a Bankai list-status change to the user's AniList account.
 * status=null means "remove from list".
 * Fire-and-forget safe — caller should .catch(console.error).
 */
export async function pushStatusToAniList(
  token:          string,
  anilistUserId:  number,
  anilistMediaId: number,
  status:         string | null,
  score?:         number | null,
): Promise<void> {
  if (status === null) {
    // Find the AniList list-entry ID so we can delete it
    const found = await gql(token, `
      query ($mediaId: Int, $userId: Int) {
        MediaList(mediaId: $mediaId, userId: $userId) { id }
      }
    `, { mediaId: anilistMediaId, userId: anilistUserId });

    const entryId = (found.data?.MediaList as { id?: number } | null)?.id;
    if (!entryId) return; // not in their AniList list — nothing to delete

    await gql(token, `
      mutation ($id: Int) { DeleteMediaListEntry(id: $id) { deleted } }
    `, { id: entryId });
    return;
  }

  const anilistStatus = STATUS_MAP[status];
  if (!anilistStatus) return;

  const vars: Record<string, unknown> = { mediaId: anilistMediaId, status: anilistStatus };
  if (typeof score === "number") vars.scoreRaw = Math.round(score * 10); // 0–10 → 0–100

  await gql(token, `
    mutation ($mediaId: Int, $status: MediaListStatus, $scoreRaw: Int) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status, scoreRaw: $scoreRaw) { id status }
    }
  `, vars);
}
