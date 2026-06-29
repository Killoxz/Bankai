// AniList GraphQL fragments/queries used by the adapter.

export const MEDIA_CARD_FRAGMENT = `
fragment card on Media {
  id
  idMal
  title { romaji english native }
  coverImage { large extraLarge color }
  bannerImage
  format
  status
  episodes
  averageScore
  popularity
  genres
  seasonYear
  nextAiringEpisode { episode }
}`;

export const PAGE_QUERY = `
${MEDIA_CARD_FRAGMENT}
query ($page: Int, $perPage: Int, $sort: [MediaSort], $search: String, $genre_in: [String], $format: MediaFormat, $status: MediaStatus, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { hasNextPage total currentPage }
    media(type: ANIME, isAdult: false, sort: $sort, search: $search, genre_in: $genre_in, format: $format, status: $status, season: $season, seasonYear: $seasonYear) {
      ...card
    }
  }
}`;

export const DETAIL_QUERY = `
${MEDIA_CARD_FRAGMENT}
query ($id: Int, $search: String) {
  Media(id: $id, search: $search, type: ANIME) {
    ...card
    description(asHtml: false)
    duration
    season
    source
    favourites
    isAdult
    startDate { year month day }
    endDate { year month day }
    studios(isMain: true) { nodes { name } }
    trailer { id site thumbnail }
    rankings { rank type allTime context }
    externalLinks { site url icon }
    characters(sort: ROLE, perPage: 12) {
      edges {
        role
        node { id name { full } image { large } }
        voiceActors(language: JAPANESE) { id name { full } image { large } languageV2 }
      }
    }
    relations {
      edges {
        relationType
        node { id title { romaji english } coverImage { large } format type }
      }
    }
    recommendations(perPage: 12, sort: RATING_DESC) {
      nodes { mediaRecommendation { ...card } }
    }
  }
}`;

export const SCHEDULE_QUERY = `
${MEDIA_CARD_FRAGMENT}
query ($start: Int, $end: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    airingSchedules(airingAt_greater: $start, airingAt_lesser: $end, sort: TIME) {
      episode
      airingAt
      timeUntilAiring
      media { ...card }
    }
  }
}`;

// All homepage rows in a SINGLE request via aliased Page fields — avoids
// firing 7-8 separate calls (and tripping AniList's rate limit).
export const HOME_QUERY = `
${MEDIA_CARD_FRAGMENT}
query ($perPage: Int) {
  trending: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, sort: [TRENDING_DESC, POPULARITY_DESC]) { ...card } }
  popular: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, sort: POPULARITY_DESC) { ...card } }
  topRated: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, sort: SCORE_DESC) { ...card } }
  recentlyUpdated: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, status: RELEASING, sort: UPDATED_AT_DESC) { ...card } }
  upcoming: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, status: NOT_YET_RELEASED, sort: POPULARITY_DESC) { ...card } }
  movies: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, format: MOVIE, sort: POPULARITY_DESC) { ...card } }
  tv: Page(perPage: $perPage) { media(type: ANIME, isAdult: false, format: TV, sort: SCORE_DESC) { ...card } }
}`;

export const SEARCH_QUERY = `
query ($search: String) {
  anime: Page(perPage: 6) {
    media(type: ANIME, search: $search, sort: SEARCH_MATCH, isAdult: false) {
      id title { romaji english } coverImage { large } format seasonYear genres averageScore popularity status episodes
    }
  }
  characters: Page(perPage: 4) {
    characters(search: $search, sort: SEARCH_MATCH) { id name { full } image { large } }
  }
  staff: Page(perPage: 4) {
    staff(search: $search, sort: SEARCH_MATCH) { id name { full } image { large } }
  }
  studios: Page(perPage: 4) {
    studios(search: $search, sort: SEARCH_MATCH) { id name }
  }
}`;
