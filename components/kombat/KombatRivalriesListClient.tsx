"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import { FighterTile } from "@/components/kombat/KombatUI";
import { RIVALRY_STATUS_CONFIG, type Rivalry, type RivalryResult, getRivalryStatus } from "@/lib/kombat/rivalries-data";

type MatchRow = {
  id: string;
  player_one_id: string | null;
  player_two_id: string | null;
  fighter_one_id: string | null;
  fighter_two_id: string | null;
  winner_id: string | null;
  match_type: string | null;
  published_at: string | null;
  voided_at: string | null;
};
type Player = { id: string; username: string; player_code?: string | null };
type Fighter = { id: string; name: string; slug: string; image_src?: string | null };
type Sort = "hottest" | "meetings" | "recent" | "one-sided";
type View = "all" | "mine";

const sortOptions: Array<{ id: Sort; label: string }> = [
  { id: "hottest", label: "HOTTEST" },
  { id: "meetings", label: "MOST MEETINGS" },
  { id: "recent", label: "RECENT" },
  { id: "one-sided", label: "ONE-SIDED" },
];
const dateLabel = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const counts = (r: Rivalry) => ({
  left: r.results.filter((x) => x === "L").length,
  right: r.results.filter((x) => x === "R").length,
});
const streak = (r: Rivalry) => {
  const latest = r.results[r.results.length - 1];
  let total = 0;
  for (let i = r.results.length - 1; i >= 0 && r.results[i] === latest; i--) total++;
  return { side: latest, total };
};
const winnerName = (r: Rivalry, side: RivalryResult) => side === "L" ? r.leftName : r.rightName;
const summary = (r: Rivalry) => {
  const c = counts(r);
  const run = streak(r);
  if (run.total >= 2) return winnerName(r, run.side) + " on a W" + run.total + " streak";
  if (c.left === c.right) return "Head-to-head is tied " + c.left + "-" + c.right;
  const leader = c.left > c.right ? "L" : "R";
  return winnerName(r, leader) + " leads " + Math.max(c.left, c.right) + "-" + Math.min(c.left, c.right);
};

function buildRivalries(matches: MatchRow[], players: Record<string, Player>, fighters: Record<string, Fighter>): Rivalry[] {
  const grouped = new Map<string, MatchRow[]>();
  for (const match of matches) {
    if (match.match_type !== "ranked" || !match.published_at || match.voided_at != null) continue;
    const a = match.player_one_id;
    const b = match.player_two_id;
    if (!a || !b || a === b || !match.winner_id || (match.winner_id !== a && match.winner_id !== b)) continue;
    const [leftId, rightId] = a < b ? [a, b] : [b, a];
    const key = leftId + "::" + rightId;
    const group = grouped.get(key) || [];
    group.push(match);
    grouped.set(key, group);
  }

  const rivalries: Rivalry[] = [];
  for (const [id, group] of grouped) {
    if (group.length < RIVALRY_STATUS_CONFIG.minimumMeetings) continue;
    group.sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime());
    const [leftPlayerId, rightPlayerId] = id.split("::");
    const last = group[group.length - 1];
    const leftWasPlayerOne = last.player_one_id === leftPlayerId;
    const leftFighterId = leftWasPlayerOne ? last.fighter_one_id : last.fighter_two_id;
    const rightFighterId = leftWasPlayerOne ? last.fighter_two_id : last.fighter_one_id;
    const results: RivalryResult[] = group.map((m) => m.winner_id === leftPlayerId ? "L" : "R");
    const leftFighter = leftFighterId ? fighters[leftFighterId] : undefined;
    const rightFighter = rightFighterId ? fighters[rightFighterId] : undefined;
    rivalries.push({
      id,
      leftPlayerId,
      rightPlayerId,
      leftName: players[leftPlayerId]?.username || players[leftPlayerId]?.player_code || "Unknown player",
      rightName: players[rightPlayerId]?.username || players[rightPlayerId]?.player_code || "Unknown player",
      leftFighterSlug: leftFighter?.slug || "",
      rightFighterSlug: rightFighter?.slug || "",
      leftFighterName: leftFighter?.name || "Fighter not recorded",
      rightFighterName: rightFighter?.name || "Fighter not recorded",
      results,
      lastDate: last.published_at!,
      totalMeetings: group.length,
    });
  }
  return rivalries;
}

function RivalryCard({ r, featured = false }: { r: Rivalry; featured?: boolean }) {
  const status = getRivalryStatus(r);
  const c = counts(r);
  const run = streak(r);
  const lastWinner = r.results[r.results.length - 1];
  return (
    <article className={"kombat-rivalry-item" + (featured ? " featured" : "")}>
      <div className="kombat-rivalry-item-top">
        <span className={"kombat-rivalry-status " + status.toLowerCase()}>{status}</span>
        <small>{r.totalMeetings} RANKED MEETINGS · LAST {dateLabel(r.lastDate).toUpperCase()}</small>
      </div>
      <div className="kombat-rivalry-item-versus">
        <div className="kombat-rivalry-person left-person">
          <FighterTile slug={r.leftFighterSlug} name={r.leftFighterName} size={featured ? "portrait" : "compare"} />
          <b title={r.leftName}>{r.leftName}</b><small>{r.leftFighterName}</small>
        </div>
        <div className="kombat-rivalry-record">
          <strong><span className={c.left >= c.right ? "leader" : ""}>{c.left}</span><i>–</i><span className={c.right >= c.left ? "leader" : ""}>{c.right}</span></strong>
          <small>WINS · HEAD TO HEAD</small>
        </div>
        <div className="kombat-rivalry-person right-person">
          <FighterTile slug={r.rightFighterSlug} name={r.rightFighterName} size={featured ? "portrait" : "compare"} />
          <b title={r.rightName}>{r.rightName}</b><small>{r.rightFighterName}</small>
        </div>
      </div>
      <div className={"kombat-rivalry-squares" + (featured ? " featured" : "")} role="img" aria-label={"Last " + Math.min(7, r.results.length) + " meetings, oldest to newest"}>
        {r.results.slice(-7).map((result, i) => <i key={i} className={result === "L" ? "left" : "right"} />)}
      </div>
      <p className={featured ? "kombat-rivalry-last" : "kombat-rivalry-summary"}>
        {featured ? winnerName(r, lastWinner) + " won the last meeting · " + dateLabel(r.lastDate) : summary(r)}
        {featured ? " · " + winnerName(r, run.side) + " current streak: " + run.total : ""}
      </p>
      {featured && <div className="kombat-rivalry-feature-actions">
        <Link href={"/kombat/matches?players=" + encodeURIComponent(r.leftPlayerId + "," + r.rightPlayerId)}>ALL MEETINGS</Link>
        <Link className="primary" href={"/kombat/rivalries?pair=" + encodeURIComponent(r.id)}>VIEW RIVALRY</Link>
      </div>}
    </article>
  );
}

export default function KombatRivalriesClient() {
  const [view, setView] = useState<View>("all");
  const [sort, setSort] = useState<Sort>("hottest");
  const [visible, setVisible] = useState(4);
  const [userId, setUserId] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rivalries, setRivalries] = useState<Rivalry[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const client = supabase;
    if (!client) { setError("The Supabase client is not configured for this deployment."); setLoading(false); setAuthReady(true); return; }
    try {
      const [{ data: sessionData }] = await Promise.all([client.auth.getSession()]);
      const pageSize = 1000;
      const allMatches: MatchRow[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data: page, error: pageError } = await client
          .from("kombat_matches")
          .select("*")
          .eq("match_type", "ranked")
          .not("published_at", "is", null)
          .is("voided_at", null)
          .order("published_at", { ascending: true })
          .range(from, from + pageSize - 1);
        if (pageError) throw pageError;
        const rows = (page || []) as MatchRow[];
        allMatches.push(...rows);
        if (rows.length < pageSize) break;
      }
      const matches = allMatches;
      const playerIds = [...new Set(matches.flatMap((m) => [m.player_one_id, m.player_two_id]).filter((v): v is string => Boolean(v)))];
      const fighterIds = [...new Set(matches.flatMap((m) => [m.fighter_one_id, m.fighter_two_id]).filter((v): v is string => Boolean(v)))];
      const [playerResult, fighterResult] = await Promise.all([
        playerIds.length ? client.from("players").select("id,username,player_code").in("id", playerIds) : Promise.resolve({ data: [], error: null }),
        fighterIds.length ? client.from("kombat_fighters").select("id,name,slug,image_src").in("id", fighterIds) : Promise.resolve({ data: [], error: null }),
      ]);
      if (playerResult.error) throw playerResult.error;
      if (fighterResult.error) throw fighterResult.error;
      const playerMap = Object.fromEntries((playerResult.data || []).map((p: Player) => [p.id, p]));
      const fighterMap = Object.fromEntries((fighterResult.data || []).map((f: Fighter) => [f.id, f]));
      setRivalries(buildRivalries(matches, playerMap, fighterMap));
      const session = sessionData.session;
      if (session) {
        const { data: profile, error: profileError } = await client.rpc("get_my_base25_player_profile");
        const row = Array.isArray(profile) ? profile[0] : profile;
        if (profileError) throw profileError;
        setUserId(row?.id || null);
      } else setUserId(null);
      setAuthReady(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rivalries could not be loaded. Please retry.");
      setAuthReady(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setView(params.get("view") === "mine" ? "mine" : "all");
    const selectedSort = params.get("sort");
    if (sortOptions.some((item) => item.id === selectedSort)) setSort(selectedSort as Sort);
    void load();
  }, [load]);

  const changeUrl = (nextView: View, nextSort: Sort) => {
    const params = new URLSearchParams(window.location.search);
    if (nextView === "all") params.delete("view"); else params.set("view", nextView);
    if (nextSort === "hottest") params.delete("sort"); else params.set("sort", nextSort);
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? "?" + query : ""));
  };
  const chooseView = (next: View) => { setView(next); setVisible(4); changeUrl(next, sort); };
  const chooseSort = (next: Sort) => { setSort(next); setVisible(4); changeUrl(view, next); };

  const sorted = useMemo(() => {
    let list = rivalries.filter((r) => view === "all" || (userId && (r.leftPlayerId === userId || r.rightPlayerId === userId)));
    if (sort === "meetings") list.sort((a, b) => b.totalMeetings - a.totalMeetings || Date.parse(b.lastDate) - Date.parse(a.lastDate));
    else if (sort === "recent") list.sort((a, b) => Date.parse(b.lastDate) - Date.parse(a.lastDate));
    else if (sort === "one-sided") list = list.filter((r) => getRivalryStatus(r) === "ONE-SIDED").sort((a, b) => {
      const ca = counts(a), cb = counts(b);
      return Math.max(cb.left, cb.right) / b.totalMeetings - Math.max(ca.left, ca.right) / a.totalMeetings;
    });
    else list.sort((a, b) => {
      const priority: Record<string, number> = { HEATED: 0, ONGOING: 1, "ONE-SIDED": 2 };
      return priority[getRivalryStatus(a)] - priority[getRivalryStatus(b)] || b.totalMeetings - a.totalMeetings || Date.parse(b.lastDate) - Date.parse(a.lastDate);
    });
    return list;
  }, [rivalries, view, userId, sort]);
  const featured = view === "all" ? sorted[0] : null;
  const loginHref = "/login?next=" + encodeURIComponent("/kombat/rivalries?view=mine");

  return (
    <KombatPageShell active="rivalries" title="KOMBAT"><div className="kombat-rivalries-page">
      <header className="kombat-rivalries-intro"><small>MORTAL KOMBAT 11 · RECURRING MATCHUPS</small><h1>KOMBAT <em>RIVALRIES</em></h1><p>A rivalry starts after 3 published, ranked meetings. Casual, unpublished and voided matches never count.</p></header>
      <div className="kombat-rivalries-tabs" role="group" aria-label="Rivalry view">
        <button aria-pressed={view === "all"} className={view === "all" ? "active" : ""} onClick={() => chooseView("all")}>ALL RIVALRIES</button>
        <button aria-pressed={view === "mine"} className={view === "mine" ? "active" : ""} onClick={() => chooseView("mine")}>MY RIVALRIES</button>
      </div>
      <div className="kombat-rivalries-sorts" role="group" aria-label="Sort rivalries">
        {sortOptions.map((item) => <button type="button" aria-pressed={sort === item.id} className={sort === item.id ? "active" : ""} key={item.id} onClick={() => chooseSort(item.id)}>{item.label}</button>)}
      </div>
      {loading ? <div className="kombat-rivalry-loading"><i/><i/><i/></div> : error ? <section className="kombat-rivalry-empty" role="alert"><b>RIVALRIES UNAVAILABLE</b><p>{error}</p><button onClick={() => void load()}>RETRY</button></section> :
        view === "mine" && !userId ? <section className="kombat-rivalry-login"><b>LOG IN TO SEE YOUR RIVALRIES</b><p>Your personal head-to-head battles, records and current streaks live here.</p><Link href={loginHref}>PLAYER LOGIN</Link></section> :
        sorted.length === 0 ? <section className="kombat-rivalry-empty"><b>NO RIVALRIES YET</b><p>{view === "mine" ? "You need 3 published, ranked meetings with the same player to establish a rivalry." : "No player pair has reached 3 published, ranked meetings yet."}</p></section> : <>
          {featured && <section className="kombat-rivalry-feature"><div className="kombat-rivalry-feature-head"><small>TOP RIVALRY</small><span className={"kombat-rivalry-status " + getRivalryStatus(featured).toLowerCase()}>{getRivalryStatus(featured)}</span></div><RivalryCard r={featured} featured/></section>}
          <div className="kombat-rivalries-list-head"><h2>{view === "mine" ? "YOUR RIVALRIES" : "ALL RIVALRIES"}</h2><small>{sorted.length} TOTAL</small></div>
          {sorted.filter((r) => !featured || r.id !== featured.id).slice(0, visible).map((r) => <div key={r.id} className="kombat-rivalry-link"><RivalryCard r={r}/></div>)}
          {sorted.filter((r) => !featured || r.id !== featured.id).length > visible && <button className="kombat-rivalry-load" onClick={() => setVisible((v) => v + 20)}>LOAD MORE RIVALRIES</button>}
        </>}
      <section className="kombat-rivalry-legend"><small>HOW STATUS WORKS</small><p><b className="heated">HEATED</b> wins are within one of each other</p><p><b className="ongoing">ONGOING</b> a competitive lead, but not a blowout</p><p><b className="one-sided">ONE-SIDED</b> one player won 75% or more</p><div><span><i className="left"/> left player won</span><span><i className="right"/> right player won · oldest to newest</span></div></section>
      <p className="kombat-rivalry-footnote">Head-to-head records and recent form are calculated from published ranked match results only.</p>
    </div></KombatPageShell>
  );
}
