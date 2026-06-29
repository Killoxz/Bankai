# Bankai

A modern anime streaming platform — an original implementation inspired by the Miruro UX. Built with Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Framer Motion, TanStack Query, Zustand, Prisma, and NextAuth.

> Uses only original code and AniList's public API. No copyrighted assets, branding, or third-party source code are included.

## Quick start

```bash
npm install
cp .env.example .env      # works out of the box in mock mode
npm run dev               # http://localhost:3000
```

The app boots in **`mock` mode** with bundled demo data and a public sample HLS stream, so it runs fully offline with zero API keys or database.

## Data providers (modular adapters)

Switch the backing source with one env var — `DATA_PROVIDER`:

| Value     | Source                              | Keys |
|-----------|-------------------------------------|------|
| `mock`    | Bundled demo dataset (default)      | none |
| `anilist` | AniList GraphQL (live metadata)     | none |
| `jikan`   | Jikan / MyAnimeList REST (live)     | none |

Each adapter lives in `services/providers/<name>/` and implements the `AnimeProvider` interface (`services/providers/types.ts`). Add TMDB/Consumet by dropping in a new folder and registering it in `services/providers/index.ts`.

> Streaming sources: AniList/Jikan don't serve video, so playback falls back to a public demo HLS stream. Wire a real provider (e.g. Consumet) into `getStream()` for live video.

## Database & auth (optional for local dev)

- **Postgres + Prisma** persist users, cross-device history, and watchlists.
  ```bash
  docker compose up -d db        # or use your own Postgres
  npm run db:push                # create tables
  npm run db:seed                # load demo anime
  ```
- **NextAuth (Auth.js v5)** — `lib/auth.ts`. OAuth buttons (Google/Discord/GitHub) appear automatically when their env vars are set; a demo email login and guest mode always work. Uses JWT sessions so it runs without a DB.

Without a database, history/watchlist/favorites persist locally via Zustand + `localStorage`, so every page is fully functional in dev.

## Scripts

| Command            | Description                       |
|--------------------|-----------------------------------|
| `npm run dev`      | Dev server                        |
| `npm run build`    | Production build (`prisma generate` + `next build`) |
| `npm run start`    | Run production build              |
| `npm run typecheck`| `tsc --noEmit`                    |
| `npm run db:push`  | Sync Prisma schema to DB          |
| `npm run db:seed`  | Seed demo data                    |

## Docker

```bash
docker compose up --build         # web + postgres + redis
```

## Project structure

```
app/                 # routes (App Router) + API route handlers (the backend)
  api/               # /anime, /search, /schedule, /genres, /user/*, /auth/*
  anime/[slug]/      # details page
  watch/[slug]/      # watch page
components/
  ui/                # shadcn-style primitives (button, card, dialog, tabs, …)
  layout/            # navbar, sidebar, mobile nav, app shell
  anime/             # card, row, grid, hero, genre grid
  search/            # command palette
features/            # feature modules (browse, schedule, watch, profile, …)
hooks/               # reusable client hooks
lib/                 # utils, config, auth, prisma, nav
services/
  providers/         # mock | anilist | jikan adapters + factory
  client.ts          # client-side fetchers (hit /api)
store/               # Zustand stores (ui, history, watchlist, player)
types/               # domain + next-auth types
prisma/              # schema + seed
```

## Implemented

Homepage (hero carousel, curated rows, genres) · Trending/Browse (filters, sort, infinite scroll) · Schedule (weekday tabs, live countdowns, timezone) · Anime Details (banner, tabs: overview/episodes/characters/reviews/recommendations, trailer, comments, actions) · Watch (custom HLS player with quality/speed/PiP/subtitles/skip-intro/keyboard shortcuts, sub-dub & server switch, episode list) · Auth · Profile (stats, achievements) · History (grouped, resume, clear) · Watchlist (status tabs, favorites, sort) · Settings · Admin dashboard · responsive desktop/tablet/mobile with bottom nav + slide-out menu.

## Notes / next steps

- `/admin` is not role-gated in this demo — add an `ADMIN` role check in middleware before exposing it.
- Replace the demo Credentials provider with a real password flow (bcrypt) and the Prisma adapter for DB-backed sessions.
- Plug a real streaming resolver into `getStream()`.
