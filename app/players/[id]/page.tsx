"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type MatchRow = {
  id: string;
  played_at: string;
  player_one_id: string;
  player_two_id: string;
  winner_id: string;
  player_one_score: number;
  player_two_score: number;
  player_one_elo_before: number | null;
  player_two_elo_before: number | null;
  player_one_elo_after: number | null;
  player_two_elo_after: number | null;
  one?: { username: string; player_code: string } | null;
  two?: { username: string; player_code: string } | null;
};

type ChampionRow = { id: string; week_start: string; prize_amount: number };

export default function PublicPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [rank, setRank] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState(0);
  const [weeklyElo, setWeeklyElo] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [champions, setChampions] = useState<ChampionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("10");
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [showMatchup, setShowMatchup] = useState(false);
  const [opponentId, setOpponentId] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase || !id) { setLoading(false); return; }
      const [
        { data: profile },
        { data: board },
        { data: weekBoard },
        { data: games },
        { data: wins },
        { data: archiveRows }
      ] = await Promise.all([
        supabase.from("player_public_leaderboard")
          .select("id,username,player_code,photo_url,elo_rating,highest_elo,matches_played,wins,losses,win_percentage")
          .eq("id", id).single(),
        supabase.from("player_public_leaderboard").select("id,elo_rating").order("elo_rating", { ascending: false }),
        supabase.rpc("get_period_leaderboard", { p_period: "this_week" }),
        supabase.from("matches")
          .select("id,played_at,player_one_id,player_two_id,winner_id,player_one_score,player_two_score,player_one_elo_before,player_two_elo_before,player_one_elo_after,player_two_elo_after,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)")
          .or(`player_one_id.eq.${id},player_two_id.eq.${id}`)
          .order("played_at", { ascending: true }),
        supabase.from("weekly_champions").select("id,week_start,prize_amount")
          .eq("player_id", id).order("week_start", { ascending: false }),
        supabase.from("weekly_leaderboard_archive_entries")
          .select("rank,weekly_elo").eq("player_id", id)
      ]);
      if (!active) return;
      setPlayer(profile || null);
      setRank((board || []).findIndex((p: any) => p.id === id) + 1);
      const weekly = weekBoard || [];
      setWeeklyRank(weekly.findIndex((p: any) => p.id === id) + 1);
      setWeeklyElo(weekly.find((p: any) => p.id === id)?.elo_rating ?? null);
      setMatches((games || []) as MatchRow[]);
      setChampions((wins || []) as ChampionRow[]);
      setLoading(false);
      if (!profile) return;
      void archiveRows;
    }
    load();
    return () => { active = false; };
  }, [id]);

  const elo = Number(player?.elo_rating) || 1000;
  const peak = Number(player?.highest_elo) || elo;
  const tournamentEarnings = champions.reduce((sum, row) => sum + Number(row.prize_amount || 0), 0);
  const progression = useMemo(() => {
    const values = matches.map((m) => Number(m.player_one_id === id ? m.player_one_elo_after : m.player_two_elo_after)).filter(Number.isFinite);
    const selected = range === "all" ? values : values.slice(-Number(range));
    return selected.length ? selected : [elo];
  }, [matches, id, range, elo]);
  const min = Math.min(950, ...progression) - 20;
  const max = Math.max(1050, ...progression) + 20;
  const span = max - min || 100;
  const points = progression.map((value, index) => ({
    x: 30 + (index / Math.max(1, progression.length - 1)) * 940,
    y: 165 - ((value - min) / span) * 135
  }));
  const line = points.map((point, index) => (index ? "L" : "M") + point.x + " " + point.y).join(" ");
  const area = line + ` L ${points[points.length - 1].x} 180 L ${points[0].x} 180 Z`;

  const share = async () => {
    if (!player) return;
    const text = `BASE25 PRO PLAYER CARD\n@${player.username} · ${player.player_code}\nGlobal rank: #${rank || "—"}\nELO: ${elo.toLocaleString()}\nTournament earnings: ₦${tournamentEarnings.toLocaleString("en-NG")}`;
    if (navigator.share) await navigator.share({ title: "BASE25 PRO Player Profile", text, url: window.location.href });
    else if (navigator.clipboard) await navigator.clipboard.writeText(text + "\n" + window.location.href);
  };

  if (loading) return <main className="shell"><div className="public-loading">Loading player profile…</div></main>;
  if (!player) return <main className="shell redesign-shell"><SiteNavigation /><div className="public-empty"><h1>Player not found</h1><Link href="/players">← All players</Link></div></main>;

  const weeklyChampions = champions.length;
  const opponents = Array.from(new Map(matches.map((match) => {
    const isOne = match.player_one_id === id;
    return [isOne ? match.player_two_id : match.player_one_id, isOne ? match.two : match.one] as const;
  }).filter((entry) => Boolean(entry[1])).map(([opponentKey, opponent]) => [opponentKey, opponent])).entries());
  const selectedOpponent = opponents.find(([opponentKey]) => opponentKey === opponentId) || opponents[0];
  const headToHead = selectedOpponent ? matches.filter((match) =>
    (match.player_one_id === id ? match.player_two_id : match.player_one_id) === selectedOpponent[0]
  ) : [];
  const headToHeadWins = headToHead.filter((match) => match.winner_id === id).length;
  const headToHeadLosses = headToHead.length - headToHeadWins;
  const latestMeeting = headToHead.length ? headToHead[headToHead.length - 1] : null;
  return (
    <main className="shell redesign-shell public-player-page">
      <SiteNavigation />
      <div className="public-profile">
        <header className="public-hero">
          <div className="public-hero-top">
            <span className="public-eyebrow">BASE25 PRO <i /> PLAYER PROFILE</span>
            <button type="button" className="public-share" onClick={share}>↗ <span>Share profile</span></button>
          </div>
          <div className="public-hero-main">
            <div className="public-avatar">{player.photo_url ? <img src={player.photo_url} alt={player.username} /> : player.username?.[0]?.toUpperCase()}</div>
            <div className="public-identity">
              <div className="public-player-meta"><span>{player.player_code}</span><b>ACTIVE PLAYER</b></div>
              <h1>{player.username}</h1>
              <p>BASE25 PRO competitor</p>
            </div>
            <div className="public-global-rank"><span>♛</span><strong>#{rank || "—"}</strong><small>GLOBAL RANK</small></div>
          </div>
          <div className="public-hero-bottom"><span>PUBLIC VIEW · WHAT OTHER PLAYERS SEE</span><span>BASE25 PRO</span></div>
          <div className="public-profile-actions">
            <div className="public-rank-pill"><span>♛</span><b>#{rank || "—"}</b><small>GLOBAL RANK</small></div>
            <button type="button" className="public-share-button" onClick={share}>Share</button>
          </div>
          <button type="button" className="public-matchup-toggle" onClick={() => setShowMatchup((value) => !value)}>⌁ &nbsp; Matchup calculator</button>
        </header>

        {showMatchup && <section className="public-matchup-card">
          <div className="public-section-heading"><div><small>HEAD-TO-HEAD</small><h2>Matchup calculator</h2></div><button type="button" className="public-close" onClick={() => setShowMatchup(false)}>×</button></div>
          {opponents.length ? <>
            <select aria-label="Choose opponent" value={selectedOpponent?.[0] || ""} onChange={(event) => setOpponentId(event.target.value)}>
              {opponents.map(([opponentKey, opponent]) => <option key={opponentKey} value={opponentKey}>@{opponent?.username}</option>)}
            </select>
            <div className="public-matchup-score"><div><small>YOU VS {selectedOpponent?.[1]?.username?.toUpperCase()}</small><strong>{headToHeadWins} – {headToHeadLosses}</strong><span>{latestMeeting ? "Last met " + new Date(latestMeeting.played_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " · " + (selectedOpponent?.[1]?.player_code || "") : "No previous meeting"}</span></div><div><small>MEETINGS</small><strong>{headToHead.length}</strong></div></div>
          </> : <p className="public-chart-note">No recorded opponents yet.</p>}
        </section>}

        <section className="public-rating-grid">
          <div className="public-rating-card">
            <div className="public-card-label">CAREER ELO RATING</div>
            <strong>{elo.toLocaleString()}</strong>
            <div className="public-rating-foot"><span>PEAK RATING</span><b>{peak.toLocaleString()}</b></div>
            <div className="public-rating-glow" />
          </div>
          <div className="public-week-card">
            <div className="public-card-label">THIS WEEK <span>↗</span></div>
            <strong>#{weeklyRank || "—"}</strong>
            <div className="public-rating-foot"><span>WEEKLY ELO</span><b>{(weeklyElo ?? elo).toLocaleString()}</b></div>
            <small>Weekly ranking resets every Monday</small>
          </div>
        </section>

        <section className="public-earnings-card">
          <div className="public-earnings-copy">
            <div className="public-card-label">ALL-TIME TOURNAMENT EARNINGS</div>
            <strong>₦{tournamentEarnings.toLocaleString("en-NG")}</strong>
            <span>{weeklyChampions} championship win{weeklyChampions === 1 ? "" : "s"}</span>
          </div>
          <div className="public-trophy">♛</div>
          <div className="public-win-history">
            {champions.length ? champions.slice(0, 3).map((win) => (
              <div key={win.id}><span>{new Date(win.week_start + "T00:00:00").toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</span><b>₦{Number(win.prize_amount || 0).toLocaleString("en-NG")}</b></div>
            )) : <p>No tournament winnings recorded yet.</p>}
          </div>
        </section>

        <section className="public-wager-card">
          <div className="public-wager-head"><div className="public-card-label">WAGER EARNINGS</div><span>AT BASE25</span></div>
          <strong>Wager records</strong>
          <p>Player-versus-player wager winnings and losses will appear here when wager tracking is enabled.</p>
        </section>

        <section className="public-record-grid">
          <div><strong>{player.wins ?? 0}</strong><small>Wins</small></div>
          <div><strong>{player.losses ?? 0}</strong><small>Losses</small></div>
          <div><strong>{Number(player.win_percentage ?? 0).toFixed(1)}%</strong><small>Win rate</small></div>
          <div><strong>{player.matches_played ?? matches.length}</strong><small>Matches</small></div>
        </section>

        <section className="public-section">
          <div className="public-section-heading"><div><small>CAREER MILESTONES</small><h2>Achievements</h2></div><span>PLAYER LEGACY</span></div>
          <div className="public-achievements">
            <div className="public-achievement"><i>♛</i><strong>{weeklyChampions}</strong><span>Saturday<br />Champion</span></div>
            <div className="public-achievement"><i>♜</i><strong>—</strong><span>Weekly<br />Leader</span></div>
            <div className="public-achievement"><i>★</i><strong>—</strong><span>Top 5<br />Finishes</span></div>
            <div className="public-achievement"><i>▥</i><strong>{peak.toLocaleString()}</strong><span>Peak<br />ELO</span></div>
          </div>
        </section>

        <section className="public-section">
          <div className="public-section-heading">
            <div><small>PERFORMANCE OVER TIME</small><h2>Rating history</h2></div>
            <select aria-label="Rating history range" value={range} onChange={(event) => { setRange(event.target.value); setActivePoint(null); }}>
              <option value="10">Last 10 matches</option><option value="5">Last 5 matches</option><option value="all">All matches</option>
            </select>
          </div>
          <div className="public-chart">
            <div className="public-chart-labels"><span>{Math.ceil(max).toLocaleString()}</span><span>{Math.round((max + min) / 2).toLocaleString()}</span><span>{Math.floor(min).toLocaleString()}</span></div>
            <svg viewBox="0 0 1000 190" preserveAspectRatio="none" role="img" aria-label="Player ELO rating progression">
              <defs><linearGradient id="publicEloFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b9f52d" stopOpacity=".32" /><stop offset="100%" stopColor="#b9f52d" stopOpacity="0" /></linearGradient></defs>
              {[30, 75, 120, 165].map((y) => <line key={y} x1="20" x2="980" y1={y} y2={y} stroke="#29372c" strokeDasharray="4 6" />)}
              <path d={area} fill="url(#publicEloFill)" /><path d={line} fill="none" stroke="#b9f52d" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              {points.map((point, index) => <g key={index} onClick={() => setActivePoint(activePoint === index ? null : index)} style={{ cursor: "pointer" }}><circle cx={point.x} cy={point.y} r="18" fill="transparent" /><circle cx={point.x} cy={point.y} r={activePoint === index ? 8 : 5} fill="#d4f77b" /></g>)}
            </svg>
          </div>
          {activePoint !== null && <div className="public-chart-detail">Match {activePoint + 1}<b>{progression[activePoint].toLocaleString()} ELO</b></div>}
          <div className="public-chart-note">Your rating changes as recorded matches are completed.</div>
        </section>

        <section className="public-section public-recent-section">
          <div className="public-section-heading"><div><small>HEAD-TO-HEAD</small><h2>Recent matches</h2></div><Link href="/matches">View all →</Link></div>
          {matches.length ? <div className="public-match-list">{[...matches].reverse().slice(0, 8).map((match) => {
            const isOne = match.player_one_id === id;
            const opponent = isOne ? match.two : match.one;
            const won = match.winner_id === id;
            const before = Number(isOne ? match.player_one_elo_before : match.player_two_elo_before);
            const after = Number(isOne ? match.player_one_elo_after : match.player_two_elo_after);
            const delta = Number.isFinite(before) && Number.isFinite(after) ? after - before : 0;
            return <Link href={"/matches/" + match.id} key={match.id} className="public-match-row">
              <b className={won ? "public-result-win" : "public-result-loss"}>{won ? "W" : "L"}</b>
              <span className="public-match-opponent"><strong>vs {opponent?.username || "Opponent"}</strong><small>{opponent?.player_code || "BASE25"} · {new Date(match.played_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</small></span>
              <span className="public-match-score">{isOne ? match.player_one_score : match.player_two_score} – {isOne ? match.player_two_score : match.player_one_score}<small className={delta >= 0 ? "public-delta-up" : "public-delta-down"}>{delta > 0 ? "+" : ""}{delta} ELO</small></span>
            </Link>;
          })}</div> : <p className="public-chart-note">No recorded matches yet.</p>}
        </section>
        <footer className="public-profile-footer"><span>BASE25 PRO</span><span>THE TABLE REMEMBERS.</span><Link href="/players">Explore players →</Link></footer>
      </div>
      <style jsx>{`
        .public-profile{width:100%;max-width:780px;margin:22px auto 110px;min-width:0;color:#f3f5ef}
        .public-profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;z-index:1;margin-top:8px}
        .public-rank-pill{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid #354a32;border-radius:13px;background:#0b150e}.public-rank-pill span{font-size:19px;color:#e8cb36}.public-rank-pill b{font:900 18px monospace;color:#e8cb36}.public-rank-pill small{font:700 8px monospace;letter-spacing:.1em;color:#8f9c88}
        .public-share-button{border:1px solid #b9f52d;border-radius:13px;background:#0b150e;color:#c5f36a;font-weight:800;font-size:13px;cursor:pointer}
        .public-matchup-toggle{position:relative;z-index:1;width:100%;margin-top:10px;padding:14px;border:1px solid #b9f52d;border-radius:13px;background:#c5f36a;color:#10180d;font-weight:900;font-size:14px;cursor:pointer}
        .public-matchup-card{margin:14px 0;padding:17px;border:1px solid #355b3b;border-radius:16px;background:#0d1b12}.public-matchup-card select{width:100%;padding:10px;border-radius:9px;background:#101b13;color:#f2f6ed;border:1px solid #435b43}.public-matchup-score{display:flex;justify-content:space-between;gap:14px;margin-top:16px}.public-matchup-score>div{display:grid;gap:5px}.public-matchup-score small{font:700 9px monospace;letter-spacing:.12em;color:#b9f36b}.public-matchup-score strong{font:900 28px monospace}.public-matchup-score span{font-size:11px;color:#9aa796}.public-close{border:0;background:transparent;color:#c5f36a;font-size:22px}
        .public-wager-card{margin:14px 0;padding:17px 19px;border:1px solid #355d3e;border-radius:16px;background:linear-gradient(120deg,#11291a,#0b160f)}.public-wager-head{display:flex;align-items:center;justify-content:space-between}.public-wager-head>span{font:700 9px monospace;color:#c5f36a;border:1px solid #386542;border-radius:20px;padding:5px 9px}.public-wager-card>strong{display:block;margin:14px 0 5px;font-size:22px;color:#d0f77b}.public-wager-card p{margin:0;color:#a7b4a1;font-size:11px;line-height:1.5}
        .public-recent-section{margin-top:15px}.public-recent-section .public-section-heading>a{color:#c5f36a;font-size:12px;font-weight:800;text-decoration:none;white-space:nowrap}.public-match-list{display:grid}.public-match-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px 0;border-top:1px solid #ffffff14;text-decoration:none;color:#f3f5ef}.public-result-win,.public-result-loss{width:31px;height:31px;display:grid;place-items:center;border-radius:9px;font:900 13px monospace}.public-result-win{background:#c5f36a;color:#14200f}.public-result-loss{background:#552d31;color:#ffb2b2}.public-match-opponent{display:grid;gap:4px;min-width:0}.public-match-opponent strong{font-size:13px}.public-match-opponent small{font:9px monospace;color:#82907f}.public-match-score{text-align:right;font:800 15px monospace}.public-match-score small{display:block;font:700 10px monospace;margin-top:4px}.public-delta-up{color:#c5f36a}.public-delta-down{color:#f29a9a}
        .public-hero{position:relative;overflow:hidden;padding:22px 24px 17px;border:1px solid #3c5934;border-radius:20px;background:radial-gradient(ellipse at 78% 5%,#526b2b 0%,#1a321e 27%,transparent 62%),linear-gradient(145deg,#102117,#07100b 75%);box-shadow:inset 0 0 55px #a9e83b0b}
        .public-hero:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#050a0740,transparent 45%,#050a0780);pointer-events:none}
        .public-hero-top,.public-hero-main,.public-hero-bottom{position:relative;z-index:1}
        .public-hero-top{display:flex;justify-content:space-between;align-items:center;gap:12px}
        .public-eyebrow,.public-card-label,.public-section-heading small{font:700 10px monospace;letter-spacing:.15em;color:#c5f36a}
        .public-eyebrow i{display:inline-block;width:4px;height:4px;border-radius:50%;background:#c5f36a;vertical-align:middle;margin:0 8px}
        .public-share{border:1px solid #597644;border-radius:30px;background:#0a150dd9;color:#eef4e8;padding:9px 13px;font-size:12px;font-weight:700;cursor:pointer}
        .public-hero-main{display:grid;grid-template-columns:112px minmax(0,1fr) 112px;align-items:center;gap:18px;margin:30px 0 24px}
        .public-avatar{width:108px;height:108px;border:4px solid #b9f52d;border-radius:50%;background:#1a2c1c;display:grid;place-items:center;overflow:hidden;color:#d4f77b;font-size:38px;font-weight:900;box-shadow:0 0 25px #b9f52d44}
        .public-avatar img{width:100%;height:100%;object-fit:cover}
        .public-player-meta{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.public-player-meta span{font:11px monospace;color:#c2cdbb}.public-player-meta b{font:700 9px monospace;color:#c5f36a;border:1px solid #527b2d;background:#14220f;border-radius:20px;padding:5px 8px;letter-spacing:.08em}
        .public-identity h1{font-size:clamp(28px,5vw,42px);line-height:1.1;letter-spacing:-.04em;margin:10px 0 5px;overflow-wrap:anywhere}.public-identity p{margin:0;color:#b9c5b3;font-size:13px}
        .public-global-rank{border-left:1px solid #627257;display:grid;justify-items:center;align-content:center;min-height:100px;color:#e9cf4a}.public-global-rank span{font-size:27px}.public-global-rank strong{font:900 34px monospace}.public-global-rank small{font:700 9px monospace;letter-spacing:.12em;color:#d5ddce}
        .public-hero-bottom{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #ffffff17;padding-top:12px;font:700 9px monospace;letter-spacing:.12em;color:#8e9b88}
        .public-rating-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:13px;margin:14px 0}
        .public-rating-card,.public-week-card{position:relative;overflow:hidden;min-height:158px;padding:18px 20px;border:1px solid #456b35;border-radius:16px;background:linear-gradient(135deg,#14251a,#09120d)}
        .public-rating-card strong{display:block;position:relative;z-index:1;font:900 clamp(40px,8vw,55px) monospace;color:#c5f36a;letter-spacing:-.07em;margin:12px 0 15px}
        .public-rating-glow{position:absolute;width:170px;height:170px;right:-40px;top:10px;border-radius:50%;background:#b9f52d12;filter:blur(28px)}
        .public-rating-foot{display:flex;justify-content:space-between;gap:10px;border-top:1px solid #ffffff17;padding-top:10px;font:10px monospace;color:#aab8a4}.public-rating-foot b{color:#e6efdc}
        .public-week-card{border-color:#4d5331;background:linear-gradient(135deg,#252517,#11160d)}.public-week-card .public-card-label{display:flex;justify-content:space-between}.public-week-card .public-card-label span{color:#e8ce4b}.public-week-card>strong{display:block;font:900 42px monospace;color:#f0d34a;margin:8px 0 5px}.public-week-card>small{display:block;color:#889582;font-size:9px;margin-top:9px}
        .public-earnings-card{display:grid;grid-template-columns:minmax(0,1fr) 55px minmax(160px,.8fr);align-items:center;gap:15px;margin:14px 0;padding:19px 21px;border:1px solid #8b7134;border-radius:16px;background:radial-gradient(ellipse at 80% 50%,#526a231b,transparent 45%),linear-gradient(110deg,#1b1b12,#0b120d);box-shadow:inset 0 0 28px #d7ae350b}
        .public-earnings-copy{display:grid;gap:6px}.public-earnings-copy .public-card-label{color:#e7c65d}.public-earnings-copy strong{font:900 clamp(26px,5vw,37px) monospace;color:#c5f36a}.public-earnings-copy>span{font-size:11px;color:#aab7a4}.public-trophy{font-size:42px;text-align:center;color:#e8c947;text-shadow:0 0 22px #e8c94755}.public-win-history{display:grid;gap:7px}.public-win-history div{display:flex;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid #ffffff14;font:9px monospace;color:#aab7a4}.public-win-history b{color:#c5f36a;white-space:nowrap}.public-win-history p{font-size:10px;color:#8d9988;margin:0}
        .public-record-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border:1px solid #2c4b36;border-radius:15px;background:#0b1711;padding:15px 4px}.public-record-grid>div{display:grid;justify-items:center;gap:6px;border-right:1px solid #344537}.public-record-grid>div:last-child{border:0}.public-record-grid small{font:700 9px monospace;color:#c0cbbc;letter-spacing:.07em}.public-record-grid strong{font:800 26px monospace;color:#f3f5ef}
        .public-section{margin-top:15px;padding:19px;border:1px solid #35513b;border-radius:17px;background:linear-gradient(145deg,#0e1a12,#09110c);min-width:0}.public-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:17px}.public-section-heading h2{font-size:22px;line-height:1.15;margin:6px 0 0;letter-spacing:-.02em}.public-section-heading>span{font:700 9px monospace;color:#82917d;letter-spacing:.1em}.public-section-heading select{max-width:150px;background:#0b140e;color:#f2f6ed;border:1px solid #52644b;border-radius:9px;padding:9px 10px;font-size:11px}
        .public-achievements{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.public-achievement{min-height:112px;padding:13px 7px;border:1px solid #344833;border-radius:12px;background:linear-gradient(145deg,#172419,#0b130d);display:grid;justify-items:center;align-content:center;gap:4px;text-align:center}.public-achievement i{font-style:normal;font-size:20px;color:#e7cb4a}.public-achievement strong{font:800 20px monospace;color:#d5f27c}.public-achievement span{font-size:10px;line-height:1.3;color:#aab7a4}
        .public-chart{position:relative;display:grid;grid-template-columns:42px 1fr;gap:5px;min-height:170px}.public-chart-labels{display:flex;flex-direction:column;justify-content:space-between;padding:0 0 8px;font:9px monospace;color:#839080}.public-chart svg{width:100%;height:170px;overflow:visible}.public-chart-detail{display:flex;justify-content:space-between;padding:10px 12px;border:1px solid #3b5631;border-radius:9px;background:#101d13;color:#aab7a4;font-size:11px}.public-chart-detail b{color:#c5f36a;font-family:monospace}.public-chart-note{margin-top:8px;color:#778574;font-size:10px}
        .public-profile-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px;padding:14px 3px;color:#72806e;font:700 9px monospace;letter-spacing:.1em}.public-profile-footer a{color:#c5f36a;text-decoration:none}
        .public-loading,.public-empty{max-width:780px;margin:60px auto;color:#dce5d6}.public-empty h1{margin-bottom:15px}
        @media(max-width:560px){.public-profile{margin:12px auto 90px}.public-hero{padding:17px 15px 14px;border-radius:16px}.public-hero-main{grid-template-columns:76px minmax(0,1fr) 72px;gap:11px;margin:24px 0 18px}.public-avatar{width:74px;height:74px;border-width:3px;font-size:28px}.public-identity h1{font-size:25px;margin:8px 0 4px}.public-player-meta{gap:5px}.public-player-meta span{font-size:9px}.public-player-meta b{font-size:8px;padding:4px 6px}.public-global-rank{min-height:78px}.public-global-rank span{font-size:20px}.public-global-rank strong{font-size:25px}.public-global-rank small{font-size:7px}.public-hero-bottom{font-size:7px}.public-share{padding:8px 10px}.public-share span{display:none}.public-rating-grid{gap:8px}.public-rating-card,.public-week-card{padding:14px 12px;min-height:145px}.public-rating-card strong{font-size:36px;margin:14px 0}.public-week-card>strong{font-size:35px}.public-card-label{font-size:8px}.public-earnings-card{grid-template-columns:minmax(0,1fr) 32px;gap:8px;padding:16px 13px}.public-trophy{font-size:29px}.public-win-history{grid-column:1/-1;border-top:1px solid #ffffff15;padding-top:9px}.public-record-grid{padding:13px 2px}.public-record-grid small{font-size:7px}.public-record-grid strong{font-size:22px}.public-section{padding:15px 12px}.public-section-heading h2{font-size:19px}.public-section-heading small{font-size:8px}.public-achievements{gap:6px}.public-achievement{min-height:100px;padding:10px 3px}.public-achievement span{font-size:9px}.public-achievement strong{font-size:17px}.public-profile-footer{font-size:7px}.public-match-row{gap:8px}.public-match-opponent strong{font-size:11px}.public-match-score{font-size:13px}.public-matchup-score strong{font-size:23px}.public-chart{grid-template-columns:32px 1fr}}
      `}</style>
    </main>
  );
}
