import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Attack on Titan" -> "attack-on-titan" */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** 88 -> "8.8" (AniList scores are 0-100). */
export function formatScore(score?: number | null): string {
  if (score == null) return "N/A";
  return (score / 10).toFixed(1);
}

export function formatNumber(n?: number | null): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return String(n);
}

const TITLE_CASE = (s: string) =>
  s
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

export function formatFormat(format?: string | null): string {
  if (!format) return "";
  const map: Record<string, string> = {
    TV: "TV",
    MOVIE: "Movie",
    OVA: "OVA",
    ONA: "ONA",
    SPECIAL: "Special",
    MUSIC: "Music",
    TV_SHORT: "TV Short",
  };
  return map[format] ?? TITLE_CASE(format);
}

export function formatStatus(status?: string | null): string {
  if (!status) return "";
  const map: Record<string, string> = {
    RELEASING: "Airing",
    FINISHED: "Finished",
    NOT_YET_RELEASED: "Upcoming",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
  };
  return map[status] ?? TITLE_CASE(status);
}

/** seconds -> "2d 4h 30m" */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "Aired";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (!d) parts.push(`${m}m`);
  return parts.join(" ");
}

/** seconds -> "1:23:45" or "23:45" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.floor(totalSeconds % 60);
  const m = Math.floor((totalSeconds / 60) % 60);
  const h = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

export function truncate(text: string, max = 180): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + "…";
}

/** Strip HTML tags and source attributions from AniList descriptions. */
export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\(Source:[^)]*\)/gi, "")
    .replace(/\[Written by[^\]]*\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function preferredTitle(
  title: { romaji: string; english?: string | null; native?: string | null },
  lang?: "romaji" | "english" | "native"
): string {
  if (lang === "native") return title.native || title.romaji || title.english || "Untitled";
  if (lang === "romaji") return title.romaji || title.english || title.native || "Untitled";
  return title.english || title.romaji || title.native || "Untitled";
}
