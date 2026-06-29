import { PageContainer } from "@/components/layout/page-container";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div>
      <Skeleton className="h-[34vh] min-h-[240px] w-full rounded-none" />
      <PageContainer className="-mt-28 space-y-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
          <Skeleton className="aspect-[2/3] w-36 rounded-xl sm:w-48" />
          <div className="flex-1 space-y-3 pb-2">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-9 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/3 rounded" />
            <Skeleton className="h-11 w-72 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    </div>
  );
}
