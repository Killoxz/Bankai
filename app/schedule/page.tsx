import type { Metadata } from "next";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ScheduleView } from "@/components/schedule/schedule-view";
import { getWeeklySchedule } from "@/lib/anilist";

export const metadata: Metadata = {
  title: "Airing Schedule — Bankai",
  description: "Track new episodes, release times, and upcoming anime — updated daily.",
};

export const revalidate = 1800;

export default async function SchedulePage() {
  const entries = await getWeeklySchedule().catch(() => []);

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <div className="mx-auto max-w-[900px] px-6 pb-16 pt-6 sm:px-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">Airing Schedule</h1>
          <p className="mt-2 text-sm text-white/50">
            New episodes airing this week — click any title to watch.
          </p>
        </div>
        <ScheduleView entries={entries} />
      </div>
      <Footer />
    </div>
  );
}
