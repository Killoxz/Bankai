// Custom Next.js cache handler that writes to /tmp instead of /app/.next/cache
// Required on read-only filesystems (Render, some Docker setups, etc.)
const fs   = require("fs");
const path = require("path");

const DIR = "/tmp/nxt-cache";

function keyToFile(key) {
  return path.join(DIR, Buffer.from(key).toString("hex").slice(0, 200));
}

function ensureDir() {
  try { fs.mkdirSync(DIR, { recursive: true }); } catch {}
}

class CacheHandler {
  async get(key) {
    try {
      const raw  = fs.readFileSync(keyToFile(key), "utf8");
      const entry = JSON.parse(raw);
      if (entry.exp && Date.now() > entry.exp) return null;
      return { value: entry.value, lastModified: entry.lastModified ?? Date.now(), tags: entry.tags ?? [] };
    } catch {
      return null;
    }
  }

  async set(key, value, ctx) {
    try {
      ensureDir();
      const revalidate = ctx?.revalidate;
      fs.writeFileSync(
        keyToFile(key),
        JSON.stringify({
          value,
          lastModified: Date.now(),
          tags: ctx?.tags ?? [],
          exp: revalidate ? Date.now() + revalidate * 1000 : null,
        })
      );
    } catch {}
  }

  async revalidateTag(tags) {
    // Purge all cached entries that include the given tag(s)
    try {
      ensureDir();
      const tagSet = new Set(Array.isArray(tags) ? tags : [tags]);
      for (const file of fs.readdirSync(DIR)) {
        try {
          const entry = JSON.parse(fs.readFileSync(path.join(DIR, file), "utf8"));
          if ((entry.tags ?? []).some((t) => tagSet.has(t))) {
            fs.unlinkSync(path.join(DIR, file));
          }
        } catch {}
      }
    } catch {}
  }
}

module.exports = CacheHandler;
