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
  one?: { username: string; player_code: string; designation: "regular" | "boardman" | "house_ghost" } | { username: string; player_code: string; designation: "regular" | "boardman" | "house_ghost" }[] | null;
  two?: { username: string; player_code: string; designation: "regular" | "boardman" | "house_ghost" } | { username: string; player_code: string; designation: "regular" | "boardman" | "house_ghost" }[] | null;
};

type ChampionRow = { id: string; week_start: string; prize_amount: number };

function relationPlayer(value: MatchRow["one"] | MatchRow["two"]) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default function PublicPlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [rank, setRank] = useState(0);
  const [weeklyRank, setWeeklyRank] = useState(0);
  const [weeklyElo, setWeeklyElo] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [champions, setChampions] = useState<ChampionRow[]>([]);
  const [wagerWinnings, setWagerWinnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("10");
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const [showMatchup, setShowMatchup] = useState(false);
  const [viewer, setViewer] = useState<any>(null);
  const [matchupLoading, setMatchupLoading] = useState(false);
  const [matchupError, setMatchupError] = useState("");
  const [viewerMatchCount, setViewerMatchCount] = useState(0);
  const [targetMatchCount, setTargetMatchCount] = useState(0);
  const [matchupReady, setMatchupReady] = useState(false);
  const [matchupFormat, setMatchupFormat] = useState<"One rack" | "Best of 3">("One rack");
  const [matchupCalculated, setMatchupCalculated] = useState(false);

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
        { data: archiveRows },
        { data: wagerTotal }
      ] = await Promise.all([
        supabase.from("player_public_leaderboard")
          .select("id,username,player_code,photo_url,elo_rating,highest_elo,matches_played,wins,losses,win_percentage,designation")
          .eq("id", id).single(),
        supabase.from("player_public_leaderboard").select("id,elo_rating").order("elo_rating", { ascending: false }),
        supabase.rpc("get_period_leaderboard", { p_period: "this_week" }),
        supabase.from("matches")
          .select("id,played_at,player_one_id,player_two_id,winner_id,player_one_score,player_two_score,player_one_elo_before,player_two_elo_before,player_one_elo_after,player_two_elo_after,one:players!matches_player_one_id_fkey(username,player_code,designation),two:players!matches_player_two_id_fkey(username,player_code,designation)")
          .or(`player_one_id.eq.${id},player_two_id.eq.${id}`)
          .order("played_at", { ascending: true }),
        supabase.from("weekly_champions").select("id,week_start,prize_amount")
          .eq("player_id", id).order("week_start", { ascending: false }),
        supabase.from("weekly_leaderboard_archive_entries")
          .select("rank,weekly_elo").eq("player_id", id),
        supabase.rpc("get_player_wager_winnings", { p_player_id: id })
      ]);
      if (!active) return;
      setPlayer(profile || null);
      setRank((board || []).findIndex((p: any) => p.id === id) + 1);
      const weekly = weekBoard || [];
      setWeeklyRank(weekly.findIndex((p: any) => p.id === id) + 1);
      setWeeklyElo(weekly.find((p: any) => p.id === id)?.elo_rating ?? null);
      setMatches((games || []) as MatchRow[]);
      setChampions((wins || []) as ChampionRow[]);
      setWagerWinnings(Number(wagerTotal || 0));
      setLoading(false);
      if (!profile) return;
      void archiveRows;
    }
    load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!supabase || !id) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (!active || !session) return;
      await loadMutualMatchup(false);
    })();
    return () => { active = false; };
  }, [id]);

  const elo = Number(player?.elo_rating) || 1000;
  const peak = Number(player?.highest_elo) || elo;
  const tournamentEarnings = champions.reduce((sum, row) => sum + Number(row.prize_amount || 0), 0);
  const matchupK = viewerMatchCount >= 10 && targetMatchCount >= 10 ? 24 : 40;
  const matchupExpected = viewer ? 1 / (1 + Math.pow(10, (elo - Number(viewer.elo_rating || 0)) / 400)) : 0;
  const matchupWinChance = Math.round(matchupExpected * 100);
  const matchupLossChance = 100 - matchupWinChance;
  const matchupWinPoints = viewer ? Math.round(matchupK * (1 - matchupExpected)) : 0;
  const targetWinExpected = viewer ? 1 - matchupExpected : 0;
  const targetWinPoints = viewer ? Math.round(matchupK * (1 - targetWinExpected)) : 0;
  const matchupRatingGap = viewer ? Number(viewer.elo_rating || 0) - elo : 0;
  const mutualMatches = viewer ? matches.filter((match) =>
    (match.player_one_id === viewer.id && match.player_two_id === id) ||
    (match.player_two_id === viewer.id && match.player_one_id === id)
  ) : [];
  const mutualWins = viewer ? mutualMatches.filter((match) => match.winner_id === viewer.id).length : 0;
  const mutualLosses = mutualMatches.length - mutualWins;
  const lastMutualMatch = mutualMatches.length ? mutualMatches[mutualMatches.length - 1] : null;
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

  const loadMutualMatchup = async (showResult = true) => {
    if (!supabase) return;
    if (showResult) setShowMatchup(true);
    setMatchupError("");
    setMatchupLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setViewer(null);
      setMatchupReady(false);
      setMatchupLoading(false);
      setMatchupError("Log in to see your odds and rating gap against this player.");
      return;
    }
    const { data: mine, error } = await supabase.rpc("get_my_base25_player_profile");
    const own = Array.isArray(mine) ? mine[0] : mine;
    if (error || !own?.id) {
      setViewer(null);
      setMatchupReady(false);
      setMatchupLoading(false);
      setMatchupError("Your login is not linked to a BASE25 player profile yet.");
      return;
    }
    if (own.id === id) {
      setViewer(null);
      setMatchupReady(false);
      setMatchupLoading(false);
      setMatchupError("This comparison is available when viewing another player's profile.");
      return;
    }
    const [{ data: ownProfile, error: ownError }, { data: allMatches, error: countError }] = await Promise.all([
      supabase.from("player_public_leaderboard").select("id,username,player_code,elo_rating").eq("id", own.id).single(),
      supabase.from("matches").select("player_one_id,player_two_id")
    ]);
    if (ownError || countError || !ownProfile) {
      setMatchupReady(false);
      setMatchupLoading(false);
      setMatchupError("We couldn't load the ratings needed for this comparison.");
      return;
    }
    const rows = allMatches || [];
    const ownCount = rows.filter((m: any) => m.player_one_id === own.id || m.player_two_id === own.id).length;
    const targetCount = rows.filter((m: any) => m.player_one_id === id || m.player_two_id === id).length;
    setViewer(ownProfile);
    setViewerMatchCount(ownCount);
    setTargetMatchCount(targetCount);
    setMatchupReady(true);
    setMatchupLoading(false);
  };

  const openMatchup = () => {
    setMatchupCalculated(false);
    void loadMutualMatchup(true);
  };

  const share = async () => {
    if (!player) return;
    const text = `BASE25 PRO PLAYER CARD\n@${player.username} · ${player.player_code}\nGlobal rank: #${rank || "—"}\nELO: ${elo.toLocaleString()}\nTournament earnings: ₦${tournamentEarnings.toLocaleString("en-NG")}`;
    if (navigator.share) await navigator.share({ title: "BASE25 PRO Player Profile", text, url: window.location.href });
    else if (navigator.clipboard) await navigator.clipboard.writeText(text + "\n" + window.location.href);
  };

  if (loading) return <main className="shell"><div className="public-loading">Loading player profile…</div></main>;
  if (!player) return <main className="shell redesign-shell"><SiteNavigation /><div className="public-empty"><h1>Player not found</h1><Link href="/players">← All players</Link></div></main>;

  const weeklyChampions = champions.length;
  const boardmanSlayerWins = matches.filter((match) => {
    if (match.winner_id !== id) return false;
    const opponent = relationPlayer(match.player_one_id === id ? match.two : match.one);
    return opponent?.designation === "boardman";
  }).length;

  return (
    <main className="shell redesign-shell public-player-page">
      <SiteNavigation />
      <div className="public-profile">
        <header className="public-hero">
          <div className="public-hero-top"><Link href="/players" className="public-back" aria-label="Back to players">←</Link><span className="public-page-title">Player profile</span><button type="button" className="public-more" aria-label="More options">•••</button></div><div className="public-view-label">◉ &nbsp; Public view · what other players see</div>
          <div className="public-hero-main">
            <div className="public-avatar">{player.photo_url ? <img src={player.photo_url} alt={player.username} /> : player.username?.[0]?.toUpperCase()}</div>
            <div className="public-identity">
              <div className="public-player-meta"><span>{player.player_code}</span><b>COMPETITIVE</b></div><h1>{player.username} <i className="public-verified">✓</i></h1>{player.designation === "boardman" ? <span className="player-designation-tag boardman-tag">BOARDMAN 💀</span> : player.designation === "house_ghost" ? <span className="player-designation-tag ghost-tag">HOUSE GHOSTS 👻</span> : null}<p>“Play smart. Clear tables.”</p></div>
          </div>
          <div className="public-profile-actions"><div className="public-rank-pill"><span>👑</span><b>#{rank || "—"}</b><small>GLOBAL RANK</small></div><button type="button" className="public-share-button" onClick={share}>Share</button></div><button type="button" className="public-matchup-toggle" onClick={openMatchup}>▥ &nbsp; Matchup calculator</button>
        </header>

        {viewer && matchupReady && <section className="public-mutual-card">
          <div className="public-mutual-title">YOU VS {player.username?.toUpperCase()}</div>
          <div className="public-mutual-body">
            <div className="public-mutual-record"><strong>{mutualWins} – {mutualLosses}</strong><span>{lastMutualMatch ? "Last met " + new Date(lastMutualMatch.played_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) + " · " + (viewer.id === lastMutualMatch.player_one_id ? (relationPlayer(lastMutualMatch.two)?.player_code || "") : (relationPlayer(lastMutualMatch.one)?.player_code || "")) : "No previous meeting"}</span></div>
            <div className="public-mutual-gap"><small>RATING GAP</small><strong>{matchupRatingGap > 0 ? "+" : ""}{matchupRatingGap}</strong></div>
          </div>
        </section>}

        {showMatchup && matchupError && <section className="public-login-inline">
          <div className="public-login-inline-head"><strong>Login required</strong><button type="button" onClick={() => setShowMatchup(false)} aria-label="Close login notice">×</button></div>
          <p>Log in to see your odds and rating gap against this player.</p>
          <Link href="/login">Log in first →</Link>
        </section>}

        {showMatchup && !matchupError && <div className="public-calculator-overlay" role="dialog" aria-modal="true" aria-label="Matchup calculator">
          <section className="public-calculator-modal">
            <div className="public-calculator-header"><button type="button" onClick={() => setShowMatchup(false)} aria-label="Close calculator">←</button><div><h2>Matchup calculator</h2><p>See the odds before you play</p></div></div>
            {matchupLoading ? <p className="public-chart-note">Loading your matchup…</p> : viewer && matchupReady ? <>
              <div className="public-calc-step">1. Choose two players</div>
              <div className="public-calc-players">
                <div className="public-calc-player"><div className="public-calc-avatar">{viewer.username?.[0]?.toUpperCase()}</div><strong>{viewer.username}</strong><small>{Number(viewer.elo_rating).toLocaleString()} rating</small><span>YOU</span></div>
                <div className="public-calc-vs">VS</div>
                <div className="public-calc-player"><div className="public-calc-avatar">{player.username?.[0]?.toUpperCase()}</div><strong>{player.username}</strong><small>{elo.toLocaleString()} rating</small><span>PROFILE</span></div>
              </div>
              <div className="public-calc-step">2. Format</div>
              <div className="public-calc-formats"><button type="button" className={matchupFormat === "One rack" ? "selected" : ""} onClick={() => {setMatchupFormat("One rack");setMatchupCalculated(false);}}>One rack</button><button type="button" className={matchupFormat === "Best of 3" ? "selected" : ""} onClick={() => {setMatchupFormat("Best of 3");setMatchupCalculated(false);}}>Best of 3</button></div>
              <button type="button" className="public-calc-button" onClick={() => setMatchupCalculated(true)}>▦ &nbsp; Calculate</button>
              {matchupCalculated && <div className="public-calc-results">
                <div className="public-calc-divider" /><div className="public-calc-label">Win chance</div>
                <div className="public-calc-probs"><div><b>{viewer.username}</b><strong>{matchupWinChance}%</strong></div><div><b>{player.username}</b><strong>{matchupLossChance}%</strong></div></div>
                <div className="public-calc-bar"><i style={{width: matchupWinChance + "%"}} /></div>
                <p className="public-calc-favourite">{matchupWinChance >= matchupLossChance ? viewer.username : player.username} is the slight favourite.</p>
                <div className="public-calc-label public-calc-points-label">Rating points at stake</div>
                <div className="public-calc-stakes"><div><small>If {viewer.username} wins</small><strong>+{matchupWinPoints} points</strong><em>{player.username} −{matchupWinPoints}</em></div><div><small>If {player.username} wins</small><strong>+{targetWinPoints} points</strong><em>{viewer.username} −{targetWinPoints}</em></div></div>
                <p className="public-calc-foot">Based on current ratings. Beating a higher-rated player earns more points, so upsets pay more.</p>
                <p className="public-calc-disclaimer">Estimate uses BASE25's current K-factor ({matchupK}). Actual match ratings also include rack-margin bonuses, so the final change may differ. This calculator does not save a match or change ratings.</p>
              </div>}
            </> : null}
          </section>
        </div>}

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
          <div className="public-wager-head"><div className="public-card-label">WAGER WINNINGS</div><span>AT BASE25</span></div>
          <strong>+₦{wagerWinnings.toLocaleString("en-NG")}</strong>
          <p>Confirmed player-versus-player wager winnings. Lost stakes are private by default.</p>
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
            <div className="public-achievement boardman-slayer-achievement"><i>⚔️</i><strong>{boardmanSlayerWins || "—"}</strong><span>Boardman<br />Slayer{boardmanSlayerWins === 1 ? "" : "s"}</span></div>
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
          <div className="public-section-heading"><div><small>HEAD-TO-HEAD</small><h2>Recent matches</h2></div><Link href={`/matches?player=${id}`}>View all →</Link></div>
          {matches.length ? <div className="public-match-list">{[...matches].reverse().slice(0, 8).map((match) => {
            const isOne = match.player_one_id === id;
            const opponent = relationPlayer(isOne ? match.two : match.one);
            const won = match.winner_id === id;
            const before = Number(isOne ? match.player_one_elo_before : match.player_two_elo_before);
            const after = Number(isOne ? match.player_one_elo_after : match.player_two_elo_after);
            const delta = Number.isFinite(before) && Number.isFinite(after) ? after - before : 0;
            return <Link href={"/matches/" + match.id} key={match.id} className="public-match-row">
              <b className={won ? "public-result-win" : "public-result-loss"}>{won ? "W" : "L"}</b>
              <span className="public-match-opponent"><strong>{player.username} vs {opponent?.username || "Unknown Player"}</strong>{opponent?.designation === "boardman" ? <em className="public-match-inline-tag boardman-tag">BOARDMAN 💀</em> : opponent?.designation === "house_ghost" ? <em className="public-match-inline-tag ghost-tag">HOUSE GHOSTS 👻</em> : null}<small>{opponent?.player_code || "BASE25"} · {new Date(match.played_at).toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</small></span>
              <span className="public-match-score">{isOne ? match.player_one_score : match.player_two_score} – {isOne ? match.player_two_score : match.player_one_score}<small className={delta >= 0 ? "public-delta-up" : "public-delta-down"}>{delta > 0 ? "+" : ""}{delta} ELO</small></span>
            </Link>;
          })}</div> : <p className="public-chart-note">No recorded matches yet.</p>}
        </section>
        <footer className="public-profile-footer"><span>BASE25 PRO</span><span>THE TABLE REMEMBERS.</span><Link href="/players">Explore players →</Link></footer>
      </div>
      <style jsx>{`
        .player-designation-tag{display:inline-flex;align-items:center;width:max-content;margin-top:8px;padding:5px 9px;border:1px solid #ffffff24;border-radius:999px;font:800 9px monospace;letter-spacing:.08em}.boardman-tag{background:#3b2d12;color:#ffd36a;border-color:#b8892e}.ghost-tag{background:#24163b;color:#d7b5ff;border-color:#8054b8}.public-profile{width:100%;max-width:780px;margin:22px auto 110px;min-width:0;color:#f3f5ef}
        .public-hero-top{display:grid;grid-template-columns:50px 1fr 50px;align-items:center}.public-back,.public-more{height:48px;width:50px;display:grid;place-items:center;border:1px solid #273b2b;border-radius:14px;background:#09110d;color:#f2f6ef;text-decoration:none;font-size:24px}.public-more{font-size:16px;letter-spacing:2px}.public-page-title{text-align:center;font-size:17px;font-weight:800}.public-view-label{text-align:center;margin-top:14px;color:#9da99a;font-size:12px}.public-hero-main{grid-template-columns:108px minmax(0,1fr);margin:22px 0 18px}.public-identity h1{font-size:clamp(25px,5vw,34px)}.public-identity p{font-style:italic}.public-verified{display:inline-grid;place-items:center;width:21px;height:21px;border-radius:50%;background:#c5f36a;color:#0b150d;font-style:normal;font-size:13px;vertical-align:middle}.public-profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;z-index:1;margin-top:8px}
        .public-rank-pill{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid #354a32;border-radius:13px;background:#0b150e}.public-rank-pill span{font-size:19px;color:#e8cb36}.public-rank-pill b{font:900 18px monospace;color:#e8cb36}.public-rank-pill small{font:700 8px monospace;letter-spacing:.1em;color:#8f9c88}
        .public-share-button{border:1px solid #b9f52d;border-radius:13px;background:#0b150e;color:#c5f36a;font-weight:800;font-size:13px;cursor:pointer}
        .public-matchup-toggle{position:relative;z-index:1;width:100%;margin-top:10px;padding:14px;border:1px solid #b9f52d;border-radius:13px;background:#c5f36a;color:#10180d;font-weight:900;font-size:14px;cursor:pointer}
        .public-matchup-card{margin:14px 0;padding:17px;border:1px solid #355b3b;border-radius:16px;background:#0d1b12}.public-login-prompt{display:grid;gap:7px}.public-login-prompt strong{color:#c5f36a}.public-login-prompt p{margin:0;color:#aab7a4;font-size:12px}.public-login-prompt a{color:#c5f36a;font-weight:800;text-decoration:none;font-size:12px}.public-gap{color:#e9c84b}
        .public-profile-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;position:relative;z-index:1;margin-top:8px}
        .public-rank-pill{display:flex;align-items:center;gap:9px;padding:11px 13px;border:1px solid #354a32;border-radius:13px;background:#0b150e}.public-rank-pill span{font-size:19px;color:#e8cb36}.public-rank-pill b{font:900 18px monospace;color:#e8cb36}.public-rank-pill small{font:700 8px monospace;letter-spacing:.1em;color:#8f9c88}
        .public-share-button{border:1px solid #b9f52d;border-radius:13px;background:#0b150e;color:#c5f36a;font-weight:800;font-size:13px;cursor:pointer}
        .public-matchup-toggle{position:relative;z-index:1;width:100%;margin-top:10px;padding:14px;border:1px solid #b9f52d;border-radius:13px;background:#c5f36a;color:#10180d;font-weight:900;font-size:14px;cursor:pointer}
        .public-matchup-card{margin:14px 0;padding:17px;border:1px solid #355b3b;border-radius:16px;background:#0d1b12}.public-matchup-card select{width:100%;padding:10px;border-radius:9px;background:#101b13;color:#f2f6ed;border:1px solid #435b43}.public-matchup-score{display:flex;justify-content:space-between;gap:14px;margin-top:16px}.public-matchup-score>div{display:grid;gap:5px}.public-matchup-score small{font:700 9px monospace;letter-spacing:.12em;color:#b9f36b}.public-matchup-score strong{font:900 28px monospace}.public-matchup-score span{font-size:11px;color:#9aa796}.public-close{border:0;background:transparent;color:#c5f36a;font-size:22px}
        .public-wager-card{margin:14px 0;padding:17px 19px;border:1px solid #355d3e;border-radius:16px;background:linear-gradient(120deg,#11291a,#0b160f)}.public-wager-head{display:flex;align-items:center;justify-content:space-between}.public-wager-head>span{font:700 9px monospace;color:#c5f36a;border:1px solid #386542;border-radius:20px;padding:5px 9px}.public-wager-card>strong{display:block;margin:14px 0 5px;font-size:22px;color:#d0f77b}.public-wager-card p{margin:0;color:#a7b4a1;font-size:11px;line-height:1.5}
        .public-recent-section{margin-top:15px}.public-recent-section .public-section-heading>a{color:#c5f36a;font-size:12px;font-weight:800;text-decoration:none;white-space:nowrap}.public-match-list{display:grid}.public-match-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:11px;padding:13px 0;border-top:1px solid #ffffff14;text-decoration:none;color:#f3f5ef}.public-result-win,.public-result-loss{width:31px;height:31px;display:grid;place-items:center;border-radius:9px;font:900 13px monospace}.public-result-win{background:#c5f36a;color:#14200f}.public-result-loss{background:#552d31;color:#ffb2b2}.public-match-opponent{display:grid;gap:4px;min-width:0}.public-match-opponent strong{font-size:13px}.public-match-inline-tag{display:inline-flex;align-items:center;width:max-content;padding:3px 7px;border:1px solid #ffffff24;border-radius:999px;font:800 8px monospace;font-style:normal;letter-spacing:.04em}.public-match-inline-tag.boardman-tag{background:#3b2d12;color:#ffd36a;border-color:#b8892e}.public-match-inline-tag.ghost-tag{background:#24163b;color:#d7b5ff;border-color:#8054b8}.public-match-opponent small{font:9px monospace;color:#82907f}.public-match-score{text-align:right;font:800 15px monospace}.public-match-score small{display:block;font:700 10px monospace;margin-top:4px}.public-delta-up{color:#c5f36a}.public-delta-down{color:#f29a9a}
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
        @media(max-width:560px){.public-profile{margin:12px auto 90px}.public-hero{padding:17px 15px 14px;border-radius:16px}.public-hero-main{grid-template-columns:76px minmax(0,1fr);gap:11px;margin:24px 0 18px}.public-avatar{width:74px;height:74px;border-width:3px;font-size:28px}.public-identity h1{font-size:25px;margin:8px 0 4px}.public-player-meta{gap:5px}.public-player-meta span{font-size:9px}.public-player-meta b{font-size:8px;padding:4px 6px}.public-global-rank{display:none}.public-back,.public-more{height:44px;width:44px}.public-page-title{font-size:16px}.public-rating-grid{gap:8px}.public-rating-card,.public-week-card{padding:14px 12px;min-height:145px}.public-rating-card strong{font-size:36px;margin:14px 0}.public-week-card>strong{font-size:35px}.public-card-label{font-size:8px}.public-earnings-card{grid-template-columns:minmax(0,1fr) 32px;gap:8px;padding:16px 13px}.public-trophy{font-size:29px}.public-win-history{grid-column:1/-1;border-top:1px solid #ffffff15;padding-top:9px}.public-record-grid{padding:13px 2px}.public-record-grid small{font-size:7px}.public-record-grid strong{font-size:22px}.public-section{padding:15px 12px}.public-section-heading h2{font-size:19px}.public-section-heading small{font-size:8px}.public-achievements{gap:6px}.public-achievement{min-height:100px;padding:10px 3px}.public-achievement span{font-size:9px}.public-achievement strong{font-size:17px}.public-profile-footer{font-size:7px}.public-match-row{gap:8px}.public-match-opponent strong{font-size:11px}.public-match-score{font-size:13px}.public-matchup-score strong{font-size:23px}.public-chart{grid-template-columns:32px 1fr}}



        .public-login-inline{margin:10px 0 13px;padding:13px 15px;border:1px solid #315a3d;border-radius:15px;background:#0d1a12;color:#f2f5ed}
        .public-login-inline-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
        .public-login-inline-head strong{font-size:14px;color:#c5f36a}
        .public-login-inline-head button{width:27px;height:27px;border:1px solid #304237;border-radius:8px;background:#111914;color:#dce7dc;font-size:18px}
        .public-login-inline p{margin:6px 0 8px;color:#aab5a9;font-size:12px}
        .public-login-inline a{color:#c5f36a;font-size:12px;font-weight:750;text-decoration:none}
        .public-mutual-card{margin:13px 0;padding:18px 17px 17px;border:1px solid #315a3d;border-radius:21px;background:#0d1a12;color:#f2f5ed;min-height:122px}
        .public-mutual-title{font:700 10px monospace;letter-spacing:.16em;color:#b9ed6a;margin-bottom:10px}
        .public-mutual-body{display:flex;justify-content:space-between;align-items:center;gap:12px}
        .public-mutual-record{display:grid;gap:5px;min-width:0}
        .public-mutual-record strong{font-size:32px;line-height:1;font-weight:850;letter-spacing:-.04em}
        .public-mutual-record span{font-size:12px;color:#aab5a9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .public-mutual-gap{display:grid;justify-items:end;gap:4px;flex:0 0 auto}
        .public-mutual-gap small{font:700 9px monospace;letter-spacing:.15em;color:#929e91}
        .public-mutual-gap strong{font:900 25px monospace;color:#e8c94d}
        .public-calculator-overlay{position:fixed;inset:0;z-index:1000;background:#030805ed;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:22px 14px 40px}
        .public-calculator-modal{width:100%;max-width:430px;min-height:calc(100dvh - 62px);padding:18px 16px 28px;border:1px solid #244633;border-radius:18px;background:radial-gradient(ellipse at 85% 0%,#0c4228 0%,#07150e 40%,#070d09 75%);color:#f3f5ef;box-shadow:0 20px 70px #000b}
        .public-calculator-header{display:flex;align-items:center;gap:13px;margin-bottom:22px}
        .public-calculator-header>button{width:37px;height:37px;border:1px solid #2a4434;border-radius:11px;background:#0c1710;color:#f2f5ef;font-size:21px}
        .public-calculator-header h2{font-size:18px;margin:0 0 4px}.public-calculator-header p{font-size:11px;color:#9eaea1;margin:0}
        .public-calc-step{margin:17px 0 9px;color:#aab5aa;font-size:11px}
        .public-calc-players{display:grid;grid-template-columns:1fr 22px 1fr;align-items:center;gap:7px}
        .public-calc-player{min-width:0;min-height:128px;padding:12px 6px 10px;border:1px solid #294333;border-radius:14px;background:#101713;display:flex;align-items:center;flex-direction:column;justify-content:center}
        .public-calc-avatar{width:43px;height:43px;display:grid;place-items:center;border:2px solid #c5f36a;border-radius:50%;color:#c5f36a;font-weight:800;font-size:17px;margin-bottom:7px}
        .public-calc-player strong{max-width:100%;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .public-calc-player small{font-size:10px;color:#9eaaa1;margin-top:3px}.public-calc-player span{font:700 8px monospace;letter-spacing:.12em;color:#c5f36a;margin-top:7px}
        .public-calc-vs{text-align:center;color:#87958b;font-size:10px}
        .public-calc-formats{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:12px;background:#111914}
        .public-calc-formats button{padding:11px 5px;border:0;border-radius:9px;background:transparent;color:#c0c9c1;font-size:11px;font-weight:700}
        .public-calc-formats button.selected{background:#c7f36a;color:#10150d}
        .public-calc-button{width:100%;margin-top:15px;padding:14px;border:0;border-radius:11px;background:#c7f36a;color:#10150d;font-weight:850}
        .public-calc-results{margin-top:18px}.public-calc-divider{height:1px;background:#1d2a22;margin-bottom:16px}
        .public-calc-label{color:#98a79c;font-size:10px}
        .public-calc-probs{display:flex;justify-content:space-between;margin:7px 0 10px}.public-calc-probs>div{display:flex;flex-direction:column;gap:4px}.public-calc-probs>div:last-child{text-align:right}.public-calc-probs b{font-size:12px}.public-calc-probs strong{font:800 28px monospace;color:#c7f36a}
        .public-calc-bar{height:12px;overflow:hidden;border-radius:20px;background:#27372d}.public-calc-bar i{display:block;height:100%;background:#c7f36a;border-radius:20px}
        .public-calc-favourite{margin:7px 0 18px;color:#8e9d92;font-size:10px}
        .public-calc-points-label{margin-bottom:9px}.public-calc-stakes{display:grid;grid-template-columns:1fr 1fr;gap:8px}.public-calc-stakes>div{padding:12px;border:1px solid #24362b;border-radius:12px;background:#101713}
        .public-calc-stakes small,.public-calc-stakes strong,.public-calc-stakes em{display:block}.public-calc-stakes small{color:#98a79c;font-size:10px}.public-calc-stakes strong{margin:8px 0;color:#c7f36a;font:800 16px monospace}.public-calc-stakes em{color:#e78d82;font-size:11px;font-style:normal}
        .public-calc-foot,.public-calc-disclaimer{margin:10px 0 0;color:#98a79c;font-size:10px;line-height:1.55}.public-calc-disclaimer{color:#738078}
        @media(max-width:480px){.public-mutual-card{padding:17px 15px;min-height:118px}.public-mutual-record strong{font-size:30px}.public-mutual-gap strong{font-size:24px}.public-calculator-overlay{padding:12px 10px 28px}.public-calculator-modal{min-height:calc(100dvh - 40px);padding:16px 13px 24px}.public-calc-stakes strong{font-size:14px}}
        .public-rating-gap-strip{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:9px 0 12px;padding:7px 12px;min-height:34px;border:1px solid #334a35;border-radius:11px;background:#0b160f}
        .public-rating-gap-strip span{font:700 8px monospace;letter-spacing:.11em;color:#9eae9e}
        .public-rating-gap-strip strong{font:800 15px monospace;color:#e8ca4c}
        .public-matchup-card{margin:10px 0;padding:14px 15px;border:1px solid #355b3b;border-radius:16px;background:#0d1b12}
        .public-matchup-card .mc-result{margin-top:0}
        .public-matchup-card .public-section-heading{margin-bottom:13px}
        .public-matchup-card .public-section-heading h2{font-size:17px}
        .public-matchup-card .mc-prob-head strong{font-size:24px}
        .public-matchup-card .mc-bar{height:9px}
        .public-matchup-card .mc-stakes>div{padding:9px}
        .public-matchup-card .mc-stakes b{font-size:14px}
        .public-matchup-card .mc-disclaimer{font-size:9px;line-height:1.45}
        /* Screenshot-matched public profile refinements */
        .public-profile{max-width:430px;margin:12px auto 100px;padding:0 0 12px}
        .public-hero{padding:20px 18px 18px;border-radius:25px;background:radial-gradient(ellipse at 85% 8%,#126b3c 0%,#0d3826 34%,#09170f 76%);border-color:#244b36}
        .public-hero-top{grid-template-columns:50px 1fr 50px}
        .public-back,.public-more{height:50px;width:50px;border-radius:15px;background:#080f0b}
        .public-view-label{margin:14px 0 18px;font-size:12px}
        .public-hero-main{grid-template-columns:108px minmax(0,1fr);gap:14px;margin:0 0 20px}
        .public-avatar{width:104px;height:104px}
        .public-identity h1{font-size:30px;margin:0 0 10px;line-height:1.05}
        .public-identity p{font-size:12px;margin-top:10px}
        .public-player-meta b{font-size:9px;letter-spacing:.12em}
        .public-profile-actions{grid-template-columns:1fr 1fr;gap:10px;margin-top:0}
        .public-rank-pill{min-height:54px;border-radius:15px}
        .public-share-button{min-height:54px;border-radius:15px}
        .public-matchup-toggle{height:55px;border-radius:15px;margin-top:10px;font-size:15px}
        .public-matchup-card{padding:17px;border-radius:19px;background:#0d1a12;border-color:#31583c}
        .public-mutual-main{display:flex;justify-content:space-between;align-items:center;gap:12px}
        .public-mutual-main>div{display:grid;gap:5px}
        .public-mutual-main small,.public-gap-box small{font:700 10px monospace;letter-spacing:.14em;color:#b8ee68}
        .public-mutual-main strong{font-size:32px;letter-spacing:-.04em}
        .public-mutual-main span{font-size:12px;color:#9ba99a}
        .public-gap-box{text-align:right;min-width:90px}
        .public-gap-box strong{color:#e8ca4c;font:900 25px monospace}
        .public-mutual-ratings{display:flex;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid #ffffff16;color:#9eaa9b;font-size:10px}
        .public-mutual-ratings b{display:block;color:#f1f4ec;font-size:14px;margin-top:4px}
        .public-rating-grid{grid-template-columns:1fr 1fr;gap:10px;margin:13px 0}
        .public-rating-card,.public-week-card{min-height:165px;padding:17px 15px;border-radius:20px}
        .public-rating-card strong,.public-week-card>strong{font-size:43px;margin:10px 0}
        .public-rating-card .public-card-label,.public-week-card .public-card-label{font-size:10px;letter-spacing:.14em}
        .public-earnings-card{grid-template-columns:minmax(0,1fr) 36px minmax(90px,.7fr);gap:8px;padding:17px 16px;border-radius:20px;margin:13px 0}
        .public-earnings-copy strong{font-size:35px}
        .public-win-history div{font-size:9px}
        .public-wager-card{margin:13px 0;padding:17px 18px;border-radius:20px}
        .public-wager-card>strong{font-size:25px;margin:14px 0 5px}
        .public-record-grid{grid-template-columns:repeat(4,minmax(0,1fr));padding:15px 3px;border-radius:19px}
        .public-record-grid>div{display:grid;justify-items:center;gap:5px;border-right:1px solid #344537}
        .public-record-grid>div:last-child{border:0}
        .public-record-grid strong{font-size:25px}
        .public-record-grid small{font:11px Arial,sans-serif;letter-spacing:0;color:#a9b2a6}
        .public-section{margin-top:13px;padding:17px;border-radius:20px}
        .public-section-heading{margin-bottom:15px}
        .public-section-heading h2{font-size:23px}
        .public-achievements{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
        .public-achievement{min-height:100px;grid-template-columns:32px 28px 1fr;justify-items:start;align-content:center;text-align:left;padding:12px 11px;gap:6px}
        .public-achievement i{font-size:22px;align-self:center}
        .public-achievement strong{font-size:24px}
        .public-achievement span{font-size:12px;align-self:center}
        .public-chart{min-height:145px;grid-template-columns:1fr}
        .public-chart-labels{display:none}
        .public-chart svg{height:145px}
        .public-chart-note{font-size:11px}
        .public-recent-section .public-section-heading{margin-bottom:12px}
        .public-match-row{grid-template-columns:34px minmax(0,1fr) 56px;gap:10px;padding:14px 0}
        .public-match-opponent strong{font-size:14px}
        .public-match-opponent small{font-size:9px}
        .public-match-score{font-size:16px}
        .public-profile-footer{font-size:8px}
        @media(max-width:480px){.public-profile{width:100%;max-width:430px;margin:8px auto 90px;padding:0 1px}.public-hero{padding:18px 16px 17px}.public-hero-main{grid-template-columns:94px minmax(0,1fr);gap:12px}.public-avatar{width:94px;height:94px}.public-identity h1{font-size:27px}.public-rating-card,.public-week-card{padding:15px 12px;min-height:158px}.public-rating-card strong,.public-week-card>strong{font-size:39px}.public-earnings-card{grid-template-columns:minmax(0,1fr) 30px minmax(85px,.65fr);padding:15px 13px}.public-earnings-copy strong{font-size:30px}.public-achievement{grid-template-columns:26px 25px 1fr;padding:10px 8px}.public-achievement span{font-size:11px}.public-achievement strong{font-size:21px}}
      `}</style>
    </main>
  );
}
