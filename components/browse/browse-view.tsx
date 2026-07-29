"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ChevronDown } from "lucide-react";
import { browseAnime, type AnimeMedia, type BrowseFilters } from "@/lib/anilist";
import { AnimeCard } from "./anime-card";

type FormatValue = Exclude<AnimeMedia["format"], null> | "";
type StatusValue = Exclude<AnimeMedia["status"], null> | "";

const FORMATS: { label: string; value: FormatValue }[] = [
  { label: "All Formats", value: "" },
  { label: "TV", value: "TV" },
  { label: "Movie", value: "MOVIE" },
  { label: "OVA", value: "OVA" },
  { label: "Special", value: "SPECIAL" },
  { label: "ONA", value: "ONA" },
];

const STATUSES: { label: string; value: StatusValue }[] = [
  { label: "Any Status", value: "" },
  { label: "Airing Now", value: "RELEASING" },
  { label: "Finished", value: "FINISHED" },
  { label: "Not Yet Released", value: "NOT_YET_RELEASED" },
];

const SORTS: { label: string; value: NonNullable<BrowseFilters["sort"]> }[] = [
  { label: "Trending", value: "TRENDING_DESC" },
  { label: "Most Popular", value: "POPULARITY_DESC" },
  { label: "Highest Rated", value: "SCORE_DESC" },
  { label: "Newest", value: "START_DATE_DESC" },
];

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/30"
      >
        {current}
        <ChevronDown className="size-3.5 text-white/50" />
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-20 min-w-40 overflow-hidden rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={[
                "block w-full whitespace-nowrap px-3.5 py-2 text-left text-sm transition-colors hover:bg-white/5",
                o.value === value ? "text-primary" : "text-white/80",
              ].join(" ")}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BrowseView({ initial }: { initial: BrowseFilters }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<BrowseFilters>(initial);
  const [items, setItems] = useState<AnimeMedia[]>([]);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  const patch = useCallback(
    (p: Partial<BrowseFilters>) => {
      const next = { ...filters, ...p };
      setFilters(next);
      const sp = new URLSearchParams();
      if (next.format) sp.set("format", next.format);
      if (next.status) sp.set("status", next.status);
      if (next.genre && next.genre !== "All Genres") sp.set("genre", next.genre);
      if (next.sort) sp.set("sort", next.sort);
      if (next.search) sp.set("q", next.search);
      router.replace(`/browse?${sp.toString()}`, { scroll: false });
    },
    [filters, router]
  );

  useEffect(() => {
    const id = ++requestId.current;
    setLoading(true);
    setPage(1);
    browseAnime({ ...filters, page: 1 })
      .then(({ items: results, hasNextPage: hnp }) => {
        if (id !== requestId.current) return;
        setItems(results);
        setHasNextPage(hnp);
      })
      .catch(() => {
        if (id === requestId.current) setItems([]);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.format, filters.status, filters.genre, filters.sort, filters.search]);

  async function loadMore() {
    if (loadingMore || !hasNextPage) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const { items: results, hasNextPage: hnp } = await browseAnime({ ...filters, page: nextPage });
      setItems((prev) => [...prev, ...results]);
      setHasNextPage(hnp);
      setPage(nextPage);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Dropdown label="All Formats" value={filters.format ?? ""} options={FORMATS} onChange={(v) => patch({ format: v || undefined })} />
        <Dropdown label="Any Status" value={filters.status ?? ""} options={STATUSES} onChange={(v) => patch({ status: v || undefined })} />
        <Dropdown label="Sort" value={filters.sort ?? "TRENDING_DESC"} options={SORTS} onChange={(v) => patch({ sort: v })} />
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-24 text-center text-sm text-white/40">No anime match these filters.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {items.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} />
              ))}
            </div>

            <div className="mt-8 flex justify-center">
              {loadingMore ? (
                <Loader2 className="size-6 animate-spin text-primary" />
              ) : hasNextPage ? (
                <button
                  onClick={loadMore}
                  className="rounded-full bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                >
                  Load More
                </button>
              ) : (
                <p className="text-sm text-white/30">You&apos;ve reached the end.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
