"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { FEATURED_ROSTER_FALLBACK } from "@/lib/kombat/data";
import type { KombatFighter } from "@/lib/kombat/types";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import { FighterTile, KombatTag } from "@/components/kombat/KombatUI";

type Match = {
  id: string;
  player_one_id: string;
  player_two_id: string;
  fighter_one_id: string;
  fighter_two_id: string;
  winner_id: string | null;
  player_one_games_won: number | null;
  player_two_games_won: number | null;
  published_at: string;
};

type FighterStats = {
  matches: number;
  wins: number;
  losses: number;
  winRate: number | null;
  pickRate: number | null;
  bestWeekly: number | null;
  players: Array<{ id: string; matches: number; wins: number; winRate: number }>;
};

function missingTable(error: { code?: string; message?: string } | null) {
  return Boolean(error && (error.code === "42P01" || error.code === "PGRST205" || /does not exist|could not find the table/i.test(error.message || "")));
}

function getStats(fighterId: string, all: Match[], totalPicks: number): FighterStats {
  const rows = all.filter(m => m.fighter_one_id === fighterId || m.fighter_two_id === fighterId);
  let wins = 0;
  const playerMap = new Map<string, { matches: number; wins: number }>();
  const weeks = new Map<string, { matches: number; wins: number }>();
  rows.forEach(m => {
    const first = m.fighter_one_id === fighterId;
    const playerId = first ? m.player_one_id : m.player_two_id;
    const won = m.winner_id === playerId;
    if (won) wins++;
    const p = playerMap.get(playerId) || { matches: 0, wins: 0 };
    p.matches++; if (won) p.wins++;
    playerMap.set(playerId, p);
    const date = new Date(m.published_at);
    const weekKey = Number.isNaN(date.getTime()) ? "unknown" : date.toISOString().slice(0, 10);
    const w = weeks.get(weekKey) || { matches: 0, wins: 0 };
    w.matches++; if (won) w.wins++;
    weeks.set(weekKey, w);
  });
  const weeklyRates = [...weeks.values()].filter(w => w.matches >= 1).map(w => w.wins / w.matches * 100);
  const players = [...playerMap.entries()].map(([id, p]) => ({ id, matches: p.matches, wins: p.wins, winRate: p.wins / p.matches * 100 })).sort((a,b) => b.winRate - a.winRate || b.matches - a.matches).slice(0, 3);
  return {
    matches: rows.length, wins, losses: rows.length - wins,
    winRate: rows.length ? wins / rows.length * 100 : null,
    pickRate: totalPicks ? rows.length / totalPicks * 100 : null,
    bestWeekly: weeklyRates.length ? Math.max(...weeklyRates) : null,
    players,
  };
}

function pct(value: number | null) { return value === null ? "—" : Math.round(value) + "%"; }
function playerLabel(id: string) { return "Player " + id.slice(0, 5).toUpperCase(); }

export default function CharacterCompareClient({ initialA, initialB }: { initialA: string; initialB: string }) {
  const [fighters, setFighters] = useState<KombatFighter[]>(FEATURED_ROSTER_FALLBACK);
  const [matches, setMatches] = useState<Match[]>([]);
  const [a, setA] = useState(initialA || "scorpion");
  const [b, setB] = useState(initialB || "sub-zero");
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!supabase) { setUnavailable(true); setLoading(false); return; }
      const [fighterResult, matchResult] = await Promise.all([
        supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").eq("enabled", true).order("sort_order", { ascending: true }),
        supabase.from("kombat_matches").select("id,player_one_id,player_two_id,fighter_one_id,fighter_two_id,winner_id,player_one_games_won,player_two_games_won,published_at").eq("match_type", "ranked").not("published_at", "is", null).is("voided_at", null).order("published_at", { ascending: false }),
      ]);
      if (!alive) return;
      const fighterMissing = missingTable(fighterResult.error);
      const matchMissing = missingTable(matchResult.error);
      if ((fighterResult.error && !fighterMissing) || (matchResult.error && !matchMissing)) {
        setUnavailable(true);
      } else {
        if (!fighterMissing && fighterResult.data?.length) {
          const roster = fighterResult.data as KombatFighter[];
          setFighters(roster);
          if (!roster.some(f => f.slug === a)) setA(roster[0]?.slug || "scorpion");
          if (!roster.some(f => f.slug === b)) setB(roster[1]?.slug || roster[0]?.slug || "sub-zero");
        }
        setMatches(matchMissing ? [] : (matchResult.data || []) as Match[]);
      }
      setLoading(false);
    }
    load();
    return () => { alive = false; };
  }, []);

  const left = fighters.find(f => f.slug === a) || fighters[0];
  const right = fighters.find(f => f.slug === b) || fighters[1] || fighters[0];
  const totalPicks = matches.length * 2;
  const leftStats = useMemo(() => left ? getStats(left.id, matches, totalPicks) : null, [left, matches, totalPicks]);
  const rightStats = useMemo(() => right ? getStats(right.id, matches, totalPicks) : null, [right, matches, totalPicks]);
  const meetings = useMemo(() => left && right ? matches.filter(m => (m.fighter_one_id === left.id && m.fighter_two_id === right.id) || (m.fighter_one_id === right.id && m.fighter_two_id === left.id)) : [], [left, right, matches]);
  const headWins = useMemo(() => {
    let winsA = 0, winsB = 0;
    meetings.forEach(m => {
      const aIsFirst = m.fighter_one_id === left?.id;
      const winnerUsedA = m.winner_id === (aIsFirst ? m.player_one_id : m.player_two_id);
      if (winnerUsedA) winsA++; else if (m.winner_id) winsB++;
    });
    return { winsA, winsB };
  }, [meetings, left]);
  const recent = meetings.slice(0, 3);

  const swap = () => { setA(b); setB(a); };
  const choose = (side: "a" | "b", slug: string) => {
    if (side === "a") { setA(slug); if (slug === b) setB(a); }
    else { setB(slug); if (slug === a) setA(b); }
  };

  return <KombatPageShell active="characters" title="COMPARE">
    <main className="kombat-compare-content">
      <div className="kombat-compare-eyebrow">FIGHTER COMPARISON</div>
      <h1>{left?.name || "Fighter"} <em>VS</em> {right?.name || "Fighter"}</h1>
      <div className="kombat-compare-pair">
        {[{ fighter: left, side: "a" as const, tone: "gold" }, { fighter: right, side: "b" as const, tone: "blue" }].map(({ fighter, side, tone }) => fighter && <section className={"kombat-compare-fighter " + tone} key={side}>
          <FighterTile slug={fighter.slug} name={fighter.name}/>
          <strong>{fighter.name}</strong>
          <KombatTag tone="new">TIER NEW</KombatTag>
          <label className="kombat-compare-select-label" htmlFor={"fighter-" + side}>CHANGE FIGHTER</label>
          <select id={"fighter-" + side} value={fighter.slug} onChange={e => choose(side, e.target.value)} aria-label={"Choose " + (side === "a" ? "first" : "second") + " fighter"}>
            {fighters.map(f => <option key={f.id} value={f.slug}>{f.name}</option>)}
          </select>
        </section>)}
        <span className="kombat-compare-vs">VS</span>
      </div>
      <button className="kombat-compare-swap" onClick={swap} type="button">⇄ &nbsp; SWAP SIDES</button>

      <section className="kombat-compare-h2h">
        <small>HEAD TO HEAD AT BASE25</small>
        {loading ? <b>—</b> : <b>{headWins.winsA} – {headWins.winsB}</b>}
        <p>{loading ? "Loading ranked meetings…" : meetings.length ? left?.name + " leads over " + meetings.length + " ranked meetings" : "No ranked meetings recorded between these fighters yet"}</p>
        <div className="kombat-compare-bar"><i style={{ width: meetings.length ? (headWins.winsA / meetings.length * 100) + "%" : "50%" }}/><i style={{ width: meetings.length ? (headWins.winsB / meetings.length * 100) + "%" : "50%" }}/></div>
      </section>

      <section className="kombat-compare-panel">
        <div className="kombat-compare-side-labels"><strong>{left?.name}</strong><strong>{right?.name}</strong></div>
        {[
          { label: "WIN RATE", av: leftStats?.winRate ?? null, bv: rightStats?.winRate ?? null, format: pct },
          { label: "MATCHES", av: leftStats?.matches ?? 0, bv: rightStats?.matches ?? 0, format: (v: number | null) => String(v ?? 0) },
          { label: "PICK RATE", av: leftStats?.pickRate ?? null, bv: rightStats?.pickRate ?? null, format: pct },
          { label: "WINS", av: leftStats?.wins ?? 0, bv: rightStats?.wins ?? 0, format: (v: number | null) => String(v ?? 0) },
          { label: "BEST WEEKLY WIN RATE", av: leftStats?.bestWeekly ?? null, bv: rightStats?.bestWeekly ?? null, format: pct },
        ].map(row => <div className="kombat-compare-stat" key={row.label}>
          <div className="kombat-compare-stat-values"><b>{loading ? "—" : row.format(row.av)}</b><small>{row.label}</small><b>{loading ? "—" : row.format(row.bv)}</b></div>
          <div className="kombat-compare-stat-bars"><i style={{ width: row.av === null ? "0%" : Math.max(3, Number(row.av) / Math.max(1, Number(row.av), Number(row.bv)) * 100) + "%" }}/><i style={{ width: row.bv === null ? "0%" : Math.max(3, Number(row.bv) / Math.max(1, Number(row.av), Number(row.bv)) * 100) + "%" }}/></div>
        </div>)}
      </section>

      <section className="kombat-compare-panel">
        <div className="kombat-compare-section-title"><small>TOP PLAYERS</small></div>
        <div className="kombat-compare-top-players">
          {[{ name: left?.name, players: leftStats?.players || [], tone: "gold" }, { name: right?.name, players: rightStats?.players || [], tone: "blue" }].map(col => <div key={col.name} className={col.tone}>
            <strong>{col.name}</strong>
            {col.players.length ? col.players.slice(0, 3).map(p => <div className="kombat-compare-player" key={p.id}><span>{playerLabel(p.id)}</span><b>{Math.round(p.winRate)}%</b></div>) : <p>No player records yet</p>}
          </div>)}
        </div>
      </section>

      <section className="kombat-compare-panel">
        <div className="kombat-compare-section-title"><small>THEIR LAST MEETINGS</small><h2>{left?.name} VS {right?.name}</h2></div>
        {recent.length ? <div className="kombat-compare-meetings">{recent.map(m => {
          const first = m.fighter_one_id === left?.id;
          const playerA = first ? m.player_one_id : m.player_two_id;
          const playerB = first ? m.player_two_id : m.player_one_id;
          const scoreA = first ? m.player_one_games_won : m.player_two_games_won;
          const scoreB = first ? m.player_two_games_won : m.player_one_games_won;
          const winnerA = m.winner_id === playerA;
          return <div className="kombat-compare-meeting" key={m.id}>
            <FighterTile slug={left?.slug || ""} name={left?.name || ""} size="compare"/>
            <div><strong>{playerLabel(playerA)} <i>vs</i> {playerLabel(playerB)}</strong><small>{left?.name} · {right?.name} · {new Date(m.published_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}</small></div>
            <b>{scoreA ?? (winnerA ? "W" : "L")} – {scoreB ?? (winnerA ? "L" : "W")}</b>
          </div>;
        })}</div> : <p className="kombat-compare-empty">{loading ? "Loading meetings…" : "No head-to-head ranked meetings yet."}</p>}
        <Link className="kombat-compare-see-all" href={"/kombat/coming-soon/matches?fighter=" + encodeURIComponent(a) + "&opponent=" + encodeURIComponent(b)}>SEE ALL {meetings.length} MEETINGS →</Link>
      </section>
      {unavailable && <p className="kombat-compare-footnote">Kombat records are not connected yet. Statistics will appear when published ranked match data is available.</p>}
      {!unavailable && <p className="kombat-compare-footnote">Comparisons use published ranked matches only. Statistics stay blank when there is not enough match data.</p>}
    </main>
  </KombatPageShell>;
}
