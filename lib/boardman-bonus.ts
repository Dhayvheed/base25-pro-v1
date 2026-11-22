export type BoardmanBonusMatch = {
  id: string;
  played_at: string;
  player_one_id: string;
  player_two_id: string;
  winner_id: string;
};

export type BoardmanBonusData = {
  bonusByMatchId: Map<string, number>;
  bonusByPlayerId: Map<string, number>;
};

function lagosWeekKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value || 0);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
  return date.toISOString().slice(0, 10);
}

export async function getBoardmanBonusData(client: any): Promise<BoardmanBonusData> {
  const bonusByMatchId = new Map<string, number>();
  const bonusByPlayerId = new Map<string, number>();
  if (!client) return { bonusByMatchId, bonusByPlayerId };

  const [{ data: players, error: playersError }, { data: matches, error: matchesError }] = await Promise.all([
    client.from("players").select("id,designation"),
    client.from("matches").select("id,played_at,player_one_id,player_two_id,winner_id").order("played_at", { ascending: true }),
  ]);
  if (playersError || matchesError || !players?.length || !matches?.length) return { bonusByMatchId, bonusByPlayerId };

  const boardmanIds = new Set(players.filter((player: any) => player.designation === "boardman").map((player: any) => player.id));
  const countsByWeekAndPlayer = new Map<string, number>();

  for (const match of matches as BoardmanBonusMatch[]) {
    const oneIsBoardman = boardmanIds.has(match.player_one_id);
    const twoIsBoardman = boardmanIds.has(match.player_two_id);
    if (oneIsBoardman === twoIsBoardman) continue;

    const winnerIsBoardman = match.winner_id === (oneIsBoardman ? match.player_one_id : match.player_two_id);
    if (winnerIsBoardman) continue;

    const winnerId = match.winner_id;
    const key = lagosWeekKey(match.played_at) + ":" + winnerId;
    const earned = countsByWeekAndPlayer.get(key) || 0;
    if (earned >= 3) continue;

    countsByWeekAndPlayer.set(key, earned + 1);
    bonusByMatchId.set(match.id, 10);
    if (lagosWeekKey(new Date()) === lagosWeekKey(match.played_at)) {
      bonusByPlayerId.set(winnerId, (bonusByPlayerId.get(winnerId) || 0) + 10);
    }
  }

  return { bonusByMatchId, bonusByPlayerId };
}
