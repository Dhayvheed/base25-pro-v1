"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Champion = {
  id: string;
  week_start: string;
  week_end: string;
  player_id: string;
  prize_amount: number;
  payout_confirmed_at: string | null;
  players?: { username: string; player_code: string; photo_url: string | null } | null;
};
type KingsPot = { pot_amount: number; contributor_count: number; week_start: string };

const money = (value: number) => "₦" + Number(value || 0).toLocaleString("en-NG");
const dateLabel = (value: string) => new Date(value + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

function nextSaturday(now: Date) {
  const target = new Date(now);
  target.setHours(0, 0, 0, 0);
  target.setDate(target.getDate() + ((6 - target.getDay() + 7) % 7 || 7));
  return target;
}
function championInitial(champion: Champion) {
  return champion.players?.username?.trim()?.[0]?.toUpperCase() || "B";
}

export default function HallOfFamePage() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"all" | "earners" | "history">("all");
  const [search, setSearch] = useState("");
  const [pot, setPot] = useState<KingsPot | null>(null);
  const [potLoading, setPotLoading] = useState(true);
  const [potError, setPotError] = useState("");
  const [potPulse, setPotPulse] = useState(0);
  const previousPot = useRef<number | null>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    async function loadChampions() {
      if (!supabase) {
        setError("Championship records are temporarily unavailable.");
        setLoading(false);
        return;
      }
      const { data, error: queryError } = await supabase
        .from("weekly_champions")
        .select("id,week_start,week_end,player_id,prize_amount,payout_confirmed_at,players(username,player_code,photo_url)")
        .order("week_start", { ascending: false })
        .limit(100);
      if (!active) return;
      if (queryError) setError("Championship records could not be loaded. Please try again shortly.");
      else setError("");
      setChampions((data || []) as unknown as Champion[]);
      setLoading(false);
    }
    loadChampions();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadPot() {
      if (!supabase) { setPotError("The King's Pot is temporarily unavailable."); setPotLoading(false); return; }
      const { data, error: queryError } = await supabase.rpc("get_current_kings_pot");
      if (!active) return;
      if (queryError) setPotError("The live prize pool is temporarily unavailable.");
      else {
        const raw = data as KingsPot[] | KingsPot | null;
        const current = Array.isArray(raw) ? raw[0] : raw;
        const amount = Math.max(0, Number(current?.pot_amount || 0));
        if (previousPot.current !== null && amount > previousPot.current) setPotPulse((key) => key + 1);
        previousPot.current = amount;
        setPot(current || null);
        setPotError("");
      }
      setPotLoading(false);
    }
    loadPot();
    const refresh = window.setInterval(loadPot, 15000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  useEffect(() => {
    const tick = () => setNow(new Date());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const totalPrize = champions.reduce((sum, row) => sum + Number(row.prize_amount || 0), 0);
  const latest = champions[0] || null;
  const earners = useMemo(() => {
    const grouped = new Map<string, { player_id: string; username: string; player_code: string; photo_url: string | null; total: number; wins: number }>();
    champions.forEach((row) => {
      const key = row.player_id;
      const current = grouped.get(key) || {
        player_id: key,
        username: row.players?.username || "BASE25 Champion",
        player_code: row.players?.player_code || "BASE25 PLAYER",
        photo_url: row.players?.photo_url || null,
        total: 0,
        wins: 0,
      };
      current.total += Number(row.prize_amount || 0);
      current.wins += 1;
      grouped.set(key, current);
    });
    return [...grouped.values()].sort((a, b) => b.total - a.total);
  }, [champions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return champions.filter((row) => !q ||
      row.players?.username?.toLowerCase().includes(q) ||
      row.players?.player_code?.toLowerCase().includes(q) ||
      dateLabel(row.week_start).toLowerCase().includes(q)
    );
  }, [champions, search]);

  const countdown = useMemo(() => {
    if (!now) return ["--", "--", "--", "--"];
    const seconds = Math.max(0, Math.floor((nextSaturday(now).getTime() - now.getTime()) / 1000));
    return [String(Math.floor(seconds / 86400)).padStart(2, "0"), String(Math.floor((seconds % 86400) / 3600)).padStart(2, "0"), String(Math.floor((seconds % 3600) / 60)).padStart(2, "0"), String(seconds % 60).padStart(2, "0")];
  }, [now]);

  return (
    <main className="shell redesign-shell hof-page">
      <SiteNavigation />
      <div className="hof-content">
        <section className="hof-intro">
          <div className="hof-title-line"><span className="hof-title-crown" aria-hidden="true">♛</span><h1>HALL OF <span>FAME</span></h1></div>
          <p className="hof-tagline">Every Saturday champion is remembered here, permanently.</p>
        </section>

        {error && <p className="hof-error">{error}</p>}
        {loading ? <div className="hof-loading">Loading the champions’ legacy…</div> : latest ? (
          <section className="hof-latest">
            <div className="hof-card-heading"><span>🏆 &nbsp; LATEST CHAMPION</span><b>WEEK {champions.length.toString().padStart(2, "0")}</b></div>
            <div className="hof-winner">
              <div className="hof-winner-main">
                <div className="hof-winner-avatar-wrap">
                  <span className="hof-winner-crown">♛</span>
                  <div className="hof-winner-avatar">{latest.players?.photo_url ? <img src={latest.players.photo_url} alt="" /> : championInitial(latest)}</div>
                  <span className="hof-record-number">#{String(champions.length).padStart(3, "0")}</span>
                </div>
                <div className="hof-winner-info">
                  <small>THE INAUGURAL KING</small>
                  <h2>{latest.players?.username || "BASE25 Champion"}</h2>
                  <p className="hof-player-code">{latest.players?.player_code || "BASE25 PLAYER"}</p>
                  <span className="hof-title-chip">🏆 &nbsp; Saturday Champion</span>
                </div>
              </div>
              <div className="hof-week-dates"><span aria-hidden="true">▣</span> {dateLabel(latest.week_start)} – {dateLabel(latest.week_end)}</div>
              <div className="hof-prize">
                <small>PRIZE WON</small>
                <strong>{money(latest.prize_amount)}</strong>
              </div>
            </div>
          </section>
        ) : (
          <section className="hof-empty-state">
            <span>♛</span><small>THE FIRST CHAPTER</small>
            <h2>The throne is waiting.</h2>
            <p>The first Saturday champion will be remembered here permanently. The crown is waiting for its owner.</p>
          </section>
        )}

        <section className="hof-summary">
          <div><span className="hof-summary-icon">♛</span><div><strong>{loading ? "—" : champions.length}</strong><small>CHAMPIONS CROWNED</small></div></div>
          <div><span className="hof-summary-icon gold">₦</span><div><strong>{loading ? "—" : money(totalPrize)}</strong><small>PRIZES AWARDED</small></div></div>
        </section>

        <section className="hof-records">
          <div className="hof-tabs" role="tablist" aria-label="Hall of Fame views">
            <button type="button" role="tab" aria-selected={tab === "all"} className={tab === "all" ? "active" : ""} onClick={() => setTab("all")}>All Champions</button>
            <button type="button" role="tab" aria-selected={tab === "earners"} className={tab === "earners" ? "active" : ""} onClick={() => setTab("earners")}>Top Earners</button>
            <button type="button" role="tab" aria-selected={tab === "history"} className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>History</button>
          </div>

          {tab === "earners" ? (
            <>
              <div className="hof-record-heading"><div><small>CAREER PRIZE RECORDS</small><h2>Top <span>Earners</span></h2></div><span className="hof-record-count">{earners.length} PLAYERS</span></div>
              <div className="hof-list">
                {earners.length ? earners.map((player, index) => <article className="hof-row hof-earner-row" key={player.player_id}>
                  <b className="hof-rank">#{index + 1}</b>
                  <div className="hof-row-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.username[0]?.toUpperCase() || "B"}</div>
                  <div className="hof-row-player"><strong>{player.username}</strong><small>{player.player_code} · {player.wins} win{player.wins === 1 ? "" : "s"}</small></div>
                  <strong className="hof-row-prize">{money(player.total)}</strong>
                </article>) : <div className="hof-no-records">No prize earnings have been recorded yet.</div>}
              </div>
            </>
          ) : (
            <>
              <div className="hof-record-heading"><div><small>{tab === "history" ? "THE COMPLETE ARCHIVE" : "THE RECORD BOOK"}</small><h2>{tab === "history" ? <>Championship <span>History</span></> : <>Champions <span>Record</span></>}</h2></div><span className="hof-record-count">{filtered.length} RECORDS</span></div>
              <div className="hof-list-tools"><span>NEWEST FIRST</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a champion…" aria-label="Search champions" /></div>
              <div className="hof-list">
                {filtered.length ? filtered.map((row) => {
                  const index = champions.findIndex((item) => item.id === row.id);
                  return <article className="hof-row" key={row.id}>
                    <b className="hof-rank">#{String(index + 1).padStart(3, "0")}</b>
                    <div className="hof-row-avatar">{row.players?.photo_url ? <img src={row.players.photo_url} alt="" /> : championInitial(row)}</div>
                    <div className="hof-row-player"><strong>{row.players?.username || "BASE25 Champion"}</strong><small>{row.players?.player_code || "BASE25 PLAYER"} · {dateLabel(row.week_start)}</small></div>
                    <strong className="hof-row-prize">{money(row.prize_amount)}</strong>
                    {index === 0 && <span className="hof-latest-label">LATEST</span>}
                  </article>;
                }) : <div className="hof-no-records">No champions have been recorded yet.</div>}
              </div>
              <div className="hof-total"><span>TOTAL PRIZE MONEY AWARDED</span><strong>{money(totalPrize)}</strong></div>
            </>
          )}
        </section>

        <section className="hof-next-crown">
          <div className="hof-next-label"><i /> NEXT CROWN · SATURDAY</div>
          <h2>THE KING’S POT</h2>
          <strong className="hof-pot-value">{potLoading ? "Loading…" : potError ? "Unavailable" : money(Number(pot?.pot_amount || 0))}{potPulse > 0 && <span key={potPulse} className="hof-pot-chip">+₦200</span>}</strong>
          <p>Could be yours. The next champion is decided on Saturday.</p>
          <div className="hof-next-countdown">{countdown.map((value, index) => <div key={index}><b>{value}</b><small>{["DAYS", "HRS", "MINS", "SECS"][index]}</small></div>)}</div>
          {potError && <small className="hof-pot-error">{potError}</small>}
          <Link href="/competition" className="hof-competition-link">View the competition <span>→</span></Link>
        </section>
      </div>

      <style jsx global>{`
        .hof-page{max-width:1240px;padding-bottom:100px}.hof-content{width:100%;max-width:760px;margin:0 auto;color:#f4f5f2}
        .hof-intro{text-align:center;padding:34px 16px 25px}.hof-crown-icon{color:#e8c547;font-size:38px;line-height:1;text-shadow:0 0 22px #e8c54755}
        .hof-eyebrow{margin:13px 0 8px;color:#c8f169;font:10px 'DM Mono',monospace;letter-spacing:.2em}
        .hof-intro h1{margin:0;font-size:clamp(35px,7vw,52px);font-weight:900;letter-spacing:-.065em;line-height:1.05}.hof-intro h1 span{color:#e8c547}
        .hof-tagline{margin:10px 0 0;color:#a6b0a8;font-size:13px;line-height:1.6}
        .hof-latest{position:relative;overflow:hidden;margin:10px 0 14px;padding:18px;border:1px solid #b28b35;border-radius:22px;background:radial-gradient(ellipse at 80% 30%,#b68b2929,transparent 48%),linear-gradient(145deg,#1d1a10,#101511 68%);box-shadow:0 12px 36px #0006,inset 0 1px #fff1}
        .hof-card-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;color:#e8c547;font:700 10px 'DM Mono',monospace;letter-spacing:.12em}.hof-card-heading b{color:#b7c0b7;font-size:9px}
        .hof-winner{display:grid;grid-template-columns:112px minmax(0,1fr) 142px;align-items:center;gap:17px;padding:23px 0 16px}
        .hof-winner-avatar-wrap{position:relative;display:grid;justify-items:center;padding-top:9px}.hof-winner-crown{position:absolute;top:-8px;color:#e8c547;font-size:25px;text-shadow:0 0 14px #e8c54766}
        .hof-winner-avatar{width:91px;height:91px;display:grid;place-items:center;overflow:hidden;border:3px solid #c8f169;border-radius:22px;background:#1c2a20;color:#c8f169;font-size:34px;font-weight:900;box-shadow:0 0 20px #c8f16922;clip-path:polygon(25% 0,75% 0,100% 25%,100% 75%,75% 100%,25% 100%,0 75%,0 25%)}
        .hof-winner-avatar img,.hof-row-avatar img{width:100%;height:100%;object-fit:cover}
        .hof-record-number{margin-top:-10px;z-index:1;padding:5px 13px;border:1px solid #d4a93a;border-radius:999px;background:linear-gradient(90deg,#785718,#e8c547,#785718);color:#16140c;font:900 10px 'DM Mono',monospace}
        .hof-winner-info{min-width:0}.hof-winner-info>small{color:#c8f169;font:9px 'DM Mono',monospace;letter-spacing:.15em}
        .hof-winner-info h2{margin:5px 0 3px;overflow-wrap:anywhere;font-size:clamp(20px,4vw,29px);font-weight:900;letter-spacing:-.05em;text-transform:uppercase}
        .hof-player-code{margin:0;color:#a4afa6;font:11px 'DM Mono',monospace}.hof-title-chip{display:inline-flex;margin-top:11px;padding:6px 9px;border:1px solid #76602c;border-radius:6px;background:#b68b291c;color:#efd276;font-size:10px;font-weight:800}
        .hof-week-dates{margin:9px 0 0;color:#aeb8af;font-size:10px}
        .hof-prize{min-width:0;display:grid;justify-items:center;gap:6px;padding:13px 7px;border:1px solid #a9893f;border-radius:13px;background:linear-gradient(160deg,#5c451b55,#10130f);text-align:center}
        .hof-prize-crown{color:#e8c547;font-size:20px}.hof-prize small{color:#e8c547;font:700 9px 'DM Mono',monospace;letter-spacing:.13em}
        .hof-prize strong{color:#f1d36d;font:900 clamp(15px,2.7vw,21px) 'DM Mono',monospace;overflow-wrap:anywhere}.hof-prize>span:last-child{color:#9ca69f;font:7px 'DM Mono',monospace;letter-spacing:.08em}
        .hof-summary{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin:14px 0 27px}
        .hof-summary>div{display:flex;align-items:center;gap:13px;padding:17px 15px;border:1px solid #26352b;border-radius:15px;background:linear-gradient(130deg,#151e18,#0e1310)}
        .hof-summary-icon{color:#c8f169;font-size:28px}.hof-summary-icon.gold{color:#e8c547}
        .hof-summary strong{display:block;font-size:23px;font-weight:900;line-height:1.1;font-variant-numeric:tabular-nums}.hof-summary small{display:block;margin-top:5px;color:#9aa69f;font:9px 'DM Mono',monospace;letter-spacing:.08em}
        .hof-records{margin-top:0}.hof-tabs{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:5px;border:1px solid #26352b;border-radius:14px;background:#101612}
        .hof-tabs button{min-height:43px;margin:0;padding:9px 5px;border:0;border-radius:10px;background:transparent;color:#aeb8af;font-size:12px;font-weight:800}
        .hof-tabs button.active{background:#c8f169;color:#0a0e0c;box-shadow:0 3px 12px #c8f16922}
        .hof-record-heading{display:flex;justify-content:space-between;align-items:end;gap:12px;margin:24px 2px 14px}.hof-record-heading small{color:#9aa69f;font:9px 'DM Mono',monospace;letter-spacing:.15em}
        .hof-record-heading h2{margin:6px 0 0;font-size:26px;letter-spacing:-.05em}.hof-record-heading h2 span{color:#c8f169}
        .hof-record-count{color:#9aa69f;font:9px 'DM Mono',monospace;white-space:nowrap}
        .hof-list-tools{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;padding:10px 12px;border:1px solid #26352b;border-radius:10px;background:#101612;color:#9aa69f;font:9px 'DM Mono',monospace;letter-spacing:.1em}
        .hof-list-tools input{width:min(260px,60%);padding:9px 10px;border-radius:7px;font:11px Manrope,Arial,sans-serif;letter-spacing:0}
        .hof-list{display:grid;gap:8px}.hof-row{position:relative;display:grid;grid-template-columns:42px 40px minmax(0,1fr) auto;align-items:center;gap:11px;min-height:70px;padding:11px 13px;border:1px solid #253229;border-radius:12px;background:linear-gradient(105deg,#151c17,#0d120f)}
        .hof-rank{color:#e8c547;font:700 12px 'DM Mono',monospace}.hof-row-avatar{width:38px;height:38px;display:grid;place-items:center;overflow:hidden;border:2px solid #829f43;border-radius:50%;background:#1b291f;color:#c8f169;font-weight:900}
        .hof-row-player{min-width:0}.hof-row-player strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;text-transform:uppercase}.hof-row-player small{display:block;margin-top:4px;color:#9aa69f;font:9px 'DM Mono',monospace}
        .hof-row-prize{color:#c8f169;font:800 13px 'DM Mono',monospace;white-space:nowrap}.hof-latest-label{position:absolute;right:12px;top:-7px;padding:3px 7px;border:1px solid #789b38;border-radius:5px;background:#182416;color:#c8f169;font:8px 'DM Mono',monospace}
        .hof-earner-row{grid-template-columns:42px 40px minmax(0,1fr) auto}.hof-no-records,.hof-loading,.hof-empty-state{padding:28px 18px;border:1px solid #26352b;border-radius:12px;background:#101612;color:#aab4ac;text-align:center;font-size:12px;line-height:1.7}
        .hof-total{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;padding:15px;border:1px solid #34482b;border-radius:10px;background:#131b14}.hof-total span{color:#aab4ac;font:9px 'DM Mono',monospace;letter-spacing:.08em}.hof-total strong{color:#c8f169;font:800 15px 'DM Mono',monospace}
        .hof-next-crown{position:relative;overflow:hidden;margin:28px 0 20px;padding:23px 19px 19px;border:1px solid #d4a93a;border-radius:22px;background:radial-gradient(ellipse at 50% 0%,#b88a2a35,transparent 62%),linear-gradient(180deg,#1b180e,#0e130f);text-align:center;box-shadow:0 12px 34px #0005}
        .hof-next-label{display:flex;align-items:center;justify-content:center;gap:8px;color:#c8f169;font:900 9px 'DM Mono',monospace;letter-spacing:.16em}.hof-next-label i{width:7px;height:7px;border-radius:50%;background:#c8f169;box-shadow:0 0 10px #c8f169;animation:hof-live 1.1s ease-in-out infinite}
        @keyframes hof-live{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.25;transform:scale(.8)}}
        .hof-next-crown h2{margin:12px 0 0;color:#e8c547;font-size:17px;font-weight:900;letter-spacing:.08em}
        .hof-pot-value{position:relative;display:inline-block;margin-top:5px;color:#fff;font-size:clamp(39px,10vw,54px);font-weight:900;letter-spacing:-.06em;font-variant-numeric:tabular-nums}
        .hof-pot-chip{position:absolute;top:4px;right:-65px;color:#c8f169;font-size:12px;animation:hof-chip-rise 2.4s ease-out both}@keyframes hof-chip-rise{0%{opacity:0;transform:translateY(12px)}20%{opacity:1}100%{opacity:0;transform:translateY(-28px)}}
        .hof-next-crown>p{margin:6px 0 0;color:#b7c1b8;font-size:12px}.hof-next-countdown{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;max-width:400px;margin:16px auto}
        .hof-next-countdown>div{padding:9px 5px;border:1px solid #2b392f;border-radius:9px;background:#101612}.hof-next-countdown b{display:block;font-size:21px;font-weight:900;font-variant-numeric:tabular-nums}.hof-next-countdown small{display:block;margin-top:3px;color:#9aa69f;font:8px 'DM Mono',monospace}
        .hof-pot-error{display:block;color:#d7a85d;margin:8px 0}.hof-competition-link{min-height:48px;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:13px;padding:10px 15px;border-radius:12px;background:#c8f169;color:#0a0e0c;font-size:14px;font-weight:900}.hof-competition-link span{font-size:20px}
        .hof-error{padding:11px 13px;border:1px solid #5a4827;border-radius:8px;background:#211b10;color:#e8c547;font-size:12px}
        .hof-empty-state{margin:10px 0 14px;padding:38px 20px;background:radial-gradient(ellipse at 50% 0%,#c8f16915,transparent 65%),#101612}.hof-empty-state>span{display:block;color:#e8c547;font-size:42px}.hof-empty-state>small{color:#c8f169;font:9px 'DM Mono',monospace;letter-spacing:.15em}.hof-empty-state h2{margin:9px 0;color:#f4f5f2;font-size:25px}.hof-empty-state p{max-width:420px;margin:0 auto}
        @media(max-width:600px){.hof-page{padding-left:14px;padding-right:14px}.hof-content{max-width:520px}.hof-intro{padding:28px 8px 21px}.hof-intro h1{font-size:clamp(34px,9vw,46px)}.hof-tagline{font-size:11px}.hof-latest{padding:15px 12px;border-radius:18px}.hof-card-heading{font-size:9px}.hof-winner{grid-template-columns:78px minmax(0,1fr) 99px;gap:9px;padding:22px 0 14px}.hof-winner-avatar{width:67px;height:67px;font-size:25px}.hof-winner-crown{font-size:20px}.hof-record-number{font-size:8px;padding:4px 9px}.hof-winner-info h2{font-size:clamp(16px,4.7vw,22px)}.hof-winner-info>small{font-size:7px}.hof-player-code{font-size:9px}.hof-title-chip{font-size:8px;padding:5px 6px}.hof-week-dates{font-size:8px}.hof-prize{padding:10px 3px;gap:5px}.hof-prize-crown{font-size:16px}.hof-prize small{font-size:7px}.hof-prize strong{font-size:clamp(12px,3.5vw,16px)}.hof-prize>span:last-child{font-size:6px}.hof-summary{gap:8px;margin:12px 0 21px}.hof-summary>div{gap:8px;padding:13px 9px}.hof-summary-icon{font-size:22px}.hof-summary strong{font-size:17px}.hof-summary small{font-size:7px;letter-spacing:.03em}.hof-tabs button{font-size:10px}.hof-record-heading h2{font-size:22px}.hof-list-tools{align-items:stretch;flex-direction:column}.hof-list-tools input{width:100%}.hof-row{grid-template-columns:31px 34px minmax(0,1fr) auto;gap:8px;padding:10px 8px;min-height:64px}.hof-rank{font-size:10px}.hof-row-avatar{width:32px;height:32px}.hof-row-player strong{font-size:10px}.hof-row-player small{font-size:8px}.hof-row-prize{font-size:10px}.hof-total{padding:12px 10px}.hof-total span{font-size:7px}.hof-total strong{font-size:12px}.hof-next-crown{padding:20px 13px 15px}.hof-next-countdown{gap:5px}.hof-next-countdown b{font-size:18px}}
        @media(max-width:360px){.hof-winner{grid-template-columns:66px minmax(0,1fr) 88px;gap:7px}.hof-winner-avatar{width:59px;height:59px}.hof-winner-info h2{font-size:15px}.hof-prize strong{font-size:11px}.hof-row{grid-template-columns:27px 30px minmax(0,1fr) auto;gap:6px}.hof-row-avatar{width:29px;height:29px}.hof-row-prize{font-size:9px}}

        /* Hall of Fame: match the supplied 390px reference composition */
        .hof-page{background:#0a0e0c}
        .hof-page:before{content:"";position:absolute;z-index:0;top:0;left:0;right:0;height:430px;pointer-events:none;background:radial-gradient(ellipse at 50% 20%,#1f7a42 0%,#0f3d22 38%,rgba(10,14,12,0) 75%)}
        .hof-content{position:relative;z-index:1;max-width:760px}
        .hof-intro{padding:18px 20px 0;text-align:center}
        .hof-title-line{display:flex;align-items:center;justify-content:center;gap:10px;color:#e8c547}
        .hof-title-crown{font-size:29px;line-height:1;text-shadow:0 0 14px #e8c54755}
        .hof-intro h1{margin:0;color:#e8c547;font-size:clamp(25px,6.7vw,34px);font-weight:800;font-style:italic;letter-spacing:-.5px;line-height:1.15}
        .hof-intro h1 span{color:#e8c547}
        .hof-tagline{margin:6px 0 0;color:#c9cfcb;font-size:14px;line-height:1.45}
        .hof-latest{margin:18px 20px 0;padding:16px;border:1.5px solid #d4a93a;border-radius:24px;background:linear-gradient(180deg,#1c1708,#0f120e);box-shadow:0 0 28px rgba(232,197,71,.2);overflow:hidden}
        .hof-card-heading{font-size:12px;letter-spacing:1.5px}
        .hof-card-heading b{font:700 11px 'DM Mono',monospace;letter-spacing:1px;color:#d5dad6}
        .hof-winner{display:flex;flex-direction:column;gap:0;padding:0}
        .hof-winner-main{display:flex;align-items:center;gap:16px;margin-top:16px}
        .hof-winner-avatar-wrap{position:relative;width:112px;flex:none;padding:0}
        .hof-winner-avatar{width:112px;height:126px;border:0;border-radius:0;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%);background:linear-gradient(160deg,#f5d547,#9a6f12);box-shadow:none;font-size:48px}
        .hof-winner-avatar img{width:106px;height:120px;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
        .hof-winner-crown{top:-12px;left:50%;transform:translateX(-50%);z-index:2;color:#e8c547;font-size:28px}
        .hof-record-number{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);z-index:3;margin:0;width:64px;padding:3px 0;border:0;border-radius:8px;background:linear-gradient(180deg,#f5d547,#c99a1e);color:#0a0e0c;text-align:center;font:800 14px Inter,system-ui,sans-serif}
        .hof-winner-info{flex:1;min-width:0}
        .hof-winner-info>small{color:#9aa69f;font:11px 'DM Mono',monospace;letter-spacing:2px}
        .hof-winner-info h2{margin:4px 0 0;font-size:34px;font-weight:800;letter-spacing:-1px;line-height:1.05;text-transform:uppercase}
        .hof-player-code{margin-top:2px;font:12px 'DM Mono',monospace;color:#9aa69f}
        .hof-title-chip{margin-top:8px;padding:0;border:0;background:none;color:#e8c547;font-size:15px;font-weight:700}
        .hof-week-dates{display:flex;align-items:center;justify-content:center;gap:8px;margin:20px 0 0;color:#c9cfcb;font-size:13px}
        .hof-week-dates span{font-size:16px}
        .hof-prize{display:grid;justify-items:center;gap:0;margin-top:12px;padding:10px;border:1px solid #d4a93a;border-radius:16px;background:rgba(232,197,71,.08);text-align:center}
        .hof-prize small{color:#d5dad6;font:700 12px Inter,system-ui,sans-serif;letter-spacing:1.5px}
        .hof-prize strong{margin-top:2px;color:#f5d547;font:800 38px Inter,system-ui,sans-serif;letter-spacing:-1px;text-shadow:0 0 18px rgba(245,213,71,.35)}
        .hof-prize>span:last-child{display:none}
        .hof-summary{margin:12px 20px 0;gap:10px}
        .hof-summary>div{padding:14px;background:#101512;border:1px solid #1f2a24;border-radius:16px;gap:12px}
        .hof-summary strong{font-size:26px}
        .hof-summary small{font:13px Inter,system-ui,sans-serif;letter-spacing:0;color:#b4beb8}
        .hof-tabs{margin:16px 20px 0;height:52px;padding:4px;gap:4px;border-radius:16px;background:#101512;border:1px solid #1f2a24}
        .hof-tabs button{height:100%;min-height:0;font-size:14px}
        .hof-tabs button.active{flex:1.2}
        .hof-records{margin:12px 20px 0;padding:16px 12px;border:1px solid #4a3f1c;border-radius:22px;background:linear-gradient(180deg,#17140a,#0e1210)}
        .hof-record-heading{margin:0 4px 12px}
        .hof-record-heading small{display:none}
        .hof-record-heading h2{margin:0;font-size:18px;color:#f4f5f2}
        .hof-record-heading h2 span{color:inherit}
        .hof-list-tools{margin:0 0 10px;padding:0 4px 12px;border:0;background:transparent}
        .hof-list-tools input{display:none}
        .hof-row{grid-template-columns:auto 44px minmax(0,1fr) auto;gap:10px;padding:12px;background:#101512;border:1px solid #1f2a24;border-radius:16px}
        .hof-rank{padding:4px 7px;border:1px solid #d4a93a;border-radius:8px;background:#2a2310;color:#e8c547}
        .hof-row-avatar{width:44px;height:44px}
        .hof-row-player strong{font-size:16px}
        .hof-row-player small{font:12px Inter,system-ui,sans-serif;color:#9aa69f}
        .hof-row-prize{font:800 18px Inter,system-ui,sans-serif;color:#f5d547}
        .hof-total{margin-top:10px;border-color:#4a3f1c;background:rgba(232,197,71,.06)}
        .hof-next-crown{margin:14px 20px 0;padding:16px;border-radius:22px;background:linear-gradient(180deg,#1c1708,#0f120e)}
        @media(max-width:600px){
          .hof-page{padding-left:0;padding-right:0}
          .hof-content{max-width:none}
          .hof-latest{margin-left:20px;margin-right:20px}
          .hof-summary{margin-left:20px;margin-right:20px}
          .hof-tabs{margin-left:20px;margin-right:20px}
          .hof-records{margin-left:20px;margin-right:20px}
          .hof-next-crown{margin-left:20px;margin-right:20px}
          .hof-winner-main{gap:16px}
          .hof-winner-avatar-wrap{width:112px}
          .hof-winner-avatar{width:112px;height:126px}
          .hof-winner-info h2{font-size:clamp(22px,8vw,34px)}
          .hof-summary strong{font-size:26px}
          .hof-summary small{font-size:13px}
          .hof-tabs button{font-size:14px}
          .hof-row{grid-template-columns:auto 44px minmax(0,1fr) auto;gap:10px;padding:12px}
          .hof-row-avatar{width:44px;height:44px}
          .hof-row-player strong{font-size:16px}
          .hof-row-player small{font-size:12px}
          .hof-row-prize{font-size:18px}
        }
        @media(max-width:390px){
          .hof-latest{padding:16px}
          .hof-winner-avatar-wrap{width:96px}
          .hof-winner-avatar{width:96px;height:110px}
          .hof-winner-avatar img{width:90px;height:104px}
          .hof-winner-info h2{font-size:29px}
          .hof-prize strong{font-size:38px}
        }
      `}</style>
    </main>
  );
}
