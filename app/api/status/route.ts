import { NextResponse } from "next/server";
import { STREAMING_BASE } from "@/lib/streaming";
import { prisma } from "@/lib/prisma";

interface ServiceResult {
  service: string;
  status: "operational" | "degraded" | "down";
  latency: number | null;
}

async function check(
  name: string,
  fn: () => Promise<void>,
  degradedMs = 2000,
): Promise<ServiceResult> {
  const start = Date.now();
  try {
    await fn();
    const latency = Date.now() - start;
    return {
      service: name,
      status: latency > degradedMs ? "degraded" : "operational",
      latency,
    };
  } catch {
    return { service: name, status: "down", latency: null };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

export async function GET() {
  const results = await Promise.all([
    // Website — always up if this handler executes
    Promise.resolve<ServiceResult>({ service: "Website", status: "operational", latency: 0 }),

    // AniList
    check("AniList", () =>
      withTimeout(
        fetch("https://graphql.anilist.co", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: "{ Page(page:1,perPage:1){ media{ id } } }" }),
          cache: "no-store",
        }).then((r) => { if (!r.ok) throw new Error("not ok"); }),
        5000,
      ),
    ),

    // MyAnimeList (via Jikan)
    check("MyAnimeList", () =>
      withTimeout(
        fetch("https://api.jikan.moe/v4/anime?limit=1", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("not ok");
        }),
        5000,
      ),
    ),

    // Streaming server
    check("Streaming Server", () =>
      withTimeout(
        fetch(`${STREAMING_BASE}/`, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("not ok");
        }),
        6000,
      ),
    ),

    // Player — proxy endpoint (depends on streaming)
    check("Player", () =>
      withTimeout(
        fetch(`${STREAMING_BASE}/`, { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("not ok");
        }),
        6000,
      ),
    ),

    // Community comments — lightweight DB ping
    check("Community Comments", () =>
      withTimeout(
        prisma.comment.count().then(() => {}),
        5000,
      ),
    ),
  ]);

  // Merge Player latency independently so it shows a distinct row but shares
  // the streaming check result (they share the same backend).
  return NextResponse.json(results, {
    headers: { "Cache-Control": "no-store" },
  });
}
