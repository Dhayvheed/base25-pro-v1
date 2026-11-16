"use client";

import { useEffect, useMemo, useState } from "react";
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
    <span className="competition-ref-avatar">
      {player.photo_url ? <img src={player.photo_url} alt="" /> : player.username?.[0]?.toUpperCase() || "?"}
      {rank === 1 && <i aria-label="Weekly leader">♛</i>}
    </span>
  );
}

export default function CompetitionPage() {
  const [players, setPlayers] = useState<WeeklyPlayer[]>([]);
  const [kingsPot, setKingsPot] = useState<KingsPot | null>(null);
  const [loading, setLoading] = useState(true);
  const [potLoading, setPotLoading] = useState(true);
  const [error, setError] = useState("");
  const [potError, setPotError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

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

  const topFive = useMemo(() => players.slice(0, 5), [players]);
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
            <span className="competition-ref-chip chip-one">+₦200</span>
            <span className="competition-ref-chip chip-two">+₦200</span>
            <span className="competition-ref-chip chip-three">+₦200</span>
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
          <h2>Bring more players. <span>Grow the pot.</span></h2>
          <p>Every new player who records their first qualifying one-rack ranking match this week adds ₦200 to The King's Pot.</p>
        </section>

        <section className="competition-ref-final">
          <div className="competition-ref-final-head">
            <div className="competition-ref-final-icon">▣</div>
            <div className="competition-ref-final-title"><small>WEEKLY FINAL</small><strong>Saturday</strong></div>
            <div className="competition-ref-count-label">NEXT SATURDAY IN</div>
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
            <p><strong>The King takes it all.</strong> 100% of the pot goes to this week's Saturday Champion.</p>
          </div>
        </section>

        <nav className="competition-ref-tabs" aria-label="Competition sections">
          <a className="active" href="#weekly-leaderboard"><span>▥</span>Leaderboard</a>
          <Link href="/hall-of-fame"><span>♛</span>Hall of Fame</Link>
          <Link href="/how-it-works"><span>ⓘ</span>How it works</Link>
        </nav>

        <section className="competition-ref-leaderboard" id="weekly-leaderboard">
          <div className="competition-ref-leaderboard-heading">
            <h2>This week's leaderboard</h2>
            <span className="competition-ref-live-pill"><i /> LIVE</span>
          </div>
          <div className="competition-ref-table-head">
            <span>PLAYER</span><span>RECORD</span><span>RATING</span>
          </div>

          {loading ? (
            <p className="competition-ref-empty">Loading weekly standings…</p>
          ) : error ? (
            <p className="competition-ref-empty">{error}</p>
          ) : topFive.length === 0 ? (
            <p className="competition-ref-empty">No qualifying matches recorded this week yet. Be the first to enter the rankings.</p>
          ) : (
            <div className="competition-ref-rows">
              {topFive.map((player, index) => {
                const rank = index + 1;
                return (
                  <Link href={"/players/" + player.id} className={"competition-ref-player-row " + (rank === 1 ? "is-leader" : "")} key={player.id}>
                    <span className={"competition-ref-rank rank-" + rank}><b>{rank}</b></span>
                    <Avatar player={player} rank={rank} />
                    <span className="competition-ref-player-name"><strong>{player.username}</strong><small>{player.player_code}</small></span>
                    <span className="competition-ref-record">{player.wins}W / {player.losses}L</span>
                    <strong className="competition-ref-rating">{Number(player.elo_rating || 0).toLocaleString("en-NG")}</strong>
                  </Link>
                );
              })}
            </div>
          )}

          <p className="competition-ref-qualifier-note">Top five qualify for the Saturday final. The weekly leaderboard runs Saturday to Friday, with ratings resetting every Saturday.</p>
          <Link href="/leaderboard" className="competition-ref-full-link">View full leaderboard <span>→</span></Link>
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
        .competition-ref-live i,.competition-ref-live-pill i{width:7px;height:7px;border-radius:50%;background:#c8f169;box-shadow:0 0 10px #c8f169;display:inline-block}
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
        .competition-ref-final-icon{color:#c8f169;font-size:25px;line-height:1}
        .competition-ref-final-title{display:grid;gap:2px}
        .competition-ref-final-title small{color:#c8f169;font-size:9px;font-weight:900;letter-spacing:.15em}
        .competition-ref-final-title strong{font-size:21px;line-height:1.1}
        .competition-ref-count-label{margin-left:auto;color:#9aa69f;font-size:9px;letter-spacing:.12em;text-align:right}
        .competition-ref-countdown{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:13px}
        .competition-ref-count-unit{text-align:center}
        .competition-ref-count-unit strong{height:49px;display:grid;place-items:center;border:1px solid #2b3a31;border-radius:10px;background:#0c120e;font-size:23px;font-weight:900;font-variant-numeric:tabular-nums}
        .competition-ref-count-unit small{display:block;margin-top:4px;color:#9aa69f;font-size:9px;letter-spacing:.12em}
        .competition-ref-winner-note{display:flex;align-items:center;gap:9px;margin-top:13px;padding-top:11px;border-top:1px solid #1f2a24}
        .competition-ref-winner-note>span{color:#e8c547;font-size:23px}
        .competition-ref-winner-note p{margin:0;color:#d5dad6;font-size:11px;line-height:1.5}
        .competition-ref-winner-note strong{color:#e8c547}
        .competition-ref-tabs{display:flex;gap:3px;margin-top:15px;padding:4px;border:1px solid #1f2a24;border-radius:14px;background:#101512}
        .competition-ref-tabs a{flex:1;min-width:0;min-height:43px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:10px;color:#d5dad6;font-size:11px;font-weight:800;text-align:center}
        .competition-ref-tabs a span{font-size:15px}
        .competition-ref-tabs a.active{background:#c8f169;color:#0a0e0c}
        .competition-ref-leaderboard{margin-top:12px;padding:14px 11px 13px;border:1px solid #24402f;border-radius:19px;background:linear-gradient(180deg,#112018,#0e1511)}
        .competition-ref-leaderboard-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 4px 8px}
        .competition-ref-leaderboard-heading h2{margin:0;font-size:17px;font-weight:900;letter-spacing:-.035em}
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
        .competition-ref-full-link{display:flex;align-items:center;justify-content:space-between;margin:10px 4px 0;padding-top:10px;border-top:1px solid #26352b;color:#c8f169;font-size:11px;font-weight:900}
        @media(min-width:700px){.competition-reference-page{max-width:600px;padding:0 20px 36px}.competition-ref-pot{padding:22px 20px}.competition-ref-stat{padding:16px}.competition-ref-final{padding:18px}.competition-ref-leaderboard{padding:17px 14px}.competition-ref-player-row{min-height:60px}.competition-ref-player-name strong{font-size:14px}.competition-ref-record{font-size:11px}.competition-ref-rating{font-size:16px}}
        @media(max-width:370px){.competition-reference-page{padding-left:10px;padding-right:10px}.competition-ref-pot{padding:16px 12px}.competition-ref-stat{gap:8px;padding:11px 9px}.competition-ref-stat strong{font-size:21px}.competition-ref-stat small{font-size:9px}.competition-ref-final{padding:13px 10px}.competition-ref-countdown{gap:5px}.competition-ref-count-unit strong{height:45px;font-size:20px}.competition-ref-tabs a{font-size:9px;gap:3px}.competition-ref-player-row{grid-template-columns:23px 30px minmax(0,1fr) 51px 53px;gap:6px;padding:5px 5px}.competition-ref-avatar{width:30px;height:30px}.competition-ref-table-head{grid-template-columns:minmax(0,1fr) 51px 53px;padding-left:62px}.competition-ref-player-name strong{font-size:11px}.competition-ref-record{font-size:9px}.competition-ref-rating{font-size:12px}}
        @media(prefers-reduced-motion:reduce){.competition-ref-chip{animation:none;display:none}.competition-ref-progress span{transition:none}}
      `}</style>
    </main>
  );
}
