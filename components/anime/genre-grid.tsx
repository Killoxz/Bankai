import Link from "next/link";
import { Tags } from "lucide-react";

const GENRE_COLORS: Record<string, string> = {
  Action: "from-red-600/30 to-orange-600/20 hover:from-red-600/40 hover:to-orange-600/30",
  Adventure: "from-amber-600/30 to-yellow-600/20 hover:from-amber-600/40 hover:to-yellow-600/30",
  Comedy: "from-yellow-500/30 to-lime-500/20 hover:from-yellow-500/40 hover:to-lime-500/30",
  Drama: "from-blue-600/30 to-indigo-600/20 hover:from-blue-600/40 hover:to-indigo-600/30",
  Fantasy: "from-violet-600/30 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/30",
  Horror: "from-gray-700/40 to-red-900/30 hover:from-gray-700/50 hover:to-red-900/40",
  Mecha: "from-cyan-600/30 to-sky-600/20 hover:from-cyan-600/40 hover:to-sky-600/30",
  Mystery: "from-purple-700/30 to-violet-700/20 hover:from-purple-700/40 hover:to-violet-700/30",
  Romance: "from-pink-600/30 to-rose-600/20 hover:from-pink-600/40 hover:to-rose-600/30",
  "Sci-Fi": "from-teal-600/30 to-cyan-600/20 hover:from-teal-600/40 hover:to-cyan-600/30",
  "Slice of Life": "from-emerald-600/30 to-green-600/20 hover:from-emerald-600/40 hover:to-green-600/30",
  Sports: "from-orange-600/30 to-amber-600/20 hover:from-orange-600/40 hover:to-amber-600/30",
  Supernatural: "from-indigo-600/30 to-purple-700/20 hover:from-indigo-600/40 hover:to-purple-700/30",
  Thriller: "from-slate-700/35 to-gray-800/25 hover:from-slate-700/50 hover:to-gray-800/40",
  Psychological: "from-fuchsia-700/30 to-purple-800/20 hover:from-fuchsia-700/40 hover:to-purple-800/30",
};

const FALLBACK_GRADIENTS = [
  "from-violet-600/30 to-fuchsia-600/20 hover:from-violet-600/40 hover:to-fuchsia-600/30",
  "from-sky-600/30 to-cyan-600/20 hover:from-sky-600/40 hover:to-cyan-600/30",
  "from-emerald-600/30 to-teal-600/20 hover:from-emerald-600/40 hover:to-teal-600/30",
  "from-amber-600/30 to-orange-600/20 hover:from-amber-600/40 hover:to-orange-600/30",
  "from-rose-600/30 to-pink-600/20 hover:from-rose-600/40 hover:to-pink-600/30",
  "from-indigo-600/30 to-blue-600/20 hover:from-indigo-600/40 hover:to-blue-600/30",
];

export function GenreGrid({ genres }: { genres: string[] }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold sm:text-xl">
        <Tags className="size-5 text-primary" />
        Browse by Genre
      </h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {genres.map((g, i) => {
          const gradient = GENRE_COLORS[g] ?? FALLBACK_GRADIENTS[i % FALLBACK_GRADIENTS.length];
          return (
            <Link
              key={g}
              href={`/browse?genre=${encodeURIComponent(g)}`}
              className={`group relative overflow-hidden rounded-xl border border-white/5 bg-gradient-to-br ${gradient} p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-lg`}
            >
              <span className="text-sm font-semibold text-foreground/90 transition-colors group-hover:text-foreground">
                {g}
              </span>
              {/* Decorative dot */}
              <span className="absolute right-3 top-3 size-1.5 rounded-full bg-white/20 group-hover:bg-primary/60 transition-colors" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
