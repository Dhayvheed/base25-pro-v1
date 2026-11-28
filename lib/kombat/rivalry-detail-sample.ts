/**
 * SAMPLE ONLY — TODO: connect to real published ranked Kombat match data.
 * This module is display data for the Rivalry Detail UI review.
 * It does not seed or write to the database.
 */
export type SampleMeeting = {
  id: string;
  number: number;
  date: string;
  dateLabel: string;
  winner: "left" | "right";
  leftScore: number;
  rightScore: number;
  leftFighter: { name: string; slug: string };
  rightFighter: { name: string; slug: string };
  status: "RANKED" | "FINAL";
};

export const SAMPLE_RIVALRY_ID = "sample-moscow-oscar";

export const SAMPLE_RIVALRY = {
  id: SAMPLE_RIVALRY_ID,
  leftPlayer: { id: "sample-moscow", name: "Moscow", elo: 1214 },
  rightPlayer: { id: "sample-oscar", name: "Oscar", elo: 1187 },
  status: "HEATED" as const,
  resultsOldestFirst: ["L", "R", "L", "L", "R", "R", "L"] as Array<"L" | "R">,
  currentStreak: { side: "left" as const, wins: 1 },
  lastMet: "28 Nov",
  lastMeetingNote: "Moscow won 2–1",
  gamesWon: { left: 10, right: 10 },
  longestStreak: { wins: 2, names: "Moscow and Oscar" },
  fighterUsage: {
    left: [{ name: "Scorpion", slug: "scorpion", count: 7 }],
    right: [
      { name: "Sub-Zero", slug: "sub-zero", count: 6 },
      { name: "Liu Kang", slug: "liu-kang", count: 1 },
    ],
  },
  pairings: [
    { left: { name: "Scorpion", slug: "scorpion" }, right: { name: "Sub-Zero", slug: "sub-zero" }, meetings: 6, leftWins: 4, rightWins: 2 },
    { left: { name: "Scorpion", slug: "scorpion" }, right: { name: "Liu Kang", slug: "liu-kang" }, meetings: 1, leftWins: 0, rightWins: 1 },
  ],
  meetingsNewestFirst: [
    { id: "sample-match-7", number: 7, date: "2026-11-28T19:00:00", dateLabel: "SAT · 28 NOV", winner: "left", leftScore: 2, rightScore: 1, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "RANKED" },
    { id: "sample-match-6", number: 6, date: "2026-11-26T19:00:00", dateLabel: "THU · 26 NOV", winner: "right", leftScore: 0, rightScore: 2, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "RANKED" },
    { id: "sample-match-5", number: 5, date: "2026-11-24T19:00:00", dateLabel: "TUE · 24 NOV", winner: "right", leftScore: 1, rightScore: 2, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Liu Kang", slug: "liu-kang" }, status: "RANKED" },
    { id: "sample-match-4", number: 4, date: "2026-11-21T19:00:00", dateLabel: "SAT · 21 NOV", winner: "left", leftScore: 3, rightScore: 2, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "FINAL" },
    { id: "sample-match-3", number: 3, date: "2026-11-20T19:00:00", dateLabel: "FRI · 20 NOV", winner: "left", leftScore: 2, rightScore: 1, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "RANKED" },
    { id: "sample-match-2", number: 2, date: "2026-11-18T19:00:00", dateLabel: "WED · 18 NOV", winner: "right", leftScore: 0, rightScore: 2, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "RANKED" },
    { id: "sample-match-1", number: 1, date: "2026-11-14T19:00:00", dateLabel: "SAT · 14 NOV", winner: "left", leftScore: 2, rightScore: 0, leftFighter: { name: "Scorpion", slug: "scorpion" }, rightFighter: { name: "Sub-Zero", slug: "sub-zero" }, status: "RANKED" },
  ] satisfies SampleMeeting[],
};
