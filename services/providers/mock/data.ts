import type { AnimeDetail, AnimeFormat, AnimeStatus } from "@/types/anime";
import { slugify } from "@/lib/utils";

// Deterministic placeholder art so the demo looks good with zero assets/keys.
// picsum is whitelisted in next.config.ts. Swap DATA_PROVIDER=anilist for real art.
const cover = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/360/520`;
const banner = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}-bg/1600/640`;
const portrait = (seed: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(seed)}/160/160`;

const GENRES = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Sci-Fi",
  "Slice of Life",
  "Romance",
  "Mystery",
  "Supernatural",
  "Mecha",
  "Sports",
  "Horror",
  "Psychological",
  "Music",
];

interface Seed {
  title: string;
  native: string;
  genres: string[];
  format: AnimeFormat;
  status: AnimeStatus;
  episodes: number;
  year: number;
  score: number;
  popularity: number;
  color: string;
  studio: string;
  desc: string;
}

// Original demo titles (no real franchises) — placeholder content per the brief.
const SEEDS: Seed[] = [
  { title: "Celestial Vanguard", native: "天界の先鋒", genres: ["Action", "Sci-Fi", "Mecha"], format: "TV", status: "RELEASING", episodes: 24, year: 2024, score: 87, popularity: 184000, color: "#7c5cff", studio: "Studio Orbital", desc: "When the orbital ring fractures, a squad of teen pilots must sync with living mechs to hold the sky together — and uncover who sabotaged humanity's last defense." },
  { title: "Petals of the Quiet Town", native: "静かな町の花びら", genres: ["Slice of Life", "Drama", "Romance"], format: "TV", status: "FINISHED", episodes: 12, year: 2023, score: 82, popularity: 96000, color: "#ff86b3", studio: "Aozora Works", desc: "A burnt-out illustrator returns to her seaside hometown and rediscovers color through the people she'd left behind." },
  { title: "Hollow Crown Saga", native: "虚ろな王冠", genres: ["Fantasy", "Adventure", "Drama"], format: "TV", status: "RELEASING", episodes: 26, year: 2024, score: 90, popularity: 240000, color: "#d4a017", studio: "Frostforge Animation", desc: "Five claimants. One cursed throne. A disgraced knight escorts the only heir who can survive sitting on it across a continent that wants them dead." },
  { title: "Neon Appetite", native: "ネオン・アペタイト", genres: ["Comedy", "Slice of Life"], format: "TV", status: "FINISHED", episodes: 13, year: 2022, score: 79, popularity: 71000, color: "#22d3ee", studio: "Pixel Diner", desc: "A late-night ramen stand in a rain-soaked megacity serves up gossip, heartbreak, and impossibly good noodles to a rotating cast of misfits." },
  { title: "The Last Algorithm", native: "最後のアルゴリズム", genres: ["Sci-Fi", "Psychological", "Mystery"], format: "TV", status: "FINISHED", episodes: 11, year: 2023, score: 85, popularity: 132000, color: "#34d399", studio: "Studio Halcyon", desc: "A programmer wakes inside the AI she built and must debug her own memories before the system overwrites who she was." },
  { title: "Blade of the Wandering Star", native: "流星の刃", genres: ["Action", "Fantasy", "Adventure"], format: "TV", status: "RELEASING", episodes: 25, year: 2024, score: 88, popularity: 205000, color: "#f97316", studio: "Frostforge Animation", desc: "A swordsmith's apprentice inherits a blade that hums with a fallen star and the duty to return it to the sky." },
  { title: "Whispering Gears", native: "ささやく歯車", genres: ["Steampunk", "Adventure", "Mystery"], format: "TV", status: "FINISHED", episodes: 24, year: 2021, score: 81, popularity: 88000, color: "#b45309", studio: "Clockwork Studio", desc: "In a city run by clockwork, a deaf mechanic reads the secrets machines whisper — and one of them is plotting a coup." },
  { title: "Summer We Almost Had", native: "あの夏のもしも", genres: ["Romance", "Drama", "Slice of Life"], format: "MOVIE", status: "FINISHED", episodes: 1, year: 2023, score: 86, popularity: 154000, color: "#60a5fa", studio: "Aozora Works", desc: "Two childhood friends meet again the summer before everything changes, replaying the confession neither of them ever made." },
  { title: "Grimoire Delivery Service", native: "魔導便", genres: ["Fantasy", "Comedy", "Adventure"], format: "TV", status: "FINISHED", episodes: 12, year: 2022, score: 80, popularity: 99000, color: "#a78bfa", studio: "Studio Orbital", desc: "A rookie witch couriers cursed packages across the kingdom — no refunds, no questions, absolutely no opening the box." },
  { title: "Ironbloom", native: "鉄花", genres: ["Mecha", "Drama", "Action"], format: "TV", status: "RELEASING", episodes: 24, year: 2024, score: 84, popularity: 121000, color: "#94a3b8", studio: "Studio Orbital", desc: "On a planet where metal grows like flowers, two rival pilots learn their machines were carved from the same dead god." },
  { title: "Café at the Edge of Time", native: "時の果ての喫茶店", genres: ["Supernatural", "Slice of Life", "Mystery"], format: "TV", status: "FINISHED", episodes: 12, year: 2023, score: 83, popularity: 110000, color: "#f472b6", studio: "Halcyon", desc: "A café that appears only at midnight serves one cup of coffee that lets you revisit a single memory. The barista has rules." },
  { title: "Phantom Frequency", native: "幻の周波数", genres: ["Mystery", "Supernatural", "Music"], format: "TV", status: "RELEASING", episodes: 13, year: 2024, score: 82, popularity: 93000, color: "#c084fc", studio: "Clockwork Studio", desc: "A pirate radio DJ broadcasts to the dead — until the dead start requesting songs that haven't been written yet." },
  { title: "Crimson Court", native: "紅の宮廷", genres: ["Drama", "Fantasy", "Romance"], format: "TV", status: "FINISHED", episodes: 24, year: 2022, score: 89, popularity: 198000, color: "#dc2626", studio: "Frostforge Animation", desc: "A commoner girl enters the vampire emperor's court as a food-taster and ends up rewriting a thousand years of bloody tradition." },
  { title: "Pixel Hearts Online", native: "ピクセルハーツ", genres: ["Adventure", "Sci-Fi", "Comedy"], format: "TV", status: "FINISHED", episodes: 25, year: 2021, score: 78, popularity: 140000, color: "#38bdf8", studio: "Pixel Diner", desc: "Beta-testers of a too-realistic VR MMO discover their characters keep playing after they log off." },
  { title: "Tidecaller", native: "潮を呼ぶ者", genres: ["Adventure", "Fantasy", "Action"], format: "TV", status: "RELEASING", episodes: 24, year: 2024, score: 86, popularity: 167000, color: "#06b6d4", studio: "Studio Halcyon", desc: "A landlocked girl who can hear the ocean is recruited to crew an airship that sails on storms." },
  { title: "Overtime Hero", native: "残業ヒーロー", genres: ["Comedy", "Action", "Slice of Life"], format: "TV", status: "FINISHED", episodes: 12, year: 2023, score: 80, popularity: 102000, color: "#fbbf24", studio: "Pixel Diner", desc: "Saving the city is the easy part. The paperwork, the property damage forms, and the 9-to-5 are what really threaten our hero." },
  { title: "Glass Memory", native: "硝子の記憶", genres: ["Drama", "Psychological"], format: "MOVIE", status: "FINISHED", episodes: 1, year: 2022, score: 88, popularity: 119000, color: "#67e8f9", studio: "Aozora Works", desc: "A grieving photographer can only see his late wife through camera lenses, and the film is almost gone." },
  { title: "Starlight Relay", native: "星明かりリレー", genres: ["Sports", "Drama"], format: "TV", status: "RELEASING", episodes: 13, year: 2024, score: 83, popularity: 87000, color: "#fb7185", studio: "Aozora Works", desc: "A dissolved track team reunites for one last relay under the meteor shower they vowed to run beneath as kids." },
  { title: "Mountain God's Apprentice", native: "山神の弟子", genres: ["Supernatural", "Slice of Life", "Fantasy"], format: "TV", status: "FINISHED", episodes: 12, year: 2023, score: 84, popularity: 105000, color: "#4ade80", studio: "Halcyon", desc: "A city kid sent to his grandmother's shrine for the summer ends up apprenticing under a very grumpy, very ancient mountain spirit." },
  { title: "Zero Division", native: "ゼロ・ディビジョン", genres: ["Action", "Sci-Fi", "Psychological"], format: "TV", status: "RELEASING", episodes: 24, year: 2024, score: 91, popularity: 256000, color: "#818cf8", studio: "Studio Orbital", desc: "Elite agents whose emotions are surgically throttled hunt a defector who chose to feel again — and is winning because of it." },
  { title: "Bakery of Forgotten Names", native: "忘れられた名前のパン屋", genres: ["Slice of Life", "Supernatural", "Comedy"], format: "TV", status: "FINISHED", episodes: 12, year: 2022, score: 81, popularity: 76000, color: "#facc15", studio: "Aozora Works", desc: "Eat the right pastry and you remember someone you'd forgotten. The baker remembers everyone — that's the problem." },
  { title: "Thunderline", native: "サンダーライン", genres: ["Sports", "Comedy", "Drama"], format: "TV", status: "FINISHED", episodes: 25, year: 2021, score: 82, popularity: 113000, color: "#eab308", studio: "Pixel Diner", desc: "An underdog street-racing crew goes legit — sort of — when a retired champion bets her garage on them." },
  { title: "The Cartographer's Dream", native: "地図師の夢", genres: ["Adventure", "Fantasy", "Mystery"], format: "MOVIE", status: "NOT_YET_RELEASED", episodes: 1, year: 2025, score: 0, popularity: 64000, color: "#2dd4bf", studio: "Frostforge Animation", desc: "A mapmaker discovers a country that only exists while she's drawing it — and someone is erasing her work." },
  { title: "Nightshift Familiars", native: "夜勤の使い魔", genres: ["Comedy", "Supernatural"], format: "TV", status: "NOT_YET_RELEASED", episodes: 12, year: 2025, score: 0, popularity: 58000, color: "#a3e635", studio: "Clockwork Studio", desc: "A convenience store staffed entirely by off-duty magical familiars takes the graveyard shift very literally." },
  { title: "Aurora Protocol", native: "オーロラ・プロトコル", genres: ["Sci-Fi", "Action", "Mystery"], format: "OVA", status: "FINISHED", episodes: 4, year: 2023, score: 85, popularity: 69000, color: "#5eead4", studio: "Studio Halcyon", desc: "A deep-space rescue crew answers a distress call from a ship that vanished forty years ago — and is still broadcasting." },
  { title: "Little Monster Manual", native: "ちいさな怪物図鑑", genres: ["Comedy", "Slice of Life", "Fantasy"], format: "SPECIAL", status: "FINISHED", episodes: 2, year: 2022, score: 77, popularity: 51000, color: "#fda4af", studio: "Pixel Diner", desc: "A field guide that traps anyone who reads it inside its pages with the very monsters it describes." },
];

function buildDetail(seed: Seed, idx: number): AnimeDetail {
  const slug = slugify(seed.title);
  const id = `mock:${idx + 1}`;
  const studios = [seed.studio];
  const producers = ["Bankai Demo Committee", "Placeholder Pictures"];

  const characters = Array.from({ length: 6 }, (_, i) => ({
    id: `${id}:char:${i}`,
    name: ["Aki", "Ren", "Mira", "Kaito", "Yuki", "Sora"][i] + " " + ["Tanaka", "Hoshino", "Saeki", "Kurusu", "Ono", "Mizuki"][i],
    image: portrait(`${slug}-char-${i}`),
    role: i < 2 ? "MAIN" : "SUPPORTING",
    voiceActor: {
      id: `${id}:va:${i}`,
      name: ["Hana Ito", "Daiki Mori", "Rei Sato", "Jun Abe", "Mao Kondo", "Sho Yamada"][i],
      image: portrait(`${slug}-va-${i}`),
      language: "Japanese",
    },
  }));

  return {
    id,
    slug,
    title: { romaji: seed.title, english: seed.title, native: seed.native },
    coverImage: cover(slug),
    bannerImage: banner(slug),
    color: seed.color,
    format: seed.format,
    status: seed.status,
    episodes: seed.episodes,
    averageScore: seed.score || null,
    popularity: seed.popularity,
    genres: seed.genres,
    seasonYear: seed.year,
    description: seed.desc,
    duration: seed.format === "MOVIE" ? 118 : 24,
    season: (["WINTER", "SPRING", "SUMMER", "FALL"] as const)[idx % 4],
    startDate: `${seed.year}-0${(idx % 9) + 1}-12`,
    endDate: seed.status === "FINISHED" ? `${seed.year}-12-20` : null,
    source: ["Manga", "Light Novel", "Original", "Web Novel", "Game"][idx % 5],
    studios,
    producers,
    isAdult: false,
    trailer: { id: "dQw4w9WgXcQ", site: "youtube", thumbnail: banner(slug) },
    characters,
    relations: [],
    recommendations: [],
    stats: {
      rankPopularity: idx + 1,
      rankRated: ((idx * 7) % 25) + 1,
      favourites: Math.round(seed.popularity * 0.18),
    },
    externalLinks: [
      { site: "Official Site", url: "https://example.com" },
      { site: "Twitter", url: "https://twitter.com" },
    ],
  };
}

export const MOCK_DETAILS: AnimeDetail[] = SEEDS.map(buildDetail);

// Wire up relations & recommendations between entries.
for (let i = 0; i < MOCK_DETAILS.length; i++) {
  const a = MOCK_DETAILS[i];
  const recs = [1, 2, 3, 4, 5, 6].map(
    (off) => MOCK_DETAILS[(i + off) % MOCK_DETAILS.length]
  );
  a.recommendations = recs.map(toCard);
  a.relations = [2, 9].map((off) => {
    const r = MOCK_DETAILS[(i + off) % MOCK_DETAILS.length];
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      coverImage: r.coverImage,
      relationType: off === 2 ? "SEQUEL" : "SIDE_STORY",
      format: r.format,
    };
  });
}

export function toCard(d: AnimeDetail) {
  return {
    id: d.id,
    slug: d.slug,
    title: d.title,
    coverImage: d.coverImage,
    bannerImage: d.bannerImage,
    color: d.color,
    format: d.format,
    status: d.status,
    episodes: d.episodes,
    averageScore: d.averageScore,
    popularity: d.popularity,
    genres: d.genres,
    seasonYear: d.seasonYear,
    currentEpisode: d.status === "RELEASING" ? Math.max(1, (d.episodes ?? 12) - 3) : null,
  };
}

export const MOCK_CARDS = MOCK_DETAILS.map(toCard);
export const MOCK_GENRES = GENRES;
