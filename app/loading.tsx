import { PageContainer } from "@/components/layout/page-container";
import { AnimeGridSkeleton } from "@/components/anime/anime-grid";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <PageContainer className="space-y-8">
      <Skeleton className="h-[58vh] min-h-[420px] w-full rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-6 w-48 rounded" />
        <AnimeGridSkeleton count={7} />
      </div>
    </PageContainer>
  );
}
