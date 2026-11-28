import type { KombatFighter } from "@/lib/kombat/types";

export const FEATURED_FIGHTER_ORDER = [
  "scorpion",
  "sub-zero",
  "liu-kang",
  "kitana",
  "raiden",
  "jax",
  "johnny-cage",
  "geras",
] as const;

export const FIGHTER_TILE_GRADIENTS: Record<string, string> = {
  scorpion: "linear-gradient(160deg,#E9A91C 0%,#3a2a05 100%)",
  "sub-zero": "linear-gradient(160deg,#3A9BFF 0%,#0b2342 100%)",
  "liu-kang": "linear-gradient(160deg,#E5372E 0%,#3a0b08 100%)",
  kitana: "linear-gradient(160deg,#8B6CFF 0%,#1c1342 100%)",
  raiden: "linear-gradient(160deg,#7FD1FF 0%,#10303f 100%)",
  jax: "linear-gradient(160deg,#8A929A 0%,#1b1f23 100%)",
  "johnny-cage": "linear-gradient(160deg,#E8C547 0%,#3a2f08 100%)",
  geras: "linear-gradient(160deg,#C88A52 0%,#2b1a0b 100%)",
};

export const FIGHTER_INITIALS: Record<string, string> = {
  scorpion: "SC",
  "sub-zero": "SZ",
  "liu-kang": "LK",
  kitana: "KT",
  raiden: "RD",
  jax: "JX",
  "johnny-cage": "JC",
  geras: "GR",
};

// TODO: Confirm the S/A/B/C win-rate bands before ranked fighter data is considered live.
// Until then, the only valid tier from the available configuration is NEW (< 10 ranked matches).
export const KOMBAT_TIER_CONFIG = {
  minimumRankedMatches: 10,
  bands: [] as Array<{ tier: "S" | "A" | "B" | "C"; minimumWinRate: number }>,
};

export type KombatFighterMatch = {
  fighter_one_id: string;
  fighter_two_id: string;
  player_one_id: string;
  player_two_id: string;
  winner_id: string;
};

export type FighterPerformance = {
  rankedMatches: number;
  rankedWins: number;
  winRate: number | null;
  pickRate: number | null;
  tier: "S" | "A" | "B" | "C" | "NEW";
};

export function buildFighterPerformance(
  fighters: KombatFighter[],
  matches: KombatFighterMatch[],
): Record<string, FighterPerformance> {
  const stats = new Map<string, { matches: number; wins: number; picks: number }>();
  fighters.forEach((fighter) => stats.set(fighter.id, { matches: 0, wins: 0, picks: 0 }));

  matches.forEach((match) => {
    const first = stats.get(match.fighter_one_id);
    const second = stats.get(match.fighter_two_id);
    if (first) {
      first.matches += 1;
      first.picks += 1;
      if (match.winner_id === match.player_one_id) first.wins += 1;
    }
    if (second) {
      second.matches += 1;
      second.picks += 1;
      if (match.winner_id === match.player_two_id) second.wins += 1;
    }
  });

  const totalPicks = matches.length * 2;
  const result: Record<string, FighterPerformance> = {};
  fighters.forEach((fighter) => {
    const row = stats.get(fighter.id) || { matches: 0, wins: 0, picks: 0 };
    const winRate = row.matches ? (row.wins / row.matches) * 100 : null;
    // Tier bands intentionally remain unconfigured until BASE25 confirms them.
    const tier = row.matches < KOMBAT_TIER_CONFIG.minimumRankedMatches
      ? "NEW"
      : (KOMBAT_TIER_CONFIG.bands.find((band) => winRate !== null && winRate >= band.minimumWinRate)?.tier || "NEW");
    result[fighter.id] = {
      rankedMatches: row.matches,
      rankedWins: row.wins,
      winRate,
      pickRate: totalPicks ? (row.picks / totalPicks) * 100 : null,
      tier,
    };
  });
  return result;
}

/**
 * Display-only fallback roster metadata for the eight featured fighters.
 * This is not performance data and does not seed the database.
 * TODO: connect to real enabled roster records when they are available.
 */
export const FEATURED_ROSTER_FALLBACK: KombatFighter[] = [
  { id: "featured-scorpion", name: "Scorpion", slug: "scorpion", tile_color: null, image_src: null, enabled: true, sort_order: 1 },
  { id: "featured-sub-zero", name: "Sub-Zero", slug: "sub-zero", tile_color: null, image_src: null, enabled: true, sort_order: 2 },
  { id: "featured-liu-kang", name: "Liu Kang", slug: "liu-kang", tile_color: null, image_src: null, enabled: true, sort_order: 3 },
  { id: "featured-kitana", name: "Kitana", slug: "kitana", tile_color: null, image_src: null, enabled: true, sort_order: 4 },
  { id: "featured-raiden", name: "Raiden", slug: "raiden", tile_color: null, image_src: null, enabled: true, sort_order: 5 },
  { id: "featured-jax", name: "Jax", slug: "jax", tile_color: null, image_src: null, enabled: true, sort_order: 6 },
  { id: "featured-johnny-cage", name: "Johnny Cage", slug: "johnny-cage", tile_color: null, image_src: null, enabled: true, sort_order: 7 },
  { id: "featured-geras", name: "Geras", slug: "geras", tile_color: null, image_src: null, enabled: true, sort_order: 8 },
];
