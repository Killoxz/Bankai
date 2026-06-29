import { Compass } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { BrowseView } from "@/features/browse/browse-view";
import { parseAnimeQuery } from "@/lib/query-params";

export const metadata: Metadata = { title: "Browse" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => usp.append(k, x));
    else if (v != null) usp.set(k, v);
  }
  const initialQuery = parseAnimeQuery(usp);

  return (
    <PageContainer>
      <PageHeader
        title={initialQuery.search ? `Results for “${initialQuery.search}”` : "Browse"}
        description="Filter the full catalog by genre, format, status and more."
        icon={<Compass className="size-7 text-primary" />}
      />
      <BrowseView initialQuery={initialQuery} />
    </PageContainer>
  );
}
