import { prisma } from "./prisma";

export async function readCache<T>(key: string): Promise<T | null> {
  try {
    const row = await prisma.apiCache.findUnique({ where: { key } });
    return row ? (JSON.parse(row.value) as T) : null;
  } catch {
    return null;
  }
}

export async function writeCache(key: string, value: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await prisma.apiCache.upsert({
      where: { key },
      update: { value: serialized },
      create: { key, value: serialized },
    });
  } catch {
    // Non-fatal — a cache write failure should never break the page
  }
}
