"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Search, X, Loader2, Tag, User, Building2, Film, ArrowRight } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { usePlayerStore } from "@/store/player-store";
import { useSearch } from "@/features/anime/use-anime";
import { useDebounce } from "@/hooks/use-debounce";
import { preferredTitle, formatScore } from "@/lib/utils";

export function CommandPalette() {
  const open = useUIStore((s) => s.commandOpen);
  const setOpen = useUIStore((s) => s.setCommandOpen);
  const titleLanguage = usePlayerStore((s) => s.titleLanguage);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const debounced = useDebounce(term, 250);
  const { data, isFetching } = useSearch(debounced);

  // Cmd/Ctrl+K toggles, Escape closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setTerm("");
  }, [open]);

  // Flatten results into a keyboard-navigable list of anime links.
  const animeResults = data?.anime ?? [];
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [debounced]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, animeResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      if (animeResults[active]) go(`/anime/${animeResults[active].slug}`);
      else if (term.trim()) go(`/browse?search=${encodeURIComponent(term)}`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[10vh]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[var(--radius)] border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <Search className="size-5 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search anime, characters, studios…"
                className="h-14 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
              />
              {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
              <button onClick={() => setOpen(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {debounced.length < 2 && (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Type at least 2 characters to search.
                </p>
              )}

              {debounced.length >= 2 && !isFetching && animeResults.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-muted-foreground">
                  No results for &ldquo;{debounced}&rdquo;.
                </p>
              )}

              {animeResults.length > 0 && (
                <Group label="Anime" icon={<Film className="size-3.5" />}>
                  {animeResults.map((a, i) => (
                    <button
                      key={a.id}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(`/anime/${a.slug}`)}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors ${
                        i === active ? "bg-accent" : "hover:bg-accent/60"
                      }`}
                    >
                      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                        {a.coverImage && (
                          <Image src={a.coverImage} alt="" fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{preferredTitle(a.title, titleLanguage)}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {[a.format, a.seasonYear, a.averageScore && `★ ${formatScore(a.averageScore)}`]
                            .filter(Boolean)
                            .join(" • ")}
                        </p>
                      </div>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                    </button>
                  ))}
                </Group>
              )}

              {data?.genres?.length ? (
                <Group label="Genres" icon={<Tag className="size-3.5" />}>
                  <div className="flex flex-wrap gap-2 p-2">
                    {data.genres.map((g) => (
                      <Link
                        key={g}
                        href={`/browse?genre=${encodeURIComponent(g)}`}
                        onClick={() => setOpen(false)}
                        className="rounded-md bg-secondary px-2.5 py-1 text-xs hover:bg-accent"
                      >
                        {g}
                      </Link>
                    ))}
                  </div>
                </Group>
              ) : null}

              {data?.characters?.length ? (
                <Group label="Characters" icon={<User className="size-3.5" />}>
                  {data.characters.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 rounded-lg p-2 text-sm">
                      <div className="relative size-9 shrink-0 overflow-hidden rounded-full bg-muted">
                        {c.image && <Image src={c.image} alt="" fill sizes="36px" className="object-cover" />}
                      </div>
                      {c.name}
                    </div>
                  ))}
                </Group>
              ) : null}

              {data?.studios?.length ? (
                <Group label="Studios" icon={<Building2 className="size-3.5" />}>
                  {data.studios.map((s) => (
                    <div key={s.id} className="rounded-lg px-3 py-2 text-sm">{s.name}</div>
                  ))}
                </Group>
              ) : null}
            </div>

            <div className="flex items-center gap-2 border-t border-border px-4 py-2">
              <Kbd>↑↓</Kbd><Kbd>↵</Kbd><Kbd>esc</Kbd>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Group({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground">
        {icon}
      </div>
      {children}
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 font-sans text-[10px]">
      {children}
    </kbd>
  );
}
