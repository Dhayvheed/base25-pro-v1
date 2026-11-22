export type BoardmanBonusMatch = {
  id: string;
  played_at: string;
  player_one_id: string;
  player_two_id: string;
  winner_id: string;
  created_at?: string;
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

  const { data: players, error: playersError } = await client.from("players").select("id,designation");
  if (playersError || !players?.length) return { bonusByMatchId, bonusByPlayerId };

  const boardmanIds = new Set(players.filter((player: any) => player.designation === "boardman").map((player: any) => player.id));
  if (!boardmanIds.size) return { bonusByMatchId, bonusByPlayerId };

  const idList = Array.from(boardmanIds).join(",");
  const matches: BoardmanBonusMatch[] = [];
  const pageSize = 1000;
  for (let offset = 0; ; offset += pageSize) {
    const { data: page, error } = await client.from("matches")
      .select("id,played_at,created_at,player_one_id,player_two_id,winner_id")
      .or(`player_one_id.in.(${idList}),player_two_id.in.(${idList})`)
      .order("played_at", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (error) return { bonusByMatchId: new Map<string, number>(), bonusByPlayerId: new Map<string, number>() };
    matches.push(...((page || []) as BoardmanBonusMatch[]));
    if (!page || page.length < pageSize) break;
  }
  if (!matches.length) return { bonusByMatchId, bonusByPlayerId };

  for (const match of matches) {
    const oneIsBoardman = boardmanIds.has(match.player_one_id);
    const twoIsBoardman = boardmanIds.has(match.player_two_id);
    if (oneIsBoardman === twoIsBoardman) continue;

    const winnerIsBoardman = match.winner_id === (oneIsBoardman ? match.player_one_id : match.player_two_id);
    if (winnerIsBoardman) continue;

    const winnerId = match.winner_id;
    bonusByMatchId.set(match.id, 10);
    if (lagosWeekKey(new Date()) === lagosWeekKey(match.played_at)) {
      bonusByPlayerId.set(winnerId, (bonusByPlayerId.get(winnerId) || 0) + 10);
    }
  }

  return { bonusByMatchId, bonusByPlayerId };
}
