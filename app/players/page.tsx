"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Player = {
  id: string;
  username: string;
  player_code: string;
  photo_url: string | null;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_percentage: number | string;
};

const PAGE_SIZE = 5;

function Medal({ rank }: { rank: number }) {
  const medalColors: Record<number, string> = { 1: "#F2C230", 2: "#2F5FD0", 3: "#D9402F", 4: "#7B3FA0", 5: "#E8782A" };
  return <span
    className={`players-medal players-medal-${rank}`}
    aria-label={`Rank ${rank}`}
    style={{ width: 26, height: 26, flex: "0 0 26px", borderRadius: "50%", background: medalColors[rank] || "#53605A", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "inset -2px -2px 4px #0005" }}
  >
    <span style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800 }}>{rank}</span>
  </span>;
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadPlayers() {
      if (!supabase) {
        setError("The player directory is temporarily unavailable.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("player_public_leaderboard")
        .select("id,username,player_code,photo_url,elo_rating,matches_played,wins,losses,win_percentage")
        .order("elo_rating", { ascending: false })
        .order("username", { ascending: true });

      if (!active) return;
      if (queryError) setError("We couldn't load the player directory. Please try again.");
      setPlayers((data || []) as Player[]);
      setLoading(false);
    }

    loadPlayers();
    return () => { active = false; };
  }, []);

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return players;
    return players.filter((player) =>
      `${player.username} ${player.player_code}`.toLowerCase().includes(term)
    );
  }, [players, search]);

  const visiblePlayers = filteredPlayers.slice(0, visibleCount);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [search]);

  return (
    <main className="shell redesign-shell players-page">
      <SiteNavigation />

      <section className="players-content">
        <div className="players-heading">
          <Link href="/" className="players-back" aria-label="Back to home">←</Link>
          <div>
            <h1>Players</h1>
            <p>{loading ? "Loading player directory…" : `${players.length} registered`}</p>
          </div>
        </div>

        <label className="players-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/></svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Find a player…"
            aria-label="Find a player by name or player code"
          />
          {search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search">×</button>}
        </label>

        <section className="players-ranking" aria-label="Players ranked by rating">
          <div className="players-ranking-title">RANKED BY RATING</div>
          <div className="players-columns" style={{ display: "flex", alignItems: "center", padding: "4px 10px 8px", gap: 10 }}>
            <span style={{ flex: 1, minWidth: 0, paddingLeft: 80 }}>PLAYER</span>
            <span style={{ width: 48, flex: "0 0 48px", textAlign: "right" }}>RECORD</span>
            <span style={{ width: 46, flex: "0 0 46px", textAlign: "right" }}>RATING</span>
          </div>

          {loading ? (
            <div className="players-loading">
              <span /><span /><span /><span /><span />
            </div>
          ) : error ? (
            <p className="players-empty">{error}</p>
          ) : visiblePlayers.length === 0 ? (
            <p className="players-empty">No players match “{search}”. Try another name or code.</p>
          ) : (
            <div className="players-list">
              {visiblePlayers.map((player, index) => {
                const rank = players.findIndex((item) => item.id === player.id) + 1;
                return (
                  <Link
                    href={`/players/${player.id}`}
                    className={`players-row ${rank === 1 ? "is-leader" : ""}`}
                    key={player.id}
                    style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap", alignItems: "center", gap: 10, width: "100%", minHeight: 56, padding: "0 10px", boxSizing: "border-box" }}
                  >
                    <Medal rank={rank} />
                    <span className="players-avatar" style={{ flex: "0 0 34px" }}>
                      {player.photo_url
                        ? <img src={player.photo_url} alt="" />
                        : (player.username?.[0] || "?").toUpperCase()}
                    </span>
                    <span className="players-identity" style={{ flex: "1 1 0%", minWidth: 0, overflow: "hidden" }}>
                      <strong>{player.username}{rank === 1 && <span className="players-crown" aria-label="Top rated player">♛</span>}</strong>
                      <small>{player.player_code}</small>
                    </span>
                    <span className="players-record" style={{ flex: "0 0 48px", width: 48, textAlign: "right", whiteSpace: "nowrap" }}>{player.wins}W / {player.losses}L</span>
                    <strong className="players-rating" style={{ flex: "0 0 46px", width: 46, textAlign: "right", whiteSpace: "nowrap" }}>{Number(player.elo_rating || 1000).toLocaleString("en-NG")}</strong>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && !error && filteredPlayers.length > 0 && (
            <div className="players-list-footer">
              Showing {visiblePlayers.length} of {filteredPlayers.length} players
              {visibleCount < filteredPlayers.length && (
                <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                  Show more <span>↓</span>
                </button>
              )}
            </div>
          )}
        </section>
      </section>

      <style jsx>{`
        .players-page{min-height:100vh;padding-bottom:110px;color:#f4f5f2}
        .players-content{position:relative;isolation:isolate;width:100%;max-width:760px;margin:0 auto;padding:38px 0 70px}
        .players-content:before{content:"";position:absolute;z-index:-1;top:-20px;right:-160px;width:520px;height:460px;background:radial-gradient(ellipse at 60% 25%,#1f7a42 0%,#0f3d22 38%,transparent 75%);pointer-events:none;opacity:.78}
        .players-heading{display:flex;align-items:center;gap:13px;margin:0 0 23px}
        .players-back{width:40px;height:40px;display:grid;place-items:center;border:1px solid #2b3a31;border-radius:12px;color:#e9eee9;font-size:24px;line-height:1;transition:border-color .18s,color .18s}
        .players-back:hover{border-color:#c8f169;color:#c8f169}
        .players-heading h1{margin:0;font-size:34px;line-height:1.08;letter-spacing:-.055em;font-weight:800}
        .players-heading p{margin:5px 0 0;color:#9aa69f;font-size:13px}
        .players-search{height:52px;display:flex;align-items:center;gap:12px;margin:0 0 16px;padding:0 15px;border:1px solid #2b3a31;border-radius:12px;background:#101512;color:#9aa69f}
        .players-search svg{width:19px;height:19px;flex:none;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round}
        .players-search input{width:100%;height:100%;min-width:0;padding:0;border:0;outline:0;background:transparent;color:#f4f5f2;font:500 15px/1.3 inherit}
        .players-search input::placeholder{color:#9aa69f;opacity:1}
        .players-search input:focus{border:0;outline:0}
        .players-search input::-webkit-search-cancel-button{display:none}
        .players-search button{margin:0;padding:0 2px;background:transparent;color:#9aa69f;font-size:23px;font-weight:400}
        .players-ranking{padding:17px 12px 13px;border:1px solid #24402f;border-radius:22px;background:linear-gradient(180deg,#112018,#0e1511);box-shadow:0 16px 50px #0003}
        .players-ranking-title{padding:0 4px 11px;color:#9aa69f;font:500 11px/1.3 'DM Mono',monospace;letter-spacing:2px}
        .players-columns{display:grid;grid-template-columns:minmax(0,1fr) 76px 62px;align-items:center;padding:4px 10px 9px;color:#9aa69f;font:500 10px/1.3 'DM Mono',monospace;letter-spacing:1.4px}
        .players-columns span:first-child{padding-left:76px}
        .players-columns span:nth-child(2),.players-columns span:nth-child(3){text-align:right}
        .players-list{display:grid}
        .players-row{min-height:64px;display:grid;grid-template-columns:26px 34px minmax(0,1fr) 76px 62px;align-items:center;gap:9px;padding:9px 9px;border:1px solid transparent;border-bottom-color:#1f2a24;border-radius:14px;transition:background .18s,border-color .18s}
        .players-row:last-child{border-bottom-color:transparent}
        .players-row:hover{background:#18251b;border-color:#3d5a35}
        .players-row.is-leader{border-color:#c8f1698c;background:linear-gradient(90deg,#c8f1692e,#c8f1690a);box-shadow:inset 0 0 22px #c8f1690a}
        .players-medal{width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:#53605a;color:#fff;font:800 11px/1 'DM Mono',monospace;box-shadow:inset -2px -2px 4px #0005}
        .players-medal span{width:16px;height:16px;display:grid;place-items:center;border-radius:50%;background:#fff;color:#111;font-size:9px}
        .players-medal-1{background:#f2c230}.players-medal-2{background:#2f5fd0}.players-medal-3{background:#d9402f}.players-medal-4{background:#7b3fa0}.players-medal-5{background:#e8782a}
        .players-avatar{position:relative;width:34px;height:34px;display:grid;place-items:center;overflow:hidden;border:2px solid #c8f169;border-radius:50%;background:#101512;color:#c8f169;font-size:14px;font-weight:800}
        .players-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .players-identity{min-width:0;display:grid;gap:3px}
        .players-identity strong{display:block;min-width:0;color:#f4f5f2;font-size:14px;font-weight:700;white-space:normal;overflow-wrap:anywhere;word-break:normal;line-height:1.25}.players-crown{display:inline-block;margin-left:5px;color:#e8c547;font-size:13px;vertical-align:1px;white-space:nowrap}
        .players-identity small{color:#9aa69f;font:500 10px/1.3 'DM Mono',monospace;letter-spacing:.02em}
        .players-record{color:#d5dad6;text-align:right;font-size:11px;white-space:nowrap}
        .players-rating{color:#c8f169;text-align:right;font:800 16px/1 'DM Mono',monospace}
        .players-list-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:15px 5px 0;color:#9aa69f;font-size:11px}
        .players-list-footer button{display:inline-flex;align-items:center;gap:7px;margin:0;padding:7px 10px;border:1px solid #344a38;border-radius:20px;background:#111b14;color:#c8f169;font-size:10px;font-weight:700}
        .players-empty{margin:0;padding:25px 10px;color:#9aa69f;text-align:center;font-size:13px;line-height:1.6}
        .players-loading{display:grid;gap:8px;padding:8px 4px}
        .players-loading span{height:55px;border-radius:12px;background:linear-gradient(90deg,#18251b,#223127,#18251b);background-size:200% 100%;animation:players-shimmer 1.4s ease infinite}
        @keyframes players-shimmer{to{background-position:-200% 0}}
        @media(max-width:700px){.players-content{padding:23px 0 50px}.players-heading{margin-bottom:20px}.players-heading h1{font-size:24px}.players-back{width:40px;height:40px}.players-search{height:48px;margin-bottom:15px}.players-ranking{padding:15px 9px 12px;border-radius:19px}.players-columns{grid-template-columns:minmax(0,1fr) 66px 55px;padding:4px 8px 8px;font-size:9px}.players-columns span:first-child{padding-left:69px}.players-row{grid-template-columns:24px 32px minmax(0,1fr) 66px 55px;gap:7px;min-height:58px;padding:8px 7px}.players-medal{width:24px;height:24px}.players-avatar{width:32px;height:32px}.players-identity strong{font-size:13px;line-height:1.25}.players-identity small{font-size:9px}.players-record{font-size:10px}.players-rating{font-size:14px}.players-list-footer{font-size:10px}}
        @media(max-width:360px){.players-columns{grid-template-columns:minmax(0,1fr) 58px 49px;font-size:8px}.players-columns span:first-child{padding-left:61px}.players-row{grid-template-columns:22px 30px minmax(0,1fr) 58px 49px;gap:5px;padding:8px 5px}.players-medal{width:22px;height:22px}.players-avatar{width:30px;height:30px}.players-identity strong{font-size:12px;line-height:1.25}.players-record{font-size:9px}.players-rating{font-size:13px}}
        @media(prefers-reduced-motion:reduce){.players-loading span{animation:none}}
      `}</style>
    </main>
  );
}
