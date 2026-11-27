"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

type Fighter = { name: string; tier: "S" | "A" | "B" | "C" | "D" };

const fighters: Fighter[] = [
  { name: "Cetrion", tier: "S" }, { name: "Jacqui Briggs", tier: "S" },
  { name: "Liu Kang", tier: "S" }, { name: "The Joker", tier: "S" },
  { name: "Fujin", tier: "S" }, { name: "Geras", tier: "S" }, { name: "Jade", tier: "S" },
  { name: "Sub-Zero", tier: "A" }, { name: "Shang Tsung", tier: "A" },
  { name: "Kabal", tier: "A" }, { name: "Kung Lao", tier: "A" },
  { name: "Erron Black", tier: "A" }, { name: "Kano", tier: "A" },
  { name: "Noob Saibot", tier: "A" }, { name: "Cassie Cage", tier: "A" },
  { name: "Johnny Cage", tier: "A" }, { name: "Kotal Kahn", tier: "A" }, { name: "Spawn", tier: "A" },
  { name: "Sheeva", tier: "B" }, { name: "Raiden", tier: "B" },
  { name: "Jax", tier: "B" }, { name: "Kollector", tier: "B" },
  { name: "The Terminator", tier: "B" }, { name: "Scorpion", tier: "B" },
  { name: "D'Vorah", tier: "B" }, { name: "Baraka", tier: "B" },
  { name: "Nightwolf", tier: "B" }, { name: "Rain", tier: "B" },
  { name: "Sindel", tier: "B" }, { name: "Frost", tier: "B" },
  { name: "Mileena", tier: "B" }, { name: "Sonya Blade", tier: "B" },
  { name: "Kitana", tier: "C" }, { name: "Skarlet", tier: "C" },
  { name: "RoboCop", tier: "C" }, { name: "Shao Kahn", tier: "D" },
  { name: "Rambo", tier: "D" },
];

const tierInfo = {
  S: { label: "Elite", rating: 1800, note: "Top competitive reference tier" },
  A: { label: "Strong", rating: 1650, note: "Strong competitive options" },
  B: { label: "Viable", rating: 1500, note: "Competitive with the right player" },
  C: { label: "Situational", rating: 1350, note: "More matchup-dependent" },
  D: { label: "Challenging", rating: 1200, note: "Lower-tier reference placement" },
};

export default function KombatArenaPage() {
  const [tier, setTier] = useState<"ALL" | Fighter["tier"]>("ALL");
  const [query, setQuery] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const roster = useMemo(() => fighters.filter((fighter) =>
    (tier === "ALL" || fighter.tier === tier) && fighter.name.toLowerCase().includes(query.toLowerCase())
  ), [tier, query]);

  return (
    <main className="shell redesign-shell kombat-page">
      <SiteNavigation />
      <div className="kombat-wrap">
        <header className="kombat-hero">
          <div className="kombat-hero-copy">
            <span className="kombat-kicker"><i /> BASE25 PRO · COMPETITIVE GAMING</span>
            <h1>MORTAL KOMBAT <em>ARENA</em></h1>
            <p>Choose your fighter. Defend your name. Take the throne.</p>
            <div className="kombat-hero-meta"><span>MK11</span><b /> <span>RANKED COMPETITION</span><b /> <span>BASE25 EXCLUSIVE</span></div>
          </div>
          <div className="kombat-emblem" aria-hidden="true"><span>25</span><small>KOMBAT</small></div>
        </header>

        <section className="kombat-status-grid">
          <article><span>GAME MODE</span><strong>Mortal Kombat 11</strong><small>Separate from Snooker ratings</small></article>
          <article><span>PLAYER RATING</span><strong>Separate Elo</strong><small>Earned through ranked matches</small></article>
          <article><span>CHARACTER DATA</span><strong>37 fighters</strong><small>Reference tiers, not official game ratings</small></article>
        </section>

        <section className="kombat-section">
          <div className="kombat-section-head"><div><span className="kombat-overline">THE COMPETITION</span><h2>Enter the arena</h2><p>Every fighter has a style. Every player has a record. Only results decide the rankings.</p></div><span className="kombat-live-tag">FOUNDATION BUILD</span></div>
          <div className="kombat-feature-grid">
            <article className="kombat-feature-card kombat-feature-primary">
              <div className="kombat-card-icon">⚔</div><span className="kombat-card-label">01 · CHARACTER LAB</span>
              <h3>Know your fighter.</h3><p>Explore the MK11 roster and our provisional competitive strength tiers. BASE25 performance ratings will be earned from verified matches.</p>
              <button type="button" onClick={() => setShowRoster(value => !value)}>{showRoster ? "CLOSE CHARACTER LAB" : "EXPLORE CHARACTERS"} <b>→</b></button>
            </article>
            <article className="kombat-feature-card">
              <div className="kombat-card-icon">♛</div><span className="kombat-card-label">02 · KOMBAT RANKINGS</span>
              <h3>Build your legacy.</h3><p>A dedicated MK11 leaderboard, separate player Elo, win-loss record and weekly champion.</p><span className="kombat-coming">RANKED MATCH DATA NOT CONNECTED YET</span>
            </article>
            <article className="kombat-feature-card">
              <div className="kombat-card-icon">◉</div><span className="kombat-card-label">03 · MATCH CENTER</span>
              <h3>Settle the score.</h3><p>Record ranked and casual battles, selected fighters, game scores and confirmed results.</p><span className="kombat-coming">MATCH RECORDING IN DEVELOPMENT</span>
            </article>
          </div>
        </section>

        {showRoster && <section className="kombat-section kombat-roster" id="character-lab">
          <div className="kombat-section-head"><div><span className="kombat-overline">MK11 ROSTER</span><h2>Character reference tiers</h2><p>These are provisional competitive reference placements mapped to our own scale. They are not official NetherRealm ratings and do not determine match outcomes.</p></div><strong className="kombat-roster-count">{roster.length} / 37</strong></div>
          <div className="kombat-tier-legend">{(["S","A","B","C","D"] as const).map(key => <button key={key} className={tier===key?"selected":""} onClick={()=>setTier(tier===key?"ALL":key)}><b>{key}</b><span>{tierInfo[key].label}</span><strong>{tierInfo[key].rating}</strong></button>)}</div>
          <div className="kombat-roster-tools"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search fighter..." aria-label="Search fighter"/><button onClick={()=>{setTier("ALL");setQuery("");}}>Reset filters</button></div>
          <div className="kombat-fighter-grid">{roster.map(fighter=><article key={fighter.name}><span className={"kombat-tier tier-"+fighter.tier.toLowerCase()}>{fighter.tier}</span><div><strong>{fighter.name}</strong><small>{tierInfo[fighter.tier].label} · Reference {tierInfo[fighter.tier].rating}</small></div></article>)}</div>
          <p className="kombat-disclaimer">Reference tiers are a starting point for discussion. Real BASE25 character performance will be calculated from ranked match results with sample-size protection.</p>
        </section>}

        <section className="kombat-format">
          <div><span className="kombat-overline">MATCH FORMAT</span><h2>Fight rules</h2><p>One match is a series. One series moves the rankings.</p></div>
          <div className="kombat-format-items"><article><b>01</b><strong>Best of 3 rounds</strong><span>Each game is won by taking two rounds.</span></article><article><b>02</b><strong>Best of 3 games</strong><span>First player to win two games takes the match.</span></article><article><b>03</b><strong>Finals: Best of 5</strong><span>First player to win three games becomes champion.</span></article></div>
        </section>
        <footer className="kombat-footer"><span>BASE25 PRO · KOMBAT ARENA</span><span>COMPETITION · PERFORMANCE · LEGACY</span></footer>
      </div>

      <style jsx>{`
        .kombat-page{min-height:100vh;padding-bottom:90px;color:#f4f6ef}
        .kombat-wrap{width:min(100% - 28px,1100px);margin:0 auto;padding:22px 0 30px}
        .kombat-hero{position:relative;display:flex;align-items:center;justify-content:space-between;gap:20px;overflow:hidden;min-height:260px;padding:34px 38px;border:1px solid #624b32;border-radius:22px;background:radial-gradient(ellipse at 85% 30%,#57351d88,transparent 38%),linear-gradient(115deg,#080d0a,#17140f 65%,#0c110c);box-shadow:inset 0 1px #ffffff0a}
        .kombat-hero:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent 55%,#e7a24a08);pointer-events:none}
        .kombat-hero-copy{position:relative;z-index:1}
        .kombat-kicker,.kombat-overline{font:900 9px monospace;letter-spacing:.19em;color:#d6a45f}
        .kombat-kicker i{display:inline-block;width:7px;height:7px;margin-right:8px;border-radius:50%;background:#d4a04e;box-shadow:0 0 12px #d4a04e}
        .kombat-hero h1{max-width:720px;margin:19px 0 10px;font-size:clamp(38px,7vw,72px);font-weight:1000;line-height:.92;letter-spacing:-.065em;color:#f5f0e6}
        .kombat-hero h1 em{font-style:normal;color:#d8a65f}
        .kombat-hero p{margin:0;color:#b7b5aa;font-size:14px}
        .kombat-hero-meta{display:flex;align-items:center;gap:12px;margin-top:25px;color:#a7a99e;font:800 8px monospace;letter-spacing:.12em;flex-wrap:wrap}
        .kombat-hero-meta span:first-child{color:#f1d09b}.kombat-hero-meta b{width:4px;height:4px;border-radius:50%;background:#8e704d}
        .kombat-emblem{flex:none;display:grid;place-items:center;align-content:center;width:155px;height:155px;border:1px solid #9d774b;border-radius:50%;background:radial-gradient(circle at 35% 25%,#654b2c,#201b14 60%,#090d0a);box-shadow:0 0 0 8px #c28a3c0c,0 0 55px #d08d3820,inset 0 0 25px #000;color:#edc98c}
        .kombat-emblem span{font-size:66px;font-weight:1000;letter-spacing:-.1em;line-height:1}.kombat-emblem small{font:900 8px monospace;letter-spacing:.3em}
        .kombat-status-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0 34px}
        .kombat-status-grid article{display:grid;gap:6px;padding:17px 18px;border:1px solid #293b2d;border-radius:14px;background:linear-gradient(145deg,#101a12,#0a100b)}
        .kombat-status-grid article>span{font:800 8px monospace;letter-spacing:.15em;color:#8e9d8d}.kombat-status-grid strong{font-size:17px;color:#f2f4ed}.kombat-status-grid small{font-size:10px;color:#9aa999}
        .kombat-section{margin-top:28px}
        .kombat-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin-bottom:16px}
        .kombat-section-head h2,.kombat-format h2{margin:7px 0 5px;font-size:clamp(25px,4vw,34px);font-weight:950;letter-spacing:-.045em}
        .kombat-section-head p,.kombat-format p{max-width:650px;margin:0;color:#9fac9e;font-size:12px;line-height:1.65}
        .kombat-live-tag{padding:7px 9px;border:1px solid #735735;border-radius:7px;color:#e4b66f;font:900 8px monospace;letter-spacing:.1em;white-space:nowrap}
        .kombat-feature-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
        .kombat-feature-card{display:flex;flex-direction:column;align-items:flex-start;min-height:235px;padding:20px;border:1px solid #2d4031;border-radius:16px;background:linear-gradient(145deg,#111c13,#090f0b)}
        .kombat-feature-primary{border-color:#755536;background:radial-gradient(ellipse at 90% 0%,#6d482526,transparent 50%),linear-gradient(145deg,#1b1a13,#0d120e)}
        .kombat-card-icon{display:grid;place-items:center;width:38px;height:38px;margin-bottom:17px;border:1px solid #6b5437;border-radius:11px;background:#b47a2c17;color:#e4b36d;font-size:20px}
        .kombat-card-label{font:900 8px monospace;letter-spacing:.15em;color:#c69b5e}
        .kombat-feature-card h3{margin:9px 0 7px;font-size:21px;font-weight:950;letter-spacing:-.04em}
        .kombat-feature-card p{margin:0 0 20px;color:#9eaa9d;font-size:11px;line-height:1.65}
        .kombat-feature-card button{display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;margin-top:auto;padding:12px 13px;border:1px solid #9a7448;border-radius:9px;background:#b67c3219;color:#edc78e;font:900 9px monospace;letter-spacing:.09em;cursor:pointer}
        .kombat-feature-card button b{font-size:16px}
        .kombat-coming{margin-top:auto;padding:8px 9px;border:1px solid #344438;border-radius:7px;color:#91a18e;font:800 8px monospace;letter-spacing:.06em}
        .kombat-roster{padding:22px;border:1px solid #314433;border-radius:18px;background:linear-gradient(145deg,#0f1911,#090f0b)}
        .kombat-roster-count{color:#d6aa69;font:900 11px monospace}
        .kombat-tier-legend{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin:20px 0}
        .kombat-tier-legend button{display:grid;gap:4px;padding:11px 8px;border:1px solid #344537;border-radius:10px;background:#0a110c;color:#fff;text-align:left;cursor:pointer}
        .kombat-tier-legend button.selected{border-color:#d6a45f;background:#302416}
        .kombat-tier-legend b{font-size:19px;color:#e2b36f}.kombat-tier-legend span{font-size:9px;color:#a8b3a6}.kombat-tier-legend strong{font:900 10px monospace;color:#d4f36a}
        .kombat-roster-tools{display:flex;gap:9px;margin-bottom:12px}
        .kombat-roster-tools input{flex:1;min-width:0;padding:11px 13px;border:1px solid #354638;border-radius:9px;outline:none;background:#080e09;color:#fff;font-size:12px}
        .kombat-roster-tools input:focus{border-color:#c99a5b}
        .kombat-roster-tools button{padding:0 13px;border:1px solid #354638;border-radius:9px;background:#172319;color:#c8d3c5;font-size:10px;cursor:pointer}
        .kombat-fighter-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
        .kombat-fighter-grid article{display:flex;align-items:center;gap:10px;min-width:0;padding:10px;border:1px solid #29382d;border-radius:9px;background:#0b130d}
        .kombat-fighter-grid article>div{display:grid;gap:3px;min-width:0}.kombat-fighter-grid strong{font-size:11px}.kombat-fighter-grid small{font-size:8px;color:#91a18f}
        .kombat-tier{display:grid;place-items:center;flex:none;width:25px;height:25px;border:1px solid;border-radius:7px;font:900 11px monospace}
        .tier-s{border-color:#c28b4a;background:#573c1d;color:#ffd69a}.tier-a{border-color:#718c45;background:#26391d;color:#d5f36a}.tier-b{border-color:#536c7b;background:#1a2c36;color:#a9d7ee}.tier-c{border-color:#63577b;background:#292238;color:#d2b9fa}.tier-d{border-color:#765252;background:#351e1e;color:#efaaaa}
        .kombat-disclaimer{margin:15px 0 0;color:#849383;font-size:9px;line-height:1.6}
        .kombat-format{display:grid;grid-template-columns:.75fr 1.25fr;gap:25px;margin-top:30px;padding:22px;border:1px solid #344334;border-radius:17px;background:#0c140e}
        .kombat-format-items{display:grid;gap:8px}
        .kombat-format-items article{display:grid;grid-template-columns:32px 1fr;gap:2px 10px;padding:11px 12px;border:1px solid #29392d;border-radius:9px;background:#101a12}
        .kombat-format-items b{grid-row:span 2;color:#d7a45e;font:900 10px monospace}.kombat-format-items strong{font-size:11px}.kombat-format-items span{color:#91a08f;font-size:9px}
        .kombat-footer{display:flex;justify-content:space-between;gap:10px;margin-top:25px;padding-top:14px;border-top:1px solid #26362a;color:#718170;font:800 8px monospace;letter-spacing:.1em}
        @media(max-width:760px){.kombat-wrap{width:calc(100% - 22px);padding-top:12px}.kombat-hero{min-height:220px;padding:25px 20px;border-radius:17px}.kombat-emblem{width:94px;height:94px}.kombat-emblem span{font-size:43px}.kombat-emblem small{font-size:6px}.kombat-hero h1{max-width:75%;font-size:clamp(34px,8vw,53px)}.kombat-hero p{max-width:75%;font-size:11px}.kombat-status-grid{gap:7px;margin-bottom:25px}.kombat-status-grid article{padding:12px 10px}.kombat-status-grid strong{font-size:12px}.kombat-status-grid small{font-size:8px}.kombat-feature-grid{grid-template-columns:1fr}.kombat-feature-card{min-height:190px}.kombat-roster{padding:15px 11px}.kombat-tier-legend{gap:5px}.kombat-tier-legend button{padding:8px 6px}.kombat-tier-legend span{font-size:7px}.kombat-tier-legend strong{font-size:8px}.kombat-fighter-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:5px}.kombat-fighter-grid article{gap:6px;padding:8px 6px}.kombat-fighter-grid strong{font-size:9px}.kombat-fighter-grid small{font-size:7px}.kombat-format{grid-template-columns:1fr;gap:15px;padding:17px}.kombat-footer{font-size:7px}}
        @media(max-width:390px){.kombat-emblem{width:75px;height:75px}.kombat-emblem span{font-size:34px}.kombat-status-grid article{padding:10px 7px}.kombat-status-grid strong{font-size:10px}.kombat-status-grid small{font-size:7px}.kombat-hero-meta{gap:7px;font-size:7px}}
      `}</style>
    </main>
  );
}
