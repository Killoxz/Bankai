// Seeds the local DB with cached anime metadata + a demo announcement.
// Run: npm run db:seed  (requires DATABASE_URL to be reachable)
import { PrismaClient } from "@prisma/client";
import { MOCK_DETAILS } from "../services/providers/mock/data";

const prisma = new PrismaClient();

async function main() {
  for (const d of MOCK_DETAILS) {
    await prisma.anime.upsert({
      where: { id: d.id },
      update: {},
      create: {
        id: d.id,
        slug: d.slug,
        title: d.title.romaji,
        titleNative: d.title.native ?? null,
        description: d.description ?? null,
        coverImage: d.coverImage,
        bannerImage: d.bannerImage ?? null,
        format: d.format ?? null,
        status: d.status ?? null,
        season: d.season ?? null,
        seasonYear: d.seasonYear ?? null,
        episodes: d.episodes ?? null,
        duration: d.duration ?? null,
        averageScore: d.averageScore ?? null,
        popularity: d.popularity ?? null,
        genres: d.genres,
        studios: d.studios,
        source: d.source ?? null,
      },
    });
  }

  await prisma.announcement.create({
    data: {
      title: "Welcome to Bankai",
      body: "This is a demo build running on placeholder data. Set DATA_PROVIDER=anilist for live content.",
    },
  });

  console.log(`Seeded ${MOCK_DETAILS.length} anime.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
