"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type WeeklyPlayer = {
  id: string;
  player_code: string;
  username: string;
  photo_url: string | null;
  elo_rating: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
};

type KingsPot = {
  week_start: string;
  pot_amount: number;
  contributor_count: number;
};

type Countdown = { days: number; hours: number; minutes: number; seconds: number };

function money(value: number) {
  return "₦" + Number(value || 0).toLocaleString("en-NG");
}

function getNextSaturday(now: Date) {
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  const daysUntilSaturday = (6 - target.getDay() + 7) % 7 || 7;
  target.setDate(target.getDate() + daysUntilSaturday);
  return target;
}

function getCountdown(target: Date, now: Date): Countdown {
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function Avatar({ player, rank }: { player: WeeklyPlayer; rank: number }) {
  return (
    <span className="competition-ref-avatar" style={{width:42,height:42,flex:"0 0 42px",display:"grid",placeItems:"center",position:"relative",overflow:"visible",border:"3px solid #c8f169",borderRadius:"50%",background:"#17251b",color:"#c8f169",fontSize:20,fontWeight:900,lineHeight:1}}>
      {player.photo_url ? <img src={player.photo_url} alt="" style={{width:"100%",height:"100%",borderRadius:"50%",objectFit:"cover"}} /> : player.username?.[0]?.toUpperCase() || "?"}
      {rank === 1 && <i aria-label="Weekly leader" style={{position:"absolute",right:-7,top:-8,color:"#e8c547",fontSize:16,fontStyle:"normal"}}>♛</i>}
    </span>
  );
}

export default function CompetitionPage() {
  const [players, setPlayers] = useState<WeeklyPlayer[]>([]);
  const [showAllPlayers, setShowAllPlayers] = useState(false);
  const [kingsPot, setKingsPot] = useState<KingsPot | null>(null);
  const [potIncreaseKey, setPotIncreaseKey] = useState(0);
  const previousPotAmount = useRef<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [potLoading, setPotLoading] = useState(true);
  const [error, setError] = useState("");
  const [potError, setPotError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("leaderboard") === "full") {
      setShowAllPlayers(true);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!supabase) {
        if (active) {
          setError("Competition data is temporarily unavailable.");
          setPotError("Prize pool unavailable.");
          setLoading(false);
          setPotLoading(false);
        }
        return;
      }

      const [leaderboardResult, potResult] = await Promise.all([
        supabase.rpc("get_period_leaderboard", { p_period: "this_week" }),
        supabase.rpc("get_current_kings_pot"),
      ]);

      if (!active) return;

      if (leaderboardResult.error) {
        setError("Could not load the weekly leaderboard. Please try again shortly.");
      } else {
        const rows = (leaderboardResult.data || []) as WeeklyPlayer[];
        setPlayers(rows.slice().sort((a, b) => Number(b.elo_rating || 0) - Number(a.elo_rating || 0)));
        setError("");
      }
      setLoading(false);

      if (potResult.error) {
        setPotError("The King's Pot is temporarily unavailable.");
      } else {
        const raw = potResult.data as KingsPot[] | KingsPot | null;
        const current = Array.isArray(raw) ? raw[0] : raw;
        const nextAmount = Math.max(0, Number(current?.pot_amount || 0));
        if (previousPotAmount.current !== null && nextAmount > previousPotAmount.current) {
          setPotIncreaseKey((key) => key + 1);
        }
        previousPotAmount.current = nextAmount;
        setKingsPot(current || null);
        setPotError("");
      }
      setPotLoading(false);
    }

    load();
    const refresh = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(refresh);
    };
  }, []);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const visiblePlayers = useMemo(() => showAllPlayers ? players : players.slice(0, 5), [players, showAllPlayers]);
  const potAmount = kingsPot ? Math.max(0, Number(kingsPot.pot_amount || 0)) : null;
  const nextMilestone = potAmount === null ? 3000 : (Math.floor(potAmount / 3000) + 1) * 3000;
  const progress = potAmount === null ? 0 : Math.min(100, (potAmount / nextMilestone) * 100);
  const countdown = now ? getCountdown(getNextSaturday(now), now) : { days: 0, hours: 0, minutes: 0, seconds: 0 };

  return (
    <main className="shell redesign-shell">
      <SiteNavigation />
      <div className="competition-reference-page">
        <section className="competition-ref-pot" aria-label="The King's Pot">
          <div className="competition-ref-pot-title">
            <span className="competition-ref-crown">♛</span>
            <h1>THE KING'S POT</h1>
          </div>
          <div className="competition-ref-prize-label">WEEKLY PRIZE POOL</div>
          <div className="competition-ref-live"><i /> LIVE POT</div>
          <div className="competition-ref-pot-value">
            {potLoading ? <span className="competition-ref-loading-value">Loading…</span> : potError ? "Unavailable" : money(potAmount || 0)}
{potIncreaseKey > 0 && <span key={potIncreaseKey} className="competition-ref-chip">+₦200</span>}
          </div>
          <div className="competition-ref-milestone">
            <span>Next milestone</span>
            <strong>{money(nextMilestone)}</strong>
          </div>
          <div className="competition-ref-progress" role="progressbar" aria-label="Progress toward next King's Pot milestone" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
            <span style={{ width: progress + "%" }} />
          </div>
          {potError && <p className="competition-ref-data-error">{potError}</p>}
        </section>

        <div className="competition-ref-stats">
          <div className="competition-ref-stat">
            <span className="competition-ref-stat-icon">♧</span>
            <div><strong>{potLoading ? "—" : Number(kingsPot?.contributor_count || 0)}</strong><small>Players joined</small></div>
          </div>
          <div className="competition-ref-stat">
            <span className="competition-ref-stat-icon gold">◉</span>
            <div><strong>₦200</strong><small>Added per new player</small></div>
          </div>
        </div>

        <section className="competition-ref-grow">
          <h2>HOW IT WORKS</h2>
          <p>Every player who records their <strong>first qualifying one-rack ranking match</strong> this week adds <strong>₦200</strong> to The King's Pot.</p>
          <p><strong>TOP 5 PLAYERS</strong> qualify for the Saturday Final.</p>
          <p className="competition-ref-grow-winner">ONE WINNER. THE ENTIRE POT. 🏆</p>
        </section>

        <section className="competition-ref-final">
          <div className="competition-ref-final-head">
            <div className="competition-ref-final-icon" aria-hidden="true"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M8 3v4M16 3v4"/></svg></div>
            <div className="competition-ref-final-title"><small>WEEKLY FINAL</small><strong>Saturday</strong></div>
            <div className="competition-ref-count-label">FINAL STARTS IN</div>
          </div>
          <div className="competition-ref-countdown">
            {[
              ["DAYS", countdown.days],
              ["HRS", countdown.hours],
              ["MINS", countdown.minutes],
              ["SECS", countdown.seconds],
            ].map(([label, value]) => (
              <div className="competition-ref-count-unit" key={label}>
                <strong>{String(value).padStart(2, "0")}</strong>
                <small>{label}</small>
              </div>
            ))}
          </div>
          <div className="competition-ref-winner-note">
            <span>♛</span>
            <p><strong>The King takes it all.</strong> 100% of the pot goes to this week's champion.</p>
          </div>
        </section>

        <nav className="competition-ref-tabs" aria-label="Competition sections">
          <a className="active" href="#weekly-leaderboard"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3"/></svg>Leaderboard</a>
          <Link href="/hall-of-fame"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>Hall of Fame</Link>
          <Link href="/how-it-works"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/></svg>How it works</Link>
        </nav>

        <section className="competition-ref-leaderboard" id="weekly-leaderboard">
          <div className="competition-ref-leaderboard-heading">
            <h2>This week's leaderboard</h2>
          </div>
          <div className="competition-ref-table-head" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 92px 92px",alignItems:"center",gap:10,padding:"8px 12px 12px 112px",color:"#9aa69f",font:"11px 'DM Mono',monospace",letterSpacing:".14em"}}>
            <span>PLAYER</span><span style={{textAlign:"right"}}>RECORD</span><span style={{textAlign:"right"}}>RATING</span>
          </div>

          {loading ? (
            <p className="competition-ref-empty">Loading weekly standings…</p>
          ) : error ? (
            <p className="competition-ref-empty">{error}</p>
          ) : players.length === 0 ? (
            <p className="competition-ref-empty">No qualifying matches recorded this week yet. Be the first to enter the rankings.</p>
          ) : (
            <div className="competition-ref-rows">
              {visiblePlayers.map((player, index) => {
                const rank = index + 1;
                return (
                  <Link href={"/players/" + player.id} className={"competition-ref-player-row " + (rank === 1 ? "is-leader" : "")} key={player.id}
                    style={{display:"grid",gridTemplateColumns:"34px 42px minmax(0,1fr) 92px 92px",alignItems:"center",columnGap:10,minHeight:76,padding:"10px 12px",border:rank===1?"1.5px solid #9cbd55":"1px solid transparent",borderBottomColor:rank===1?"#9cbd55":"#26352b",borderRadius:rank===1?18:0,background:rank===1?"linear-gradient(90deg,rgba(200,241,105,.20),rgba(200,241,105,.05))":"transparent",color:"#f4f5f2",textDecoration:"none",width:"100%",boxSizing:"border-box"}}>
                    <span className={"competition-ref-rank rank-" + rank} style={{width:34,height:34,display:"grid",placeItems:"center",borderRadius:"50%",background:rank===1?"#f2c230":rank===2?"#3264cf":rank===3?"#d84838":rank===4?"#354b3e":"#354b3e",color:"#fff",fontSize:16,fontWeight:900,lineHeight:1,flexShrink:0}}><b>{rank}</b></span>
                    <Avatar player={player} rank={rank} />
                    <span className="competition-ref-player-name" style={{minWidth:0,display:"grid",gap:4}}>
                      <strong style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontSize:17,fontWeight:800,color:"#f4f5f2"}}>{player.username}</strong>
                      <small style={{display:"block",font:"12px 'DM Mono',monospace",letterSpacing:".08em",color:"#9aa69f"}}>{player.player_code}</small>
                    </span>
                    <span className="competition-ref-record" style={{display:"block",textAlign:"right",whiteSpace:"nowrap",fontSize:14,color:"#d5dad6"}}>{player.wins}W / {player.losses}L</span>
                    <strong className="competition-ref-rating" style={{display:"block",textAlign:"right",whiteSpace:"nowrap",fontSize:20,fontWeight:900,color:"#c8f169",fontVariantNumeric:"tabular-nums"}}>{Number(player.elo_rating || 0).toLocaleString("en-NG")}</strong>
                  </Link>
                );
              })}
            </div>
          )}

          <button type="button" onClick={() => setShowAllPlayers((current) => !current)} aria-expanded={showAllPlayers} className="competition-ref-full-link" style={{width:"calc(100% - 8px)",minHeight:66,display:"flex",alignItems:"center",justifyContent:"center",gap:12,margin:"18px 4px 0",padding:"12px 16px",border:0,borderRadius:18,background:"#c8f169",color:"#0a0e0c",fontSize:20,fontWeight:900,textAlign:"center",cursor:"pointer"}}>{showAllPlayers ? "Show less" : "View full leaderboard"} <span style={{fontSize:24}}>{showAllPlayers ? "↑" : "→"}</span></button>
        </section>
      </div>

      <style jsx>{`
        .competition-reference-page{width:100%;max-width:560px;margin:0 auto 110px;padding:0 14px 30px;box-sizing:border-box;color:#f4f5f2}
        .competition-ref-pot{position:relative;margin:14px 0 0;border:1.5px solid #d4a93a;border-radius:24px;padding:18px 16px 16px;background:linear-gradient(180deg,#1c1708,#0f120e);text-align:center;overflow:hidden;box-shadow:0 12px 35px #0005,inset 0 1px #fff0}
        .competition-ref-pot:before{content:"";position:absolute;inset:0;background:radial-gradient(ellipse at 50% 0%,#a77c1d22,transparent 65%);pointer-events:none}
        .competition-ref-pot-title{position:relative;display:flex;align-items:center;justify-content:center;gap:10px}
        .competition-ref-pot-title h1{margin:0;color:#e8c547;font-size:clamp(22px,5vw,28px);font-weight:900;font-style:italic;letter-spacing:-.04em}
        .competition-ref-crown{font-size:30px;color:#e8c547;line-height:1}
        .competition-ref-prize-label{display:inline-flex;margin-top:10px;padding:6px 14px;border-radius:6px;background:#e8c547;color:#0a0e0c;font-size:11px;font-weight:900;letter-spacing:.13em}
        .competition-ref-live{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;color:#c8f169;font-size:10px;font-weight:900;letter-spacing:.15em}
        .competition-ref-live i,.competition-ref-live-pill i{width:7px;height:7px;border-radius:50%;background:#c8f169;box-shadow:0 0 10px #c8f169;display:inline-block}.competition-ref-live i{animation:competition-live-blink 1.15s ease-in-out infinite}@keyframes competition-live-blink{0%,100%{opacity:1;transform:scale(1);box-shadow:0 0 10px #c8f169}50%{opacity:.28;transform:scale(.78);box-shadow:0 0 2px #c8f169}}
        .competition-ref-pot-value{position:relative;display:inline-block;min-height:65px;margin-top:1px;color:#fff;font-size:clamp(42px,12vw,58px);font-weight:900;line-height:1.18;letter-spacing:-.065em;font-variant-numeric:tabular-nums}
        .competition-ref-loading-value{font-size:20px;color:#aeb8af;letter-spacing:0}
        .competition-ref-chip{position:absolute;top:5px;right:-60px;color:#c8f169;font-size:12px;font-weight:900;opacity:0;animation:competition-chip-rise 3.6s ease-out infinite}
        .chip-two{animation-delay:1.2s}.chip-three{animation-delay:2.4s}
        @keyframes competition-chip-rise{0%{transform:translateY(12px) scale(.85);opacity:0}18%{opacity:1}80%{opacity:.9}100%{transform:translateY(-35px) scale(1.05);opacity:0}}
        .competition-ref-milestone{display:flex;justify-content:space-between;margin-top:6px;color:#b4beb8;font-size:11px}
        .competition-ref-milestone strong{color:#e8c547;font-weight:800}
        .competition-ref-progress{height:11px;margin-top:7px;padding:2px;border:1px solid #3a3320;border-radius:999px;background:#0a0e0c;overflow:hidden}
        .competition-ref-progress span{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#9bcf42,#e6c54b);box-shadow:0 0 10px #c8f16955;transition:width .5s ease}
        .competition-ref-data-error{margin:7px 0 0;color:#d9a86b;font-size:10px}
        .competition-ref-stats{display:flex;gap:10px;margin-top:12px}
        .competition-ref-stat{flex:1;min-width:0;display:flex;align-items:center;gap:11px;padding:13px 12px;border:1px solid #1f2a24;border-radius:15px;background:#101512}
        .competition-ref-stat-icon{flex:none;color:#c8f169;font-size:25px}.competition-ref-stat-icon.gold{color:#e8c547}
        .competition-ref-stat>div{min-width:0;display:grid;gap:4px}
        .competition-ref-stat strong{font-size:24px;line-height:1;font-weight:900;font-variant-numeric:tabular-nums}
        .competition-ref-stat small{color:#b4beb8;font-size:11px;letter-spacing:0}
        .competition-ref-grow{margin-top:12px;padding:15px 14px;border:1px solid #1f2a24;border-radius:17px;background:#101512;text-align:center}
        .competition-ref-grow h2{margin:0;font-size:clamp(17px,4.4vw,21px);font-weight:900;letter-spacing:-.04em}
        .competition-ref-grow h2 span{color:#c8f169}
        .competition-ref-grow p{margin:6px 0 0;color:#c9cfcb;font-size:12px;line-height:1.55}
        .competition-ref-final{margin-top:12px;padding:15px 14px;border:1px solid #24402f;border-radius:17px;background:#101512}
        .competition-ref-final-head{display:flex;align-items:center;gap:10px}
        .competition-ref-final-icon{color:#c8f169;display:flex;align-items:center;justify-content:center;line-height:1;flex:none}
        .competition-ref-final-title{display:grid;gap:2px}
        .competition-ref-final-title small{color:#c8f169;font-size:9px;font-weight:900;letter-spacing:.15em}
        .competition-ref-final-title strong{font-size:21px;line-height:1.1}
        .competition-ref-count-label{margin-left:auto;color:#9aa69f;font-size:11px;letter-spacing:.12em;text-align:right;white-space:nowrap}
        .competition-ref-countdown{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:13px}
        .competition-ref-count-unit{text-align:center}
        .competition-ref-count-unit strong{height:52px;display:grid;place-items:center;border:1px solid #2b3a31;border-radius:12px;background:#101512;font-size:24px;font-weight:900;font-variant-numeric:tabular-nums}
        .competition-ref-count-unit small{display:block;margin-top:4px;color:#9aa69f;font-size:9px;letter-spacing:.12em}
        .competition-ref-winner-note{display:flex;align-items:center;gap:9px;margin-top:13px;padding-top:11px;border-top:1px solid #1f2a24}
        .competition-ref-winner-note>span{color:#e8c547;font-size:23px}
        .competition-ref-winner-note p{margin:0;color:#d5dad6;font-size:11px;line-height:1.5}
        .competition-ref-winner-note strong{color:#e8c547}
        .competition-ref-tabs{display:flex;gap:3px;margin-top:15px;padding:4px;border:1px solid #1f2a24;border-radius:14px;background:#101512}
        .competition-ref-tabs a{flex:1;min-width:0;min-height:52px;display:flex;align-items:center;justify-content:center;gap:7px;border-radius:12px;color:#d5dad6;font-size:14px;font-weight:800;text-align:center}
        .competition-ref-tabs a svg{flex:none}
        .competition-ref-tabs a.active{background:#c8f169;color:#0a0e0c}
        .competition-ref-leaderboard{margin-top:12px;padding:14px 11px 13px;border:1px solid #24402f;border-radius:19px;background:linear-gradient(180deg,#112018,#0e1511)}
        .competition-ref-leaderboard-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px 8px}
        .competition-ref-leaderboard-heading h2{margin:0;font-size:22px;font-weight:900;letter-spacing:-.035em}
        .competition-ref-live-pill{display:flex;align-items:center;gap:5px;color:#c8f169;font-size:9px;font-weight:900;letter-spacing:.1em}
        .competition-ref-live-pill i{width:6px;height:6px}
        .competition-ref-table-head{display:grid;grid-template-columns:minmax(0,1fr) 58px 58px;gap:8px;padding:5px 8px 8px 68px;color:#9aa69f;font:9px/1.2 ui-monospace,SFMono-Regular,monospace;letter-spacing:.12em}
        .competition-ref-table-head span:nth-child(2),.competition-ref-table-head span:nth-child(3){text-align:right}
        .competition-ref-rows{display:grid;gap:2px}
        .competition-ref-player-row{min-width:0;min-height:55px;display:grid;grid-template-columns:26px 34px minmax(0,1fr) 58px 58px;align-items:center;gap:8px;padding:5px 8px;border:1px solid transparent;border-bottom-color:#1f2a24;border-radius:12px;color:#f4f5f2;text-decoration:none}
        .competition-ref-player-row.is-leader{border-color:#c8f1698c;background:linear-gradient(90deg,#c8f1692e,#c8f1690a);box-shadow:0 0 14px #c8f16912}
        .competition-ref-rank{width:25px;height:25px;display:grid;place-items:center;border-radius:50%;background:#35453a;color:#fff;font-size:11px;font-weight:900}
        .competition-ref-rank.rank-1{background:#f2c230;color:#10140d}.competition-ref-rank.rank-2{background:#8799aa;color:#10140d}.competition-ref-rank.rank-3{background:#b77b4d;color:#10140d}
        .competition-ref-avatar{position:relative;width:34px;height:34px;display:grid;place-items:center;overflow:visible;border:1px solid #405846;border-radius:50%;background:#1a2b20;color:#c8f169;font-size:13px;font-weight:900}
        .competition-ref-avatar img{width:100%;height:100%;border-radius:50%;object-fit:cover}
        .competition-ref-avatar i{position:absolute;right:-5px;top:-7px;color:#e8c547;font-size:12px;font-style:normal;text-shadow:0 1px 3px #000}
        .competition-ref-player-name{min-width:0;display:grid;gap:3px}
        .competition-ref-player-name strong{overflow:hidden;color:#f4f5f2;font-size:12px;font-weight:800;text-overflow:ellipsis;white-space:nowrap}
        .competition-ref-player-name small{color:#9aa69f;font:9px ui-monospace,SFMono-Regular,monospace}
        .competition-ref-record{color:#d5dad6;font-size:10px;text-align:right;white-space:nowrap}
        .competition-ref-rating{color:#c8f169;font-size:14px;font-weight:900;text-align:right;font-variant-numeric:tabular-nums}
        .competition-ref-empty{margin:0;padding:22px 10px;color:#aeb8af;font-size:12px;line-height:1.5;text-align:center}
        .competition-ref-qualifier-note{margin:10px 4px 0;color:#aab6ad;font-size:10px;line-height:1.55}
        .competition-ref-full-link{min-height:50px;display:flex;align-items:center;justify-content:center;gap:10px;margin:14px 4px 0;padding:0 14px;border:0;border-radius:14px;background:#c8f169;color:#0a0e0c;font-size:16px;font-weight:900;text-align:center}
        @media(min-width:700px){.competition-reference-page{max-width:600px;padding:0 20px 36px}.competition-ref-pot{padding:22px 20px}.competition-ref-stat{padding:16px}.competition-ref-final{padding:18px}.competition-ref-leaderboard{padding:17px 14px}.competition-ref-player-row{min-height:60px}.competition-ref-player-name strong{font-size:14px}.competition-ref-record{font-size:11px}.competition-ref-rating{font-size:16px}}
        @media(max-width:370px){.competition-reference-page{padding-left:10px;padding-right:10px}.competition-ref-pot{padding:16px 12px}.competition-ref-stat{gap:8px;padding:11px 9px}.competition-ref-stat strong{font-size:21px}.competition-ref-stat small{font-size:9px}.competition-ref-final{padding:13px 10px}.competition-ref-countdown{gap:5px}.competition-ref-count-unit strong{height:45px;font-size:20px}.competition-ref-tabs a{font-size:9px;gap:3px}.competition-ref-player-row{grid-template-columns:23px 30px minmax(0,1fr) 51px 53px;gap:6px;padding:5px 5px}.competition-ref-avatar{width:30px;height:30px}.competition-ref-table-head{grid-template-columns:minmax(0,1fr) 51px 53px;padding-left:62px}.competition-ref-player-name strong{font-size:11px}.competition-ref-record{font-size:9px}.competition-ref-rating{font-size:12px}}

        @media(max-width:520px){
          .competition-ref-leaderboard{padding:18px 12px 16px}
          .competition-ref-leaderboard-heading h2{font-size:clamp(21px,5.5vw,27px)}
          .competition-ref-table-head{grid-template-columns:minmax(0,1fr) 66px 66px!important;padding-left:96px!important;font-size:9px!important;gap:6px!important}
          .competition-ref-player-row{grid-template-columns:30px 36px minmax(0,1fr) 66px 66px!important;column-gap:6px!important;min-height:70px!important;padding:8px 7px!important}
          .competition-ref-player-row .competition-ref-avatar{width:36px!important;height:36px!important;flex-basis:36px!important}
          .competition-ref-player-name strong{font-size:clamp(12px,3.6vw,15px)!important}
          .competition-ref-player-name small{font-size:9px!important}
          .competition-ref-record{font-size:10px!important}
          .competition-ref-rating{font-size:clamp(13px,4vw,17px)!important}
          .competition-ref-full-link{min-height:58px!important;font-size:17px!important;border-radius:15px!important}
        }
        @media(max-width:370px){
          .competition-ref-table-head{grid-template-columns:minmax(0,1fr) 57px 59px!important;padding-left:88px!important}
          .competition-ref-player-row{grid-template-columns:27px 33px minmax(0,1fr) 57px 59px!important;column-gap:5px!important;padding:7px 5px!important}
          .competition-ref-player-row .competition-ref-avatar{width:33px!important;height:33px!important;flex-basis:33px!important}
          .competition-ref-record{font-size:9px!important}
          .competition-ref-rating{font-size:13px!important}
        }
        @media(max-width:520px){.competition-ref-chip{right:-68px;top:-4px;padding:7px 12px;font-size:13px}}\n        @media(prefers-reduced-motion:reduce){.competition-ref-chip{animation:none;opacity:1;transform:none}.competition-ref-progress span{transition:none}}
      `}</style>
    </main>
  );
}
