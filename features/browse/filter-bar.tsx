"use client";

import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useGenres } from "@/features/anime/use-anime";
import type { AnimeQuery } from "@/types/anime";

const FORMATS = ["", "TV", "MOVIE", "OVA", "ONA", "SPECIAL"];
const STATUSES = ["", "RELEASING", "FINISHED", "NOT_YET_RELEASED"];
const SORTS: { label: string; value: string }[] = [
  { label: "Popularity", value: "POPULARITY_DESC" },
  { label: "Trending", value: "TRENDING_DESC" },
  { label: "Score", value: "SCORE_DESC" },
  { label: "Newest", value: "START_DATE_DESC" },
  { label: "Title A-Z", value: "TITLE_ROMAJI" },
];
const YEARS = ["", ...Array.from({ length: 12 }, (_, i) => String(2025 - i))];

export function FilterBar({
  query,
  onChange,
}: {
  query: AnimeQuery;
  onChange: (patch: Partial<AnimeQuery>) => void;
}) {
  const { data: genres = [] } = useGenres();
  const activeGenres = query.genres ?? [];

  const toggleGenre = (g: string) => {
    const next = activeGenres.includes(g)
      ? activeGenres.filter((x) => x !== g)
      : [...activeGenres, g];
    onChange({ genres: next.length ? next : undefined });
  };

  const hasFilters =
    activeGenres.length || query.format || query.status || query.seasonYear || query.search;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Sort"
          value={query.sort ?? "POPULARITY_DESC"}
          onChange={(e) => onChange({ sort: e.target.value as AnimeQuery["sort"] })}
          options={SORTS}
        />
        <Select
          aria-label="Format"
          value={query.format ?? ""}
          onChange={(e) => onChange({ format: (e.target.value || undefined) as AnimeQuery["format"] })}
          options={FORMATS.map((f) => ({ label: f || "Any format", value: f }))}
        />
        <Select
          aria-label="Status"
          value={query.status ?? ""}
          onChange={(e) => onChange({ status: (e.target.value || undefined) as AnimeQuery["status"] })}
          options={STATUSES.map((s) => ({
            label: s ? s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) : "Any status",
            value: s,
          }))}
        />
        <Select
          aria-label="Year"
          value={query.seasonYear ? String(query.seasonYear) : ""}
          onChange={(e) => onChange({ seasonYear: e.target.value ? Number(e.target.value) : undefined })}
          options={YEARS.map((y) => ({ label: y || "Any year", value: y }))}
        />
        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange({
                genres: undefined,
                format: undefined,
                status: undefined,
                seasonYear: undefined,
                search: undefined,
              })
            }
          >
            <X className="size-4" /> Clear
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {genres.map((g) => {
          const active = activeGenres.includes(g);
          return (
            <button key={g} onClick={() => toggleGenre(g)}>
              <Badge
                variant={active ? "default" : "secondary"}
                className="cursor-pointer hover:bg-accent"
              >
                {g}
              </Badge>
            </button>
          );
        })}
      </div>
    </div>
  );
}
