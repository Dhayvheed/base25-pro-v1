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

const BONUS_PER_WIN = 10;
const MAX_BONUS_WINS_PER_PLAYER_PER_WEEK = 3;

function lagosWeekKey(value: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value || 0);
  const date = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
  return date.toISOString().slice(0, 10);
}

/**
 * Awards the +10 Boardman-defeat bonus to each player's first three qualifying
 * wins in each Lagos Saturday-to-Saturday competition week.
 *
 * Awards are derived from ordered match history, not stored counters. This
 * makes edits/deletions self-correcting and prevents a stale counter granting
 * extra points. The ELO calculation itself is not changed by this helper.
 */
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

  // The query is already ordered; keep a separate count for every player/week.
  const qualifyingWinsByPlayerWeek = new Map<string, number>();
  const currentWeek = lagosWeekKey(new Date());

  for (const match of matches) {
    const oneIsBoardman = boardmanIds.has(match.player_one_id);
    const twoIsBoardman = boardmanIds.has(match.player_two_id);

    // A qualifying match must have exactly one Boardman participant.
    if (oneIsBoardman === twoIsBoardman) continue;

    const boardmanId = oneIsBoardman ? match.player_one_id : match.player_two_id;
    if (match.winner_id === boardmanId) continue;

    const winnerId = match.winner_id;
    const week = lagosWeekKey(match.played_at);
    const playerWeekKey = `${week}:${winnerId}`;
    const priorQualifyingWins = qualifyingWinsByPlayerWeek.get(playerWeekKey) || 0;

    // Only the first three qualifying wins earn bonus points that week.
    if (priorQualifyingWins >= MAX_BONUS_WINS_PER_PLAYER_PER_WEEK) continue;

    qualifyingWinsByPlayerWeek.set(playerWeekKey, priorQualifyingWins + 1);
    bonusByMatchId.set(match.id, BONUS_PER_WIN);

    if (week === currentWeek) {
      bonusByPlayerId.set(winnerId, (bonusByPlayerId.get(winnerId) || 0) + BONUS_PER_WIN);
    }
  }

  return { bonusByMatchId, bonusByPlayerId };
}
