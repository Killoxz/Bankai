// Centralized runtime config. Reads env with safe defaults so the app boots
// offline in "mock" mode with zero configuration.

export type DataProvider = "mock" | "anilist" | "jikan";

export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Bankai",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  /** Provider used in server contexts (route handlers, RSC). */
  dataProvider: (process.env.DATA_PROVIDER ?? "mock") as DataProvider,
  /** Provider exposed to the client bundle (for client-side fetches). */
  publicDataProvider: (process.env.NEXT_PUBLIC_DATA_PROVIDER ??
    "mock") as DataProvider,
  tmdbApiKey: process.env.TMDB_API_KEY ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
} as const;

export const isMock = config.dataProvider === "mock";
