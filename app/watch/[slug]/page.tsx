import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getProvider } from "@/services/providers";
import { WatchView } from "@/features/watch/watch-view";
import { preferredTitle } from "@/lib/utils";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getProvider().getBySlug(slug);
  return { title: detail ? `Watch ${preferredTitle(detail.title)}` : "Watch" };
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getProvider().getBySlug(slug);
  if (!detail) notFound();

  // useSearchParams in WatchView requires a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <WatchView detail={detail} />
    </Suspense>
  );
}
