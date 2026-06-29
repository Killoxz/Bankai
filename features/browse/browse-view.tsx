"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, SearchX } from "lucide-react";
import { FilterBar } from "./filter-bar";
import { AnimeGrid, AnimeGridSkeleton } from "@/components/anime/anime-grid";
import { Button } from "@/components/ui/button";
import { useBrowse } from "@/features/anime/use-anime";
import { useIntersection } from "@/hooks/use-intersection";
import { animeQueryToParams } from "@/lib/query-params";
import type { AnimeQuery } from "@/types/anime";

export function BrowseView({
  initialQuery,
  showFilters = true,
}: {
  initialQuery: AnimeQuery;
  showFilters?: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState<AnimeQuery>(initialQuery);

  const patch = useCallback(
    (p: Partial<AnimeQuery>) => {
      setQuery((q) => {
        const next = { ...q, ...p, page: 1 };
        // Reflect filters in the URL without a full navigation.
        const sp = animeQueryToParams(next);
        sp.delete("page");
        router.replace(`?${sp.toString()}`, { scroll: false });
        return next;
      });
    },
    [router]
  );

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useBrowse(query);

  const items = useMemo(() => data?.pages.flatMap((p) => p.items) ?? [], [data]);

  const sentinel = useIntersection(
    () => {
      if (hasNextPage && !isFetchingNextPage) fetchNextPage();
    },
    !!hasNextPage
  );

  return (
    <div className="space-y-5">
      {showFilters && <FilterBar query={query} onChange={patch} />}

      {isLoading ? (
        <AnimeGridSkeleton />
      ) : isError ? (
        <div className="grid place-items-center gap-3 py-20 text-center text-muted-foreground">
          <SearchX className="size-10" />
          <p>Something went wrong loading results.</p>
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-3 py-20 text-center text-muted-foreground">
          <SearchX className="size-10" />
          <p>No anime match these filters.</p>
        </div>
      ) : (
        <>
          <AnimeGrid items={items} />
          <div ref={sentinel} className="h-10" />
          <div className="flex justify-center pb-4">
            {isFetchingNextPage ? (
              <Loader2 className="size-6 animate-spin text-primary" />
            ) : hasNextPage ? (
              <Button variant="glass" onClick={() => fetchNextPage()}>
                Load more
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">You&apos;ve reached the end.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
