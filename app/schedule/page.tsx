import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { ScheduleView } from "@/features/schedule/schedule-view";

export const metadata: Metadata = { title: "Schedule" };

export default function SchedulePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Schedule"
        description="Episode release calendar with live countdowns in your timezone."
        icon={<CalendarDays className="size-7 text-primary" />}
      />
      <ScheduleView />
    </PageContainer>
  );
}
