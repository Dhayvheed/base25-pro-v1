// TODO: connect to real data. All values below are visual demo data from the approved KOMBAT Arena references.
export type FighterId = "scorpion" | "subzero" | "liukang" | "kitana" | "raiden" | "jax" | "johnnycage";
export type PotMode = "live" | "fixed" | "soon";
export const kombatPotConfig: { mode: PotMode; fixedAmount: number; liveMatchesThisWeek: number; contributionPerMatch: number } = {
  mode: "live",
  fixedAmount: 20000,
  liveMatchesThisWeek: 32,
  contributionPerMatch: 100,
};
export const fighters: Record<FighterId, { name: string; initials: string; tier?: string }> = {
  scorpion: { name: "Scorpion", initials: "SC", tier: "S" },
  subzero: { name: "Sub-Zero", initials: "SZ", tier: "A" },
  liukang: { name: "Liu Kang", initials: "LK", tier: "A" },
  kitana: { name: "Kitana", initials: "KT", tier: "B" },
  raiden: { name: "Raiden", initials: "RD" },
  jax: { name: "Jax", initials: "JX" },
  johnnycage: { name: "Johnny Cage", initials: "JC" },
};
export const kombatDemo = {
  leader: { name: "Moscow", fighter: "scorpion" as FighterId, elo: 1214, record: "9-2", streak: "W4" },
  me: { name: "Sensei", rank: 7, elo: 1038, streak: "W2" },
  leaderboard: [
    { name: "Moscow", fighter: "scorpion" as FighterId, wins: 9, losses: 2, elo: 1214, avatar: "M" },
    { name: "Oscar", fighter: "subzero" as FighterId, wins: 8, losses: 3, elo: 1187, avatar: "O" },
    { name: "Jerrypound", fighter: "liukang" as FighterId, wins: 6, losses: 4, elo: 1142, avatar: "J" },
    { name: "Oba", fighter: "kitana" as FighterId, wins: 5, losses: 5, elo: 1096, avatar: "O" },
    { name: "Cue Controller", fighter: "raiden" as FighterId, wins: 4, losses: 6, elo: 1071, avatar: "C" },
  ],
  fights: [
    { one: "Moscow", oneFighter: "scorpion" as FighterId, score: "2–1", two: "Oscar", twoFighter: "subzero" as FighterId, winner: "Moscow", type: "RANKED" },
    { one: "Jerrypound", oneFighter: "liukang" as FighterId, score: "2–0", two: "Oba", twoFighter: "kitana" as FighterId, winner: "Jerrypound", type: "RANKED" },
    { one: "Cue Controller", oneFighter: "raiden" as FighterId, score: "0–2", two: "Oscar", twoFighter: "subzero" as FighterId, winner: "Oscar", type: "RANKED" },
  ],
  character: { fighter: "scorpion" as FighterId, winRate: 62, matches: 41, picked: 28 },
  rivalry: { one: "Moscow", oneFighter: "scorpion" as FighterId, two: "Oscar", twoFighter: "subzero" as FighterId, oneWins: 4, twoWins: 3 },
};
