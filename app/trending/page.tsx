import { Flame } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { BrowseView } from "@/features/browse/browse-view";

export const metadata: Metadata = { title: "Trending" };

export default function TrendingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Trending"
        description="What everyone's watching right now."
        icon={<Flame className="size-7 text-primary" />}
      />
      <BrowseView initialQuery={{ sort: "TRENDING_DESC" }} />
    </PageContainer>
  );
}
