import { History as HistoryIcon } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { HistoryView } from "@/features/history/history-view";

export const metadata: Metadata = { title: "History" };

export default function HistoryPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Watch History"
        description="Pick up right where you left off."
        icon={<HistoryIcon className="size-7 text-primary" />}
      />
      <HistoryView />
    </PageContainer>
  );
}
