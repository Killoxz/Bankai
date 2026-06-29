import { Tags } from "lucide-react";
import type { Metadata } from "next";
import { getProvider } from "@/services/providers";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/layout/page-header";
import { GenreGrid } from "@/components/anime/genre-grid";

export const metadata: Metadata = { title: "Genres" };

export default async function GenresPage() {
  const genres = await getProvider().getGenres();
  return (
    <PageContainer>
      <PageHeader
        title="Genres"
        description="Find your next favorite by mood and theme."
        icon={<Tags className="size-7 text-primary" />}
      />
      <GenreGrid genres={genres} />
    </PageContainer>
  );
}
