export type PeriodPlayer = {
  id: string; player_code: string; username: string; photo_url: string | null;
  designation?: "regular" | "house_ghost" | "boardman" | null; created_at?: string;
};
export type PeriodMatch = {
  id: string; played_at: string; created_at: string; player_one_id: string;
  player_two_id: string; winner_id: string;
};
export type PeriodRack = {
  match_id: string; rack_number: number; winner_id: string;
  loser_balls_remaining: number; black_ball_finish: boolean;
};
export type PeriodRow = PeriodPlayer & {
  elo_rating: number; matches_played: number; wins: number; losses: number;
  win_percentage: number; boardmanBonusPoints: number;
};

export function lagosDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}
function lagosWeekKey(value: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  const date = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 1) % 7));
  return date.toISOString().slice(0, 10);
}
export function calculatePeriodLeaderboard(players: PeriodPlayer[], matches: PeriodMatch[], racks: PeriodRack[], periodStart: string): PeriodRow[] {
  const boardmen = new Set(players.filter(p => p.designation === "boardman").map(p => p.id));
  const ratings = new Map<string, number>(), counts = new Map<string, number>(), wins = new Map<string, number>();
  const bonusCounts = new Map<string, number>(), bonusPoints = new Map<string, number>();
  const racksByMatch = new Map<string, PeriodRack[]>();
  for (const rack of racks) { const rows = racksByMatch.get(rack.match_id) || []; rows.push(rack); racksByMatch.set(rack.match_id, rows); }
  const startMs = new Date(periodStart).getTime(), cutover = new Date("2026-11-28T00:00:00+01:00").getTime();
  const initial = (id: string) => boardmen.has(id) && startMs >= cutover ? 1500 : 1000;
  const ordered = [...matches].sort((a,b) => new Date(a.played_at).getTime()-new Date(b.played_at).getTime() || new Date(a.created_at).getTime()-new Date(b.created_at).getTime() || a.id.localeCompare(b.id));
  for (const m of ordered) {
    const a=m.player_one_id,b=m.player_two_id,ra=ratings.get(a)??initial(a),rb=ratings.get(b)??initial(b);
    const ca=counts.get(a)||0,cb=counts.get(b)||0,k=ca>=10&&cb>=10?24:40;
    const expected=m.winner_id===a?1/(1+Math.pow(10,(rb-ra)/400)):1/(1+Math.pow(10,(ra-rb)/400));
    const delta=Math.round(k*(1-expected));
    let rackA=0,rackB=0;
    for(const rack of (racksByMatch.get(m.id)||[]).sort((x,y)=>x.rack_number-y.rack_number)){
      if(rack.black_ball_finish) continue;
      const bonus=Math.min(Number(rack.loser_balls_remaining||0),7);
      if(rack.winner_id===a) rackA+=bonus;
      if(rack.winner_id===b) rackB+=bonus;
    }
    if(m.winner_id===a){ratings.set(a,Math.max(0,Math.round(ra+delta+rackA)));ratings.set(b,Math.max(0,Math.round(rb-delta+rackB)));}
    else{ratings.set(a,Math.max(0,Math.round(ra-delta+rackA)));ratings.set(b,Math.max(0,Math.round(rb+delta+rackB)));}
    counts.set(a,ca+1);counts.set(b,cb+1);wins.set(m.winner_id,(wins.get(m.winner_id)||0)+1);
    const one=boardmen.has(a),two=boardmen.has(b);
    if(one!==two && m.winner_id!==(one?a:b)){
      const key=lagosWeekKey(m.played_at)+":"+m.winner_id,used=bonusCounts.get(key)||0;
      if(used<3){bonusCounts.set(key,used+1);bonusPoints.set(m.winner_id,(bonusPoints.get(m.winner_id)||0)+10);}
    }
  }
  return players.filter(p=>(counts.get(p.id)||0)>0).map(p=>{
    const played=counts.get(p.id)||0,won=wins.get(p.id)||0,offset=boardmen.has(p.id)&&startMs<cutover?500:0;
    return {...p,elo_rating:(ratings.get(p.id)??1000)+offset,matches_played:played,wins:won,losses:played-won,
      win_percentage:played?Math.round(1000*won/played)/10:0,boardmanBonusPoints:bonusPoints.get(p.id)||0};
  }).sort((a,b)=>(b.elo_rating+b.boardmanBonusPoints)-(a.elo_rating+a.boardmanBonusPoints));
}
