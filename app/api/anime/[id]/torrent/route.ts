import { NextRequest, NextResponse } from "next/server";

export interface TorrentResult {
  title: string;
  infoHash: string;
  magnetUri: string;
  size: string;
  seeders: number;
}

// WebRTC-capable trackers that WebTorrent can use in the browser
const WT_TRACKERS = [
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.webtorrent.dev",
  "wss://tracker.fastcast.nz",
  // Standard trackers included for metadata seeding
  "http://nyaa.tracker.wf:7777/announce",
  "https://tracker.gbitt.info/announce",
];

// GET /api/anime/:id/torrent?ep=1&title=Frieren
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _id } = await params;
  const ep = parseInt(req.nextUrl.searchParams.get("ep") ?? "1", 10);
  const title = req.nextUrl.searchParams.get("title") ?? "";

  if (!title || ep < 1) {
    return NextResponse.json({ error: "title and ep are required" }, { status: 400 });
  }

  // Remove season suffixes & punctuation so romaji/english titles match Nyaa search
  const clean = title
    .replace(/[:–—]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const epStr = ep.toString().padStart(2, "0");

  // Try progressively looser queries until we get a hit
  const queries = [
    `${clean} - ${epStr} subsplease 1080p`,
    `${clean} ${epStr} subsplease 1080p`,
    `${clean} - ${epStr} subsplease`,
    `${clean} ${epStr} subsplease`,
  ];

  for (const q of queries) {
    try {
      const result = await searchNyaa(q);
      if (result) {
        return NextResponse.json(result, {
          headers: {
            "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
          },
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: "No torrent found for this episode" }, { status: 404 });
}

async function searchNyaa(query: string): Promise<TorrentResult | null> {
  const url = `https://nyaa.si/?page=rss&q=${encodeURIComponent(query)}&c=1_2&f=2`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; Bankai/1.9)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;

  const xml = await res.text();
  const items = parseItems(xml);
  if (!items.length) return null;

  // Prefer items with most seeders (more peers = faster streaming)
  items.sort((a, b) => b.seeders - a.seeders);
  return items[0];
}

function parseItems(xml: string): TorrentResult[] {
  const results: TorrentResult[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];

  for (const block of blocks) {
    const title = cdataOf(block, "title") ?? textOf(block, "title") ?? "";
    const infoHash = textOf(block, "nyaa:infoHash") ?? "";
    const size = textOf(block, "nyaa:size") ?? "";
    const seeders = parseInt(textOf(block, "nyaa:seeders") ?? "0", 10);

    if (!infoHash || !title.includes("SubsPlease")) continue;

    const trList = WT_TRACKERS.map((t) => `&tr=${encodeURIComponent(t)}`).join("");
    const magnetUri = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(title)}${trList}`;
    results.push({ title, infoHash, magnetUri, size, seeders });
  }

  return results;
}

function cdataOf(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`));
  return m ? m[1].trim() : null;
}

function textOf(xml: string, tag: string): string | null {
  // Escape the colon in namespace-prefixed tags for use in RegExp
  const safe = tag.replace(/:/g, "\\:");
  const m = xml.match(new RegExp(`<${safe}>([^<]*)<\\/${safe}>`));
  return m ? m[1].trim() : null;
}
