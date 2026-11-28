export type RivalryResult = "L" | "R";
export type Rivalry = {
  id: string;
  leftPlayerId: string;
  rightPlayerId: string;
  leftName: string;
  rightName: string;
  leftFighterSlug: string;
  rightFighterSlug: string;
  leftFighterName: string;
  rightFighterName: string;
  results: RivalryResult[];
  lastDate: string;
  totalMeetings: number;
};

export const RIVALRY_STATUS_CONFIG = {
  heatedMaxWinDifference: 1,
  oneSidedMinimumShare: 0.75,
  minimumMeetings: 3,
} as const;

export type RivalryStatus = "HEATED" | "ONGOING" | "ONE-SIDED";

export function getRivalryStatus(rivalry: Rivalry): RivalryStatus {
  const leftWins = rivalry.results.filter((result) => result === "L").length;
  const rightWins = rivalry.results.length - leftWins;
  if (Math.abs(leftWins - rightWins) <= RIVALRY_STATUS_CONFIG.heatedMaxWinDifference) return "HEATED";
  if (Math.max(leftWins, rightWins) / rivalry.results.length >= RIVALRY_STATUS_CONFIG.oneSidedMinimumShare) return "ONE-SIDED";
  return "ONGOING";
}
