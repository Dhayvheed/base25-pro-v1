/**
 * SAMPLE DATA ONLY — TODO: connect to real published, non-voided ranked Kombat records.
 * No database rows or schema are created by this module.
 */
export type DetailOpponent = { slug: string; name: string; winRate: number | null; meetings: number };
export type DetailPlayer = { id: string; name: string; winRate: number; matches: number; avatarSrc: string | null };
export type DetailFight = {
  id: string; playerOne: string; playerTwo: string; winner: "one" | "two";
  fighterOne: string; fighterTwo: string; dateLabel: string; score: string; ranked: true;
};
export type CharacterDetailSample = {
  slug: string; name: string; enabled: boolean; portraitSrc: string | null;
  tier: "S" | "A" | "B" | "C" | "NEW"; winRate: number | null; matches: number;
  wins: number; losses: number; pickRate: number | null; rank: number | null;
  enabledFighterCount: number; weekly: Array<number | null>;
  matchups: DetailOpponent[]; topPlayers: DetailPlayer[]; fights: DetailFight[];
};

export const CHARACTER_DETAIL_SAMPLE: Record<string, CharacterDetailSample> = {
  scorpion: {
    slug: "scorpion", name: "Scorpion", enabled: true, portraitSrc: null,
    tier: "S", winRate: 62, matches: 41, wins: 25, losses: 16, pickRate: 28,
    rank: 1, enabledFighterCount: 37,
    weekly: [48, 52, 55, 58, 60, 62],
    matchups: [
      { slug: "jax", name: "Jax", winRate: 78, meetings: 9 },
      { slug: "raiden", name: "Raiden", winRate: 64, meetings: 11 },
      { slug: "liu-kang", name: "Liu Kang", winRate: 50, meetings: 8 },
      { slug: "sub-zero", name: "Sub-Zero", winRate: 44, meetings: 9 },
      { slug: "geras", name: "Geras", winRate: null, meetings: 2 },
    ],
    // Correct order is by win rate: Moscow, Sensei, Rochi.
    topPlayers: [
      { id: "sample-moscow", name: "Moscow", winRate: 88, matches: 8, avatarSrc: null },
      { id: "sample-sensei", name: "Sensei", winRate: 67, matches: 3, avatarSrc: null },
      { id: "sample-rochi", name: "Rochi", winRate: 60, matches: 5, avatarSrc: null },
    ],
    fights: [
      { id: "sample-fight-1", playerOne: "Moscow", playerTwo: "Oscar", winner: "one", fighterOne: "Scorpion", fighterTwo: "Sub-Zero", dateLabel: "26 NOV", score: "2–1", ranked: true },
      { id: "sample-fight-2", playerOne: "Rochi", playerTwo: "Deen", winner: "two", fighterOne: "Scorpion", fighterTwo: "Sub-Zero", dateLabel: "25 NOV", score: "1–2", ranked: true },
      { id: "sample-fight-3", playerOne: "Moscow", playerTwo: "Deen", winner: "one", fighterOne: "Scorpion", fighterTwo: "Sub-Zero", dateLabel: "25 NOV", score: "2–0", ranked: true },
    ],
  },
};

export const SAMPLE_DETAIL_FIGHTERS = [
  { slug: "scorpion", name: "Scorpion" }, { slug: "sub-zero", name: "Sub-Zero" },
  { slug: "liu-kang", name: "Liu Kang" }, { slug: "kitana", name: "Kitana" },
  { slug: "raiden", name: "Raiden" }, { slug: "jax", name: "Jax" },
  { slug: "johnny-cage", name: "Johnny Cage" }, { slug: "geras", name: "Geras" },
] as const;
