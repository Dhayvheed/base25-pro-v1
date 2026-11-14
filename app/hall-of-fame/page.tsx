"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Champion = {
  id: string;
  week_start: string;
  week_end: string;
  player_id: string;
  players?: { username: string; player_code: string; photo_url: string | null } | null;
};

const dateLabel = (value: string) =>
  new Date(value + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });

export default function HallOfFamePage() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [order, setOrder] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!supabase) {
        setError("Championship records are temporarily unavailable.");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("weekly_champions")
        .select("id,week_start,week_end,player_id,players(username,player_code,photo_url)")
        .order("week_start", { ascending: false })
        .limit(100);
      if (!active) return;
      if (error) setError(error.message);
      setChampions((data || []) as unknown as Champion[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const rows = champions.filter((champion) =>
      !query ||
      champion.players?.username?.toLowerCase().includes(query) ||
      champion.players?.player_code?.toLowerCase().includes(query) ||
      dateLabel(champion.week_start).toLowerCase().includes(query)
    );
    return order === "newest" ? rows : [...rows].reverse();
  }, [champions, search, order]);

  const latest = champions[0];

  return (
    <main className="shell redesign-shell hof-shell">
      <SiteNavigation />
      <div className="hof-crumb">BASE25 PRO <span>/</span> LEGACY <span>/</span> <b>BASE25 HALL OF FAME</b></div>

      <section className="hof-hero">
        <div className="hof-hero-glow" />
        <div className="hof-laurel hof-laurel-left">❧</div>
        <div className="hof-laurel hof-laurel-right">❧</div>
        <div className="hof-crown" aria-hidden="true">♛</div>
        <p className="hof-kicker">THE BASE25 CHAMPIONS’ LEGACY</p>
        <h1><span className="hof-brand">BASE25</span> <span>HALL OF FAME</span></h1>
        <p className="hof-intro">Great players win matches. Champions earn a place in BASE25 history.</p>
        <p className="hof-subintro">Every Saturday Final Champion is remembered here — permanently.</p>
      </section>

      {error && <p className="notice">{error}</p>}

      {loading ? (
        <div className="hof-loading"><span className="hof-loader" /> Loading the champions’ legacy…</div>
      ) : latest ? (
        <>
          <section className="hof-feature-wrap" aria-label="Latest champion">
            <div className="hof-section-label"><span>♛</span> LATEST CHAMPION</div>
            <article className="hof-feature">
              <div className="hof-feature-top"><span>BASE25 PRO · SATURDAY FINAL</span><b>CHAMPION #001</b></div>
              <div className="hof-feature-main">
                <div className="hof-medallion">
                  <div className="hof-avatar">{latest.players?.photo_url ? <img src={latest.players.photo_url} alt="" /> : latest.players?.username?.[0] || "?"}</div>
                  <span className="hof-medallion-rank">#001</span>
                </div>
                <div className="hof-winner-copy">
                  <span className="hof-winner-overline">THE INAUGURAL KING</span>
                  <h2>{latest.players?.username || "BASE25 Champion"}</h2>
                  <p className="hof-player-code">{latest.players?.player_code || "BASE25 PLAYER"}</p>
                  <div className="hof-title-line"><span>🏆</span> Saturday Champion</div>
                  <div className="hof-date-line">▦ &nbsp; {dateLabel(latest.week_start)} – {dateLabel(latest.week_end)}</div>
                </div>
                <div className="hof-trophy" aria-hidden="true">🏆</div>
              </div>
              <div className="hof-feature-foot"><span>ONE TABLE. ONE CROWN. ONE KING.</span><b>THE LEGACY BEGINS</b></div>
            </article>
          </section>

          <section className="hof-stats" aria-label="Hall of Fame statistics">
            <div><span className="hof-stat-icon">♛</span><strong>{champions.length}</strong><small>CHAMPION{champions.length === 1 ? "" : "S"}</small></div>
            <div><span className="hof-stat-icon">▦</span><strong>{champions.length}</strong><small>FINALS RECORDED</small></div>
            <div><span className="hof-stat-icon">#</span><strong>001</strong><small>LATEST HONOREE</small></div>
          </section>

          <section className="hof-history">
            <div className="hof-history-head">
              <div><p className="hof-section-label">THE RECORD BOOK</p><h2>Championship <span>History</span></h2><p className="hof-history-note">Every champion. Every season. Never forgotten.</p></div>
              <label className="hof-sort">SORT BY <select value={order} onChange={(event) => setOrder(event.target.value as "newest" | "oldest")}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
            </div>
            <div className="hof-controls"><span>ALL CHAMPIONS <b>{champions.length}</b></span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search champion or player ID…" aria-label="Search champions" /></div>
            <div className="hof-history-list">
              {filtered.length ? filtered.map((champion) => {
                const index = champions.findIndex((item) => item.id === champion.id);
                const rank = String(index + 1).padStart(3, "0");
                return <article className="hof-history-row" key={champion.id}>
                  <div className="hof-history-rank">#{rank}</div>
                  <div className="hof-history-avatar">{champion.players?.photo_url ? <img src={champion.players.photo_url} alt="" /> : champion.players?.username?.[0] || "?"}</div>
                  <div className="hof-history-player"><b>{champion.players?.username || "BASE25 Champion"}</b><small>{champion.players?.player_code || "BASE25 PLAYER"}</small></div>
                  <div className="hof-history-title"><span>🏆</span><b>Saturday Champion</b><small>{dateLabel(champion.week_start)} – {dateLabel(champion.week_end)}</small></div>
                  {index === 0 && <span className="hof-latest-tag">LATEST</span>}
                </article>;
              }) : <div className="hof-empty">No champions match that search.</div>}
            </div>
          </section>
        </>
      ) : (
        <section className="hof-empty-state">
          <div className="hof-empty-crown">♛</div>
          <p className="hof-section-label">THE FIRST CHAPTER</p>
          <h2>The BASE25 throne is waiting.</h2>
          <p>The first Saturday Final Champion will be immortalised in the BASE25 Hall of Fame. The crown is waiting for its owner.</p>
          <span>ONE TABLE. ONE CROWN. ONE KING.</span>
        </section>
      )}

      <style jsx global>{`
        .hof-shell{max-width:1120px;padding-bottom:90px}
        .hof-crumb{padding:18px 0 8px;color:#879188;font:11px 'DM Mono',monospace;letter-spacing:.14em}
        .hof-crumb span{padding:0 10px;color:#4d5a4f}.hof-crumb b{color:var(--lime);font-weight:500}
        .hof-hero{position:relative;isolation:isolate;overflow:hidden;text-align:center;padding:45px 18px 42px;margin:0 -8px 24px;background:radial-gradient(ellipse at 50% 0%,rgba(197,243,106,.13),transparent 48%),radial-gradient(ellipse at 50% 100%,rgba(174,125,28,.12),transparent 54%);border-bottom:1px solid #343d31}
        .hof-hero-glow{position:absolute;z-index:-1;left:50%;top:48%;width:420px;height:220px;transform:translate(-50%,-50%);background:#b68a27;opacity:.09;filter:blur(85px);border-radius:50%}
        .hof-crown{font-size:58px;line-height:1;color:#e6c15d;text-shadow:0 0 25px rgba(226,185,72,.45)}
        .hof-kicker{display:inline-block;margin:16px 0 0;padding:8px 22px;border:1px solid #8d7132;border-radius:3px;background:linear-gradient(90deg,rgba(155,111,28,.12),rgba(230,194,91,.2),rgba(155,111,28,.12));color:#f0d47d;font:700 11px 'DM Mono',monospace;letter-spacing:.2em}
        .hof-hero h1{margin:14px 0 12px;font-size:clamp(34px,6.4vw,68px);line-height:1.04;letter-spacing:-.065em;font-weight:800;text-shadow:0 3px 24px #000}
        .hof-hero h1 span{color:#e8c65f}.hof-hero h1 .hof-brand{color:#f2f3ee}
        .hof-intro{margin:0 auto;color:#f0f1ec;font-size:17px;font-weight:700}
        .hof-subintro{margin:9px auto 0;color:#9ca69d;font-size:13px}
        .hof-laurel{position:absolute;top:65px;color:rgba(225,188,83,.65);font-size:100px;line-height:1}
        .hof-laurel-left{left:8%;transform:rotate(-30deg)}.hof-laurel-right{right:8%;transform:scaleX(-1) rotate(-30deg)}
        .hof-section-label{margin:0 0 14px;color:#9ca69d;font:11px 'DM Mono',monospace;letter-spacing:.16em}
        .hof-section-label span{color:#e6c15d;font-size:16px;margin-right:8px}
        .hof-feature-wrap{margin:28px 0 18px}
        .hof-feature{position:relative;overflow:hidden;padding:20px 25px 15px;border:1px solid #a88739;border-radius:15px;background:radial-gradient(ellipse at 90% 45%,rgba(180,130,31,.2),transparent 38%),linear-gradient(115deg,#171b17,#0c100d 72%);box-shadow:0 0 0 1px rgba(232,198,95,.1),0 12px 35px rgba(0,0,0,.25)}
        .hof-feature:before{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.025),transparent 70%)}
        .hof-feature-top,.hof-feature-foot{display:flex;justify-content:space-between;gap:12px;color:#9ca69d;font:10px 'DM Mono',monospace;letter-spacing:.14em}
        .hof-feature-top b{color:#e8c65f}
        .hof-feature-main{display:flex;align-items:center;gap:28px;padding:22px 0 25px}
        .hof-medallion{position:relative;flex:0 0 154px;display:grid;place-items:center}
        .hof-avatar{width:118px;height:118px;display:grid;place-items:center;overflow:hidden;border:4px solid var(--lime);border-radius:50%;background:#0b100c;color:var(--lime);font-size:43px;font-weight:800;box-shadow:0 0 24px rgba(197,243,106,.17)}
        .hof-avatar img,.hof-history-avatar img{width:100%;height:100%;object-fit:cover}
        .hof-medallion-rank{position:absolute;bottom:-7px;padding:6px 17px;border:1px solid #d6b44c;border-radius:4px;background:linear-gradient(110deg,#765315,#e8c65f,#8d651a);color:#17130a;font-weight:900;font-size:13px}
        .hof-winner-copy{min-width:0;position:relative;z-index:1}
        .hof-winner-overline{color:#aab4aa;font:10px 'DM Mono',monospace;letter-spacing:.17em}
        .hof-winner-copy h2{margin:6px 0 2px;font-size:clamp(28px,5vw,43px);letter-spacing:-.055em;text-transform:uppercase}
        .hof-player-code{margin:0;color:#a4ada5;font:13px 'DM Mono',monospace}
        .hof-title-line{margin-top:15px;color:#f0d477;font-weight:800;font-size:15px}.hof-title-line span{margin-right:7px}
        .hof-date-line{margin-top:9px;color:#aeb6ae;font-size:13px}
        .hof-trophy{margin-left:auto;flex:0 0 auto;font-size:88px;filter:drop-shadow(0 0 17px rgba(222,174,48,.3))}
        .hof-feature-foot{padding-top:12px;border-top:1px solid rgba(202,174,91,.22)}.hof-feature-foot b{color:var(--lime)}
        .hof-stats{display:grid;grid-template-columns:repeat(3,1fr);margin:22px 0 54px;border:1px solid #303a32;border-radius:12px;background:linear-gradient(110deg,#131915,#0c100e)}
        .hof-stats>div{display:flex;align-items:center;justify-content:center;gap:13px;padding:18px 12px;border-right:1px solid #303a32}.hof-stats>div:last-child{border:0}
        .hof-stat-icon{color:#dfbd5c;font-size:27px}.hof-stats strong{display:block;color:#f4f5ef;font-size:25px;line-height:1}.hof-stats small{display:block;margin-top:5px;color:#9ca69d;font:9px 'DM Mono',monospace;letter-spacing:.1em}
        .hof-history{padding-bottom:20px}.hof-history-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:22px}
        .hof-history-head h2{margin:0;font-size:clamp(28px,5vw,40px);letter-spacing:-.06em}.hof-history-head h2 span{color:var(--lime)}
        .hof-history-note{margin:8px 0 0;color:#919b92;font-size:13px}
        .hof-sort{display:grid;gap:7px;color:#929c93;font:9px 'DM Mono',monospace;letter-spacing:.13em}.hof-sort select{min-width:145px;padding:10px 12px;border-radius:7px}
        .hof-controls{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:12px;padding:12px 14px;border:1px solid #2e382f;border-radius:9px;background:#101511;color:#a1aaa2;font:10px 'DM Mono',monospace;letter-spacing:.1em}
        .hof-controls b{margin-left:8px;color:var(--lime)}.hof-controls input{width:min(320px,58%);padding:10px 12px;border-radius:7px;font:12px Manrope,Arial,sans-serif;letter-spacing:0}
        .hof-history-list{display:grid;gap:9px}
        .hof-history-row{display:grid;grid-template-columns:66px 48px minmax(130px,1fr) minmax(170px,1.2fr) auto;align-items:center;gap:14px;padding:14px 16px;border:1px solid #303a32;border-radius:12px;background:linear-gradient(105deg,#151b17,#0d110e);transition:border-color .18s,transform .18s}
        .hof-history-row:hover{border-color:#9bbd45;transform:translateY(-1px)}
        .hof-history-rank{color:#e5c45e;font:700 16px 'DM Mono',monospace}
        .hof-history-avatar{width:44px;height:44px;display:grid;place-items:center;overflow:hidden;border:2px solid var(--lime);border-radius:50%;background:#1a211b;color:var(--lime);font-weight:800}
        .hof-history-player b,.hof-history-player small,.hof-history-title b,.hof-history-title small{display:block}
        .hof-history-player b{font-size:14px;text-transform:uppercase}.hof-history-player small{margin-top:4px;color:#9da79e;font:11px 'DM Mono',monospace}
        .hof-history-title b{color:#ead17d;font-size:12px}.hof-history-title small{margin-top:4px;color:#9da79e;font-size:11px}
        .hof-history-title span{margin-right:6px}.hof-latest-tag{padding:6px 10px;border:1px solid #7b9d32;border-radius:5px;background:rgba(197,243,106,.1);color:var(--lime);font:10px 'DM Mono',monospace}
        .hof-empty,.hof-empty-state,.hof-loading{padding:38px 22px;text-align:center;color:#9ca69d;border:1px solid #303a32;border-radius:12px;background:#111713}
        .hof-empty-state{margin:35px 0 60px;padding:55px 24px;background:radial-gradient(ellipse at 50% 0%,rgba(197,243,106,.1),transparent 55%),#111713}
        .hof-empty-crown{font-size:55px;color:#e6c15d}.hof-empty-state h2{margin:8px 0;color:#f1f3ed;font-size:30px}.hof-empty-state p:not(.hof-section-label){max-width:440px;margin:0 auto 18px;font-size:13px;line-height:1.7}
        .hof-empty-state>span{color:var(--lime);font:10px 'DM Mono',monospace;letter-spacing:.15em}
        .hof-loading{display:flex;align-items:center;justify-content:center;gap:12px;margin:30px 0}.hof-loader{width:17px;height:17px;border:2px solid #536341;border-top-color:var(--lime);border-radius:50%;animation:hof-spin .8s linear infinite}@keyframes hof-spin{to{transform:rotate(360deg)}}
        @media(max-width:700px){
          .hof-shell{padding-left:18px;padding-right:18px}.hof-hero{margin:0 -5px 18px;padding:38px 8px 32px}.hof-crown{font-size:46px}.hof-kicker{font-size:9px;padding:7px 14px}.hof-hero h1{font-size:clamp(31px,8.2vw,48px);letter-spacing:-.06em;white-space:nowrap}.hof-intro{font-size:14px}.hof-subintro{max-width:310px;font-size:11px;line-height:1.6}
          .hof-laurel{top:76px;font-size:57px;opacity:.55}.hof-laurel-left{left:-2%}.hof-laurel-right{right:-2%}
          .hof-feature{padding:16px 14px 12px}.hof-feature-top,.hof-feature-foot{font-size:8px;letter-spacing:.08em}.hof-feature-main{gap:13px;padding:20px 0}.hof-medallion{flex-basis:83px}.hof-avatar{width:76px;height:76px;font-size:28px;border-width:3px}.hof-medallion-rank{font-size:10px;padding:4px 10px}.hof-winner-copy h2{font-size:25px}.hof-winner-overline{font-size:8px}.hof-player-code{font-size:10px}.hof-title-line{font-size:12px;margin-top:11px}.hof-date-line{font-size:10px}.hof-trophy{font-size:43px;align-self:flex-start;margin-top:10px}
          .hof-stats{margin:17px 0 40px}.hof-stats>div{gap:7px;padding:14px 5px;flex-direction:column;text-align:center}.hof-stat-icon{font-size:21px}.hof-stats strong{font-size:21px}.hof-stats small{font-size:7px;letter-spacing:.04em}
          .hof-history-head{align-items:flex-start;flex-direction:column}.hof-sort{width:100%}.hof-sort select{width:100%}.hof-controls{align-items:stretch;flex-direction:column}.hof-controls input{width:100%}
          .hof-history-row{grid-template-columns:43px 38px minmax(0,1fr) auto;gap:9px;padding:12px 10px}.hof-history-rank{font-size:12px}.hof-history-avatar{width:36px;height:36px}.hof-history-player b{font-size:11px}.hof-history-player small{font-size:9px}.hof-history-title{grid-column:3;grid-row:2}.hof-history-title b{font-size:10px}.hof-history-title small{font-size:9px}.hof-latest-tag{grid-column:4;grid-row:1;font-size:8px;padding:5px 6px}
        }
        @media(max-width:360px){.hof-trophy{display:none}.hof-history-row{grid-template-columns:38px 34px minmax(0,1fr) auto}.hof-history-avatar{width:32px;height:32px}}
      `}</style>
    </main>
  );
}
