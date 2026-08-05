import { NextRequest, NextResponse } from "next/server";

interface TmdbSearchResult { id: number; name: string; original_name: string }
interface TmdbLogo        { file_path: string; iso_639_1: string | null; vote_average: number }

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title");
  const key   = process.env.TMDB_API_KEY;

  if (!key || !title) return NextResponse.json({ logo: null });

  try {
    // Search TMDB TV shows by anime title
    const search = await fetch(
      `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(title)}&api_key=${key}&language=en-US`,
      { next: { revalidate: 86400 } },
    );
    if (!search.ok) return NextResponse.json({ logo: null });

    const { results } = (await search.json()) as { results?: TmdbSearchResult[] };
    const tvId = results?.[0]?.id;
    if (!tvId) return NextResponse.json({ logo: null });

    // Fetch images — request English + null (language-neutral) logos
    const images = await fetch(
      `https://api.themoviedb.org/3/tv/${tvId}/images?include_image_language=en,null&api_key=${key}`,
      { next: { revalidate: 86400 } },
    );
    if (!images.ok) return NextResponse.json({ logo: null });

    const { logos } = (await images.json()) as { logos?: TmdbLogo[] };
    if (!logos?.length) return NextResponse.json({ logo: null });

    // Prefer English, then highest-voted fallback
    const pick =
      logos.find((l) => l.iso_639_1 === "en") ??
      logos.sort((a, b) => b.vote_average - a.vote_average)[0];

    return NextResponse.json({
      logo: `https://image.tmdb.org/t/p/original${pick.file_path}`,
    });
  } catch {
    return NextResponse.json({ logo: null });
  }
}
