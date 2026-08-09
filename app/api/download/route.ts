import { NextRequest } from "next/server";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// Decode a proxied /api/hls?url=...&ref=... URL and fetch the real resource directly.
async function fetchSegment(proxiedUrl: string): Promise<Response> {
  try {
    const u = new URL(proxiedUrl);
    if (u.pathname.endsWith("/api/hls")) {
      const targetUrl = u.searchParams.get("url");
      const ref = u.searchParams.get("ref") ?? "";
      if (targetUrl) {
        const parsed = new URL(targetUrl);
        return fetch(targetUrl, {
          headers: {
            "User-Agent": UA,
            Accept: "*/*",
            Referer: ref || `${parsed.origin}/`,
            Origin: ref || parsed.origin,
          },
          signal: AbortSignal.timeout(30_000),
        });
      }
    }
  } catch {}
  return fetch(proxiedUrl, { headers: { "User-Agent": UA, Accept: "*/*" }, signal: AbortSignal.timeout(30_000) });
}

interface ParsedPlaylist {
  initUrl: string | null;
  segmentUrls: string[];
  isMaster: boolean;
  bestQualityUrl: string | null;
}

function parsePlaylist(text: string, baseUrl: string): ParsedPlaylist {
  const lines = text.split("\n").map((l) => l.trim());
  const isMaster = lines.some((l) => l.startsWith("#EXT-X-STREAM-INF"));
  const segmentUrls: string[] = [];
  let initUrl: string | null = null;
  let bestQualityUrl: string | null = null;
  let bestBandwidth = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    if (isMaster && line.startsWith("#EXT-X-STREAM-INF")) {
      const bwMatch = line.match(/BANDWIDTH=(\d+)/);
      const bw = bwMatch ? parseInt(bwMatch[1], 10) : 0;
      const nextLine = lines[i + 1];
      if (nextLine && !nextLine.startsWith("#")) {
        if (bw > bestBandwidth) {
          bestBandwidth = bw;
          bestQualityUrl = nextLine.startsWith("http")
            ? nextLine
            : new URL(nextLine, baseUrl).href;
        }
      }
      continue;
    }

    if (!isMaster) {
      if (line.startsWith("#EXT-X-MAP")) {
        const m = line.match(/URI="([^"]+)"/);
        if (m) {
          initUrl = m[1].startsWith("http") ? m[1] : new URL(m[1], baseUrl).href;
        }
      } else if (!line.startsWith("#")) {
        segmentUrls.push(
          line.startsWith("http") ? line : new URL(line, baseUrl).href
        );
      }
    }
  }

  return { initUrl, segmentUrls, isMaster, bestQualityUrl };
}

async function resolveMediaPlaylist(
  url: string
): Promise<{ initUrl: string | null; segmentUrls: string[] }> {
  const res = await fetchSegment(url);
  if (!res.ok) throw new Error(`Failed to fetch playlist: ${res.status}`);
  const text = await res.text();
  const parsed = parsePlaylist(text, url);

  if (parsed.isMaster && parsed.bestQualityUrl) {
    // Follow the highest-quality stream
    const res2 = await fetchSegment(parsed.bestQualityUrl);
    if (!res2.ok) throw new Error("Failed to fetch media playlist");
    const text2 = await res2.text();
    const parsed2 = parsePlaylist(text2, parsed.bestQualityUrl);
    return { initUrl: parsed2.initUrl, segmentUrls: parsed2.segmentUrls };
  }

  return { initUrl: parsed.initUrl, segmentUrls: parsed.segmentUrls };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const streamUrl = searchParams.get("url");
  const filename = searchParams.get("filename") ?? "episode.mp4";

  if (!streamUrl) {
    return Response.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const { initUrl, segmentUrls } = await resolveMediaPlaylist(streamUrl);

    if (segmentUrls.length === 0) {
      return Response.json({ error: "No segments found in playlist" }, { status: 400 });
    }

    const readable = new ReadableStream({
      async start(controller) {
        try {
          // Init segment (fMP4 moov box) must come first when present
          if (initUrl) {
            const res = await fetchSegment(initUrl);
            if (res.ok && res.body) {
              const buf = await res.arrayBuffer();
              controller.enqueue(new Uint8Array(buf));
            }
          }

          for (const segUrl of segmentUrls) {
            const res = await fetchSegment(segUrl);
            if (!res.ok || !res.body) continue;
            const buf = await res.arrayBuffer();
            controller.enqueue(new Uint8Array(buf));
          }

          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    const safeFilename = filename.replace(/[^\w.\-]/g, "_");

    return new Response(readable, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[download]", err);
    return Response.json(
      { error: err instanceof Error ? err.message : "Download failed" },
      { status: 502 }
    );
  }
}
