"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Player = {
  id: string;
  player_code: string;
  username: string;
  photo_url: string | null;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
  designation: "regular" | "boardman" | "house_ghost";
};

function Avatar({ player }: { player: Player }) {
  return (
    <span className="weekly-avatar">
      {player.photo_url ? <img src={player.photo_url} alt="" /> : player.username?.[0]?.toUpperCase() || "?"}
    </span>
  );
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase) {
        setError("The weekly leaderboard is temporarily unavailable.");
        setLoading(false);
        return;
      }

      const { data, error: requestError } = await supabase.rpc("get_period_leaderboard_with_designation", {
        p_period: "this_week",
      });

      if (!active) return;
      if (requestError) {
        setError(requestError.message);
      } else {
        setError("");
        setPlayers((data || []) as Player[]);
      }
      setLoading(false);
    }

    load();
    const refresh = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  const filtered = useMemo(
    () => players.filter((p) => (p.username + " " + p.player_code).toLowerCase().includes(search.toLowerCase())),
    [players, search]
  );

  const totalMatches = Math.round(players.reduce((sum, p) => sum + Number(p.matches_played || 0), 0) / 2);

  return (
    <main className="shell redesign-shell weekly-board-page">
      <SiteNavigation />
      <div className="weekly-board">
        <header className="weekly-board-hero">
          <div className="weekly-kicker"><span className="live-dot" /> THIS WEEK'S RACE</div>
          <h1>Weekly <span>Leaderboard</span></h1>
          <p>Every player. Every position. One race to the Saturday final.</p>
          <div className="weekly-hero-meta">
            <span><b>{players.length}</b> players ranked</span>
            <i />
            <span><b>{totalMatches}</b> recorded matches</span>
            <i />
            <span className="weekly-live">LIVE UPDATES</span>
          </div>
        </header>

        <section className="weekly-board-panel">
          <div className="weekly-board-heading">
            <div>
              <span className="weekly-section-label">SATURDAY QUALIFICATION</span>
              <h2>Full standings</h2>
              <p>Top five qualify for the Saturday final. Weekly leaderboard runs Saturday to Friday. Points reset every Saturday.</p>
            </div>
            <div className="weekly-top-five"><b>TOP 5</b><span>QUALIFY</span></div>
          </div>

          <div className="weekly-tools">
            <div className="weekly-count">{loading ? "Loading standings…" : `Showing ${filtered.length} of ${players.length} players`}</div>
            <label className="weekly-search">
              <span aria-hidden="true">⌕</span>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players..." />
            </label>
          </div>

          {error && <p className="weekly-error">{error}</p>}
          {loading ? (
            <div className="weekly-empty">Loading weekly standings...</div>
          ) : filtered.length === 0 ? (
            <div className="weekly-empty">{search ? "No players match your search." : "No weekly rankings yet. Players appear after their first ranked match."}</div>
          ) : (
            <div className="weekly-table">
              <div className="weekly-table-head"><span>RANK</span><span>PLAYER</span><span>W</span><span>L</span><span>RATING</span></div>
              {filtered.map((player) => {
                const rank = players.findIndex((p) => p.id === player.id) + 1;
                return (
                  <Link href={`/players/${player.id}`} className={`weekly-player-row ${rank <= 5 ? "is-qualifying" : ""} ${rank === 1 ? "is-leader" : ""}`} key={player.id}>
                    <span className="weekly-rank">{rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : String(rank).padStart(2, "0")}</span>
                    <span className="weekly-player"><Avatar player={player} /><span><b>{player.username}</b>{player.designation === "boardman" ? <em className="weekly-player-tag boardman-tag">BOARDMAN 💀</em> : player.designation === "house_ghost" ? <em className="weekly-player-tag ghost-tag">HOUSE GHOSTS 👻</em> : null}<small>{player.player_code}</small></span></span>
                    <strong>{player.wins}</strong>
                    <strong>{player.losses}</strong>
                    <b className="weekly-rating">{Number(player.elo_rating || 0).toLocaleString("en-NG")}</b>
                  </Link>
                );
              })}
            </div>
          )}
          <div className="weekly-board-foot"><span><i /> TOP 5 QUALIFICATION ZONE</span><span>Standings refresh automatically</span></div>
        </section>
        <Link className="weekly-back-home" href="/">← Back to BASE25 PRO</Link>
      </div>

      <style jsx>{`
        .weekly-board{width:min(100% - 32px,1050px);margin:0 auto 100px;padding-top:18px;color:#f4f6ef}
        .weekly-board-hero{position:relative;overflow:hidden;padding:34px 32px 28px;border:1px solid #34533a;border-radius:22px;background:radial-gradient(ellipse at 85% 20%,#24522b 0%,transparent 40%),linear-gradient(115deg,#07100b,#0d2113 65%,#07110b);box-shadow:inset 0 1px #ffffff0a}
        .weekly-board-hero:after{content:"8";position:absolute;right:7%;top:50%;transform:translateY(-50%);width:150px;height:150px;display:grid;place-items:center;border:9px solid #171d19;border-radius:50%;background:radial-gradient(circle at 32% 25%,#fff,#dce0d8 35%,#252b26 72%);box-shadow:0 18px 35px #0009;color:#111;font-size:78px;font-weight:950}
        .weekly-kicker,.weekly-section-label{font:800 10px monospace;letter-spacing:.18em;color:#c5f36a}
        .live-dot{display:inline-block;width:8px;height:8px;margin-right:8px;border-radius:50%;background:#c5f32d;box-shadow:0 0 10px #c5f32d}
        .weekly-board-hero h1{position:relative;z-index:1;margin:16px 0 8px;font-size:clamp(38px,6vw,62px);line-height:1;letter-spacing:-.06em;font-weight:950}
        .weekly-board-hero h1 span{color:#c5f36a}
        .weekly-board-hero>p{position:relative;z-index:1;margin:0;color:#bdcabb;font-size:14px}
        .weekly-hero-meta{position:relative;z-index:1;display:flex;align-items:center;gap:13px;flex-wrap:wrap;margin-top:25px;color:#aebcae;font-size:11px}
        .weekly-hero-meta b{color:#f5f7ef;font-size:15px}.weekly-hero-meta i{width:4px;height:4px;border-radius:50%;background:#657963}.weekly-live{color:#d5f36a;font:800 9px monospace;letter-spacing:.12em}
        .weekly-board-panel{margin-top:18px;padding:22px;border:1px solid #304b35;border-radius:20px;background:linear-gradient(145deg,#0d1910,#080f0a);box-shadow:0 14px 35px #0003}
        .weekly-board-heading{display:flex;justify-content:space-between;align-items:center;gap:18px}
        .weekly-board-heading h2{margin:7px 0 5px;font-size:clamp(24px,4vw,32px);letter-spacing:-.04em}
        .weekly-board-heading p{max-width:690px;margin:0;color:#aab9aa;font-size:12px;line-height:1.6}
        .weekly-top-five{flex:none;display:grid;place-items:center;width:76px;height:76px;border:1px solid #c5f36a;border-radius:18px;background:#c5f32d12;box-shadow:0 0 20px #c5f32d12}
        .weekly-top-five b{font-size:21px;color:#d8f76a}.weekly-top-five span{font:800 8px monospace;letter-spacing:.12em;color:#aabd9e}
        .weekly-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:22px 0 10px}
        .weekly-count{color:#93a493;font-size:11px}
        .weekly-search{display:flex;align-items:center;gap:8px;width:min(100%,260px);padding:10px 12px;border:1px solid #344c38;border-radius:11px;background:#080f0a;color:#c5f36a}
        .weekly-search span{font-size:20px}.weekly-search input{width:100%;min-width:0;border:0;outline:0;background:transparent;color:#fff;font-size:12px}.weekly-search input::placeholder{color:#829182}
        .weekly-table{overflow:hidden;border:1px solid #2b4230;border-radius:14px;background:#0a130c}
        .weekly-table-head,.weekly-player-row{display:grid;grid-template-columns:9% minmax(0,1fr) 9% 9% 18%;align-items:center;gap:8px}
        .weekly-table-head{min-height:42px;padding:0 14px;color:#849585;font:800 9px monospace;letter-spacing:.13em}
        .weekly-player-row{min-height:67px;padding:7px 14px;border-top:1px solid #24372a;color:#f4f6ef;text-align:center;text-decoration:none;transition:background .15s}
        .weekly-player-row:hover{background:#17271a}
        .weekly-player-row.is-qualifying{background:linear-gradient(90deg,#152819,#0c170f)}
        .weekly-player-row.is-leader{border-top-color:#a4d64b;background:linear-gradient(90deg,#263d17,#102013)}
        .weekly-rank{font-size:14px;font-weight:900;color:#d3e0d0}
        .weekly-player{display:flex;align-items:center;gap:11px;min-width:0;text-align:left}
        .weekly-avatar{width:42px;height:42px;flex:none;display:grid;place-items:center;overflow:hidden;border:1px solid #526a3e;border-radius:50%;background:#1b2b1b;color:#d5f36a;font-size:15px;font-weight:900}
        .weekly-avatar img{width:100%;height:100%;object-fit:cover}
        .weekly-player>span:last-child{display:grid;gap:3px;min-width:0}.weekly-player-tag{width:max-content;max-width:100%;padding:2px 6px;border:1px solid #ffffff24;border-radius:999px;font:800 7px monospace;font-style:normal;letter-spacing:.04em}.weekly-player-tag.boardman-tag{background:#3b2d12;color:#ffd36a;border-color:#b8892e}.weekly-player-tag.ghost-tag{background:#24163b;color:#d7b5ff;border-color:#8054b8}.weekly-player b{overflow:hidden;color:#f4f6ef;font-size:13px;text-overflow:ellipsis;white-space:nowrap}.weekly-player small{color:#91a191;font:9px monospace}
        .weekly-player-row>strong{font-size:13px}.weekly-rating{color:#d4f36a;font-size:17px!important}
        .weekly-board-foot{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:13px;color:#819282;font:9px monospace;letter-spacing:.04em}
        .weekly-board-foot span:first-child{color:#c5f36a}.weekly-board-foot i{display:inline-block;width:7px;height:7px;margin-right:7px;border-radius:50%;background:#c5f32d}
        .weekly-empty{padding:35px 12px;text-align:center;color:#a6b4a5;font-size:13px}
        .weekly-error{padding:10px 12px;border:1px solid #71403a;border-radius:10px;background:#351b18;color:#ffc3b8;font-size:12px}
        .weekly-back-home{display:inline-block;margin:18px 0;color:#c5f36a;text-decoration:none;font:800 10px monospace;letter-spacing:.08em}
        @media(max-width:650px){
          .weekly-board{width:calc(100% - 24px);padding-top:10px}
          .weekly-board-hero{padding:25px 18px 22px;border-radius:17px}
          .weekly-board-hero:after{right:3%;width:94px;height:94px;border-width:6px;font-size:48px}
          .weekly-board-hero h1{max-width:70%;font-size:clamp(34px,9vw,45px)}
          .weekly-board-hero>p{max-width:72%;font-size:11px;line-height:1.5}
          .weekly-hero-meta{gap:8px;margin-top:19px;font-size:9px}
          .weekly-hero-meta b{font-size:12px}
          .weekly-board-panel{padding:14px 10px;border-radius:16px}
          .weekly-board-heading{gap:8px}.weekly-board-heading p{font-size:10px}
          .weekly-top-five{width:57px;height:57px;border-radius:13px}.weekly-top-five b{font-size:17px}.weekly-top-five span{font-size:7px}
          .weekly-tools{align-items:stretch;flex-direction:column;margin:17px 0 9px}
          .weekly-search{box-sizing:border-box;width:100%}
          .weekly-table{border-radius:11px}
          .weekly-table-head,.weekly-player-row{grid-template-columns:9% minmax(0,1fr) 8% 8% 20%;gap:3px}
          .weekly-table-head{min-height:36px;padding:0 5px;font-size:7px;letter-spacing:.08em}
          .weekly-player-row{min-height:57px;padding:5px 5px}
          .weekly-rank{font-size:11px}
          .weekly-player{gap:6px}.weekly-avatar{width:32px;height:32px;font-size:12px}
          .weekly-player b{font-size:10px}.weekly-player small{font-size:7px}
          .weekly-player-row>strong{font-size:10px}.weekly-rating{font-size:12px!important}
          .weekly-board-foot{font-size:8px}
        }
        @media(max-width:370px){.weekly-board-hero:after{right:2%;width:78px;height:78px;font-size:40px}.weekly-board-hero h1{max-width:72%}.weekly-table-head,.weekly-player-row{grid-template-columns:8% minmax(0,1fr) 8% 8% 21%;gap:2px}.weekly-player{gap:4px}.weekly-avatar{width:28px;height:28px}.weekly-player b{font-size:9px}}
      `}</style>
    </main>
  );
}
