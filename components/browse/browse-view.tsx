"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, X, Check, RotateCcw, Search } from "lucide-react";
import { browseAnime, ANIME_GENRES, type AnimeMedia, type BrowseFilters } from "@/lib/anilist";
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

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: { label: string; value: string }[] = [
  { label: "Any Year", value: "" },
  ...Array.from({ length: CURRENT_YEAR - 1959 }, (_, i) => {
    const y = String(CURRENT_YEAR + 1 - i);
    return { label: y, value: y };
  }),
];

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-white/40">{label}</p>
      {children}
    </div>
  );
}

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  onClear,
}: {
  label: string;
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
  onClear?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value)?.label ?? label;

  return (
    <div
      className="relative flex items-center gap-1 rounded-full border border-white/15 bg-white/5 pl-4 pr-2 py-2 transition-colors hover:border-white/30"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-white/80">
        {current}
        <ChevronDown className="size-3.5 text-white/50" />
      </button>
      {onClear && value && (
        <button onClick={onClear} aria-label={`Clear ${label}`} className="text-white/40 transition-colors hover:text-white">
          <X className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-11 z-20 max-h-72 min-w-40 overflow-y-auto rounded-lg border border-white/10 bg-[#1c1c1c] py-1 shadow-2xl">
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

function MultiSelect({
  label,
  placeholder,
  values,
  options,
  onChange,
}: {
  label: string;
  placeholder: string;
  values: string[];
  options: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = values.length === 0 ? placeholder : values.length === 1 ? values[0] : `${values.length} ${label}`;
  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  function toggle(o: string) {
    onChange(values.includes(o) ? values.filter((v) => v !== o) : [...values, o]);
  }

  return (
    <div
      className="relative flex items-center gap-1 rounded-full border border-white/15 bg-white/5 pl-4 pr-2 py-2 transition-colors hover:border-white/30"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setOpen(false);
          setQuery("");
        }
      }}
    >
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1.5 text-sm text-white/80">
        {current}
        <ChevronDown className="size-3.5 text-white/50" />
      </button>
      {values.length > 0 && (
        <button onClick={() => onChange([])} aria-label={`Clear ${label}`} className="text-white/40 transition-colors hover:text-white">
          <X className="size-3.5" />
        </button>
      )}
      {open && (
        <div className="absolute left-0 top-11 z-20 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#1c1c1c] shadow-2xl">
          {options.length > 12 && (
            <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
              <Search className="size-3.5 shrink-0 text-white/40" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Filter ${label.toLowerCase()}...`}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
              />
            </div>
          )}
          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3.5 py-2 text-sm text-white/40">No matches.</p>
            ) : (
              filtered.map((o) => {
                const checked = values.includes(o);
                return (
                  <button
                    key={o}
                    onClick={() => toggle(o)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5"
                  >
                    <span
                      className={[
                        "grid size-4 shrink-0 place-items-center rounded border",
                        checked ? "border-primary bg-primary" : "border-white/30",
                      ].join(" ")}
                    >
                      {checked && <Check className="size-3 text-black" />}
                    </span>
                    {o}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BrowseView({
  initial,
  basePath = "/browse",
  availableTags = [],
}: {
  initial: BrowseFilters;
  basePath?: string;
  availableTags?: string[];
}) {
  const router = useRouter();
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
      if (next.genre && next.genre.length > 0) sp.set("genre", next.genre.join(","));
      if (next.tag && next.tag.length > 0) sp.set("tag", next.tag.join(","));
      if (next.year) sp.set("year", String(next.year));
      if (next.sort) sp.set("sort", next.sort);
      if (next.search) sp.set("q", next.search);
      router.replace(`${basePath}?${sp.toString()}`, { scroll: false });
    },
    [filters, router, basePath]
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
  }, [filters.format, filters.status, filters.genre, filters.tag, filters.year, filters.sort, filters.search]);

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

  const hasActiveFilters = !!(
    filters.format ||
    filters.status ||
    (filters.genre && filters.genre.length > 0) ||
    (filters.tag && filters.tag.length > 0) ||
    filters.year
  );
  const activeStatusLabel = STATUSES.find((s) => s.value === filters.status)?.label;

  function resetFilters() {
    patch({ format: undefined, status: undefined, genre: undefined, tag: undefined, year: undefined });
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <FilterField label="Genres">
          <MultiSelect
            label="Genres"
            placeholder="Select Genres"
            values={filters.genre ?? []}
            options={ANIME_GENRES}
            onChange={(v) => patch({ genre: v.length ? v : undefined })}
          />
        </FilterField>
        <FilterField label="Tags">
          <MultiSelect
            label="Tags"
            placeholder="Select Tags"
            values={filters.tag ?? []}
            options={availableTags}
            onChange={(v) => patch({ tag: v.length ? v : undefined })}
          />
        </FilterField>
        <FilterField label="Year">
          <Dropdown
            label="Any Year"
            value={filters.year ? String(filters.year) : ""}
            options={YEARS}
            onChange={(v) => patch({ year: v ? Number(v) : undefined })}
            onClear={filters.year ? () => patch({ year: undefined }) : undefined}
          />
        </FilterField>
        <FilterField label="Status">
          <Dropdown
            label="Any Status"
            value={filters.status ?? ""}
            options={STATUSES}
            onChange={(v) => patch({ status: v || undefined })}
            onClear={filters.status ? () => patch({ status: undefined }) : undefined}
          />
        </FilterField>
        <FilterField label="Format">
          <Dropdown
            label="All Formats"
            value={filters.format ?? ""}
            options={FORMATS}
            onChange={(v) => patch({ format: v || undefined })}
            onClear={filters.format ? () => patch({ format: undefined }) : undefined}
          />
        </FilterField>
        <FilterField label="Sort">
          <Dropdown label="Sort" value={filters.sort ?? "TRENDING_DESC"} options={SORTS} onChange={(v) => patch({ sort: v })} />
        </FilterField>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/15"
          >
            <RotateCcw className="size-3.5" />
            Reset
          </button>
        )}
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
              {items.map((anime, i) => (
                <AnimeCard key={anime.id} anime={anime} statusLabel={activeStatusLabel} index={i} />
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
