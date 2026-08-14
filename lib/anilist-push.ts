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

  const res = await gql(token, `
    mutation ($mediaId: Int, $status: MediaListStatus) {
      SaveMediaListEntry(mediaId: $mediaId, status: $status) { id status }
    }
  `, { mediaId: anilistMediaId, status: anilistStatus });

  if (res.errors?.length) {
    throw new Error(`AniList mutation error: ${res.errors.map((e) => e.message).join(", ")}`);
  }
}

/**
 * Update the watched episode count (progress) on AniList.
 * Only fires when the anime is actively set to CURRENT (Watching) by the user.
 * Never lowers progress (safe to call even when rewatching an earlier episode).
 */
export async function pushProgressToAniList(
  token:          string,
  anilistMediaId: number,
  progress:       number,
): Promise<void> {
  // Check the user's current list entry before mutating anything
  let entry: { status?: string; progress?: number } | null = null;
  try {
    const check = await gql(token, `
      query ($mediaId: Int) {
        MediaList(mediaId: $mediaId, type: ANIME) { status progress }
      }
    `, { mediaId: anilistMediaId });
    entry = (check.data?.MediaList as typeof entry) ?? null;
  } catch {
    return; // if the check fails, don't risk accidental list changes
  }

  // Only update when the user has the anime set to Watching
  if (!entry || entry.status !== "CURRENT") return;

  // Never lower the episode count (e.g. rewatching an earlier episode)
  if (typeof entry.progress === "number" && progress <= entry.progress) return;

  const res = await gql(token, `
    mutation ($mediaId: Int, $progress: Int) {
      SaveMediaListEntry(mediaId: $mediaId, progress: $progress) { id progress }
    }
  `, { mediaId: anilistMediaId, progress });

  if (res.errors?.length) {
    throw new Error(`AniList progress error: ${res.errors.map((e) => e.message).join(", ")}`);
  }
}
