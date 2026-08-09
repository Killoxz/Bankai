import { prisma } from "./prisma";

const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEnvelope<T> {
  v: T;
  /** Unix timestamp (ms) when this entry was written */
  t: number;
}

export async function readCache<T>(key: string, ttlMs = DEFAULT_TTL_MS): Promise<T | null> {
  try {
    const row = await prisma.apiCache.findUnique({ where: { key } });
    if (!row) return null;
    const envelope = JSON.parse(row.value) as CacheEnvelope<T>;
    // Support both enveloped values (with TTL) and legacy plain values
    if (typeof envelope === "object" && envelope !== null && "v" in envelope && "t" in envelope) {
      if (Date.now() - envelope.t > ttlMs) return null; // expired
      return envelope.v;
    }
    // Legacy: return as-is (no TTL info)
    return envelope as unknown as T;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    const envelope: CacheEnvelope<unknown> = { v: value, t: Date.now() };
    const serialized = JSON.stringify(envelope);
    await prisma.apiCache.upsert({
      where: { key },
      update: { value: serialized },
      create: { key, value: serialized },
    });
  } catch {
    // Non-fatal — a cache write failure should never break the page
  }
}
