import { NextResponse } from "next/server";
import { STREAMING_BASE } from "@/lib/streaming";

// Called client-side the moment the watch page mounts.
// Fires a fire-and-forget request to wake up the streaming API so it's
// already warming by the time the episode data fetch actually needs it.
export async function GET() {
  fetch(`${STREAMING_BASE}/`, { cache: "no-store" }).catch(() => {});
  return NextResponse.json({ ok: true });
}
