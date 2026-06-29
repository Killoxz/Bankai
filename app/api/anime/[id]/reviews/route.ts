import { NextRequest, NextResponse } from "next/server";

const REVIEWS_QUERY = `
query ($id: Int, $page: Int) {
  Page(page: $page, perPage: 8) {
    reviews(mediaId: $id, sort: RATING_DESC) {
      id
      rating
      ratingAmount
      summary
      score
      createdAt
      user {
        name
        avatar { large }
      }
    }
  }
}
`;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const numericId = Number(decodeURIComponent(id).replace("anilist:", ""));
  if (!numericId) return NextResponse.json([]);

  try {
    const res = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query: REVIEWS_QUERY, variables: { id: numericId, page: 1 } }),
      next: { revalidate: 3600 },
    });
    const json = await res.json();
    const reviews = json?.data?.Page?.reviews ?? [];
    return NextResponse.json(reviews);
  } catch {
    return NextResponse.json([]);
  }
}
