import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ExternalLink } from "@/lib/anilist";

export function StreamingLinks({ links }: { links: ExternalLink[] }) {
  const streaming = links.filter((l) => l.type === "STREAMING");

  if (streaming.length === 0) {
    return (
      <div className="rounded-xl bg-white/5 p-8 text-center">
        <p className="text-sm text-white/60">
          Not currently listed on any streaming platform we know of.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-bold text-white">Watch Officially</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {streaming.map((link) => (
          <a
            key={link.url}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/25 hover:bg-white/10"
            style={{ borderLeftColor: link.color ?? undefined, borderLeftWidth: link.color ? 3 : undefined }}
          >
            {link.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={link.icon} alt="" className="size-8 shrink-0 rounded-md object-contain" />
            ) : (
              <div className="grid size-8 shrink-0 place-items-center rounded-md bg-white/10">
                <ExternalLinkIcon className="size-4 text-white/60" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{link.site}</p>
              {link.language && (
                <p className="truncate text-xs text-white/40">{link.language}</p>
              )}
            </div>
            <ExternalLinkIcon className="size-3.5 shrink-0 text-white/30 transition-colors group-hover:text-white/60" />
          </a>
        ))}
      </div>
    </div>
  );
}
