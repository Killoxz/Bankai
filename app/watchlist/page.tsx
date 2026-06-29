import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { WatchlistView } from "@/features/watchlist/watchlist-view";

export const metadata: Metadata = { title: "Watchlist" };

export default function WatchlistPage() {
  return (
    <PageContainer>
      <PageHeader
        title="My Watchlist"
        description="Track what you're watching, planning, and have finished."
        icon={<Bookmark className="size-7 text-primary" />}
      />
      <WatchlistView />
    </PageContainer>
  );
}
