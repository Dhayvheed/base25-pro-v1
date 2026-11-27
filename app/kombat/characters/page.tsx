"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

type Tier = "S" | "A" | "B" | "C" | "D";
type Character = { name: string; tier: Tier; rating: number; note: string };

const tierRatings: Record<Tier, number> = { S: 1800, A: 1650, B: 1500, C: 1350, D: 1200 };
const tierDescriptions: Record<Tier, string> = {
  S: "Elite competitive picks",
  A: "Strong tournament options",
  B: "Viable, with clearer weaknesses",
  C: "More matchup or execution dependent",
  D: "Harder competitive path",
};

// Provisional composite tiers based on published competitive lists for MK11's final balance patch.
// These are reference ratings, not BASE25 match results or official NetherRealm ratings.
const seed: Character[] = [
  ...["Cetrion", "Jacqui Briggs", "Liu Kang", "The Joker", "Fujin", "Geras", "Jade"].map(name => ({ name, tier: "S" as Tier, note: "Top-tier competitive reference" })),
  ...["Sub-Zero", "Shang Tsung", "Kabal", "Kung Lao", "Erron Black", "Kano", "Noob Saibot", "Cassie Cage", "Johnny Cage", "Kotal Kahn", "Spawn"].map(name => ({ name, tier: "A" as Tier, note: "Strong competitive reference" })),
  ...["Sheeva", "Raiden", "Jax", "Kollector", "The Terminator", "Scorpion", "D'Vorah", "Baraka", "Nightwolf", "Rain", "Sindel", "Frost", "Mileena", "Sonya Blade"].map(name => ({ name, tier: "B" as Tier, note: "Solid competitive reference" })),
  ...["Kitana", "Skarlet", "RoboCop"].map(name => ({ name, tier: "C" as Tier, note: "More execution or matchup dependent" })),
  ...["Shao Kahn", "Rambo"].map(name => ({ name, tier: "D" as Tier, note: "Lower competitive placement in the sources reviewed" })),
].map(c => ({ ...c, rating: tierRatings[c.tier] }));

const tiers: Tier[] = ["S", "A", "B", "C", "D"];

export default function KombatCharactersPage() {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"ALL" | Tier>("ALL");
  const [sort, setSort] = useState<"rating" | "name">("rating");
  const characters = useMemo(() => seed
    .filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    .filter(c => tier === "ALL" || c.tier === tier)
    .sort((a, b) => sort === "rating" ? b.rating - a.rating || a.name.localeCompare(b.name) : a.name.localeCompare(b.name)), [query, tier, sort]);

  return <main className="shell">
    <header className="topbar">
      <Link className="brand" href="/">BASE<span>25</span> PRO</Link>
      <nav><Link href="/">Home</Link><Link href="/fc-arena">FC Arena</Link><Link href="/admin">Admin</Link></nav>
    </header>
    <section className="kc-hero">
      <div className="kc-eyebrow">BASE25 PRO / COMPETITIVE GAMING / MK11</div>
      <div className="kc-tag">37 FIGHTERS · FINAL BALANCE PATCH</div>
      <h1>KOMBAT<br/><span>CHARACTER RATINGS</span></h1>
      <p>A starting competitive-strength index for Mortal Kombat 11. BASE25 match performance will be tracked separately once ranked matches begin.</p>
      <div className="kc-stats">
        <div><strong>37</strong><small>ROSTER SIZE</small></div>
        <div><strong>5</strong><small>REFERENCE TIERS</small></div>
        <div><strong>0</strong><small>BASE25 MATCHES</small></div>
      </div>
    </section>

    <section className="kc-section">
      <div className="kc-heading"><div><div className="kc-eyebrow">01 / THE REFERENCE SCALE</div><h2>Competitive baseline<span>.</span></h2></div><p>These numbers are our own index mapped from published tier placements. They are not official game ratings.</p></div>
      <div className="kc-tier-grid">{tiers.map(t => <div className="kc-tier" key={t}><b>{t} TIER</b><strong>{tierRatings[t].toLocaleString()}</strong><small>{tierDescriptions[t]}</small></div>)}</div>
    </section>

    <section className="kc-section">
      <div className="kc-heading"><div><div className="kc-eyebrow">02 / THE ROSTER</div><h2>Fighter rankings<span>.</span></h2></div><span className="kc-count">{characters.length} FIGHTERS</span></div>
      <div className="kc-controls">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search a fighter..." aria-label="Search fighters"/>
        <select value={tier} onChange={e => setTier(e.target.value as "ALL" | Tier)} aria-label="Filter by tier"><option value="ALL">All tiers</option>{tiers.map(t => <option key={t} value={t}>{t} Tier</option>)}</select>
        <select value={sort} onChange={e => setSort(e.target.value as "rating" | "name")} aria-label="Sort fighters"><option value="rating">Highest rating</option><option value="name">Name A–Z</option></select>
      </div>
      <div className="kc-list">{characters.map((c, i) => <article className="kc-row" key={c.name}>
        <span className="kc-rank">{String(i + 1).padStart(2, "0")}</span>
        <div className="kc-character"><b>{c.name}</b><small>{c.note}</small></div>
        <span className={"kc-tier-pill tier-" + c.tier.toLowerCase()}>{c.tier} TIER</span>
        <strong className="kc-rating">{c.rating.toLocaleString()}</strong>
      </article>)}</div>
      {characters.length === 0 && <p className="muted">No fighter matches that search.</p>}
    </section>

    <section className="kc-section kc-method">
      <div className="kc-eyebrow">03 / HOW BASE25 WILL RATE THEM</div>
      <h2>Two ratings. Two different jobs.</h2>
      <div className="kc-method-grid">
        <div><b>COMPETITIVE BASELINE</b><strong>Fixed reference</strong><p>Starts from published MK11 tier-list consensus. It helps us understand the competitive strength of each fighter before we have local data.</p></div>
        <div><b>BASE25 PERFORMANCE</b><strong>Earned in matches</strong><p>Will be calculated from verified ranked results: wins, losses, usage, win rate and matchup performance. Casual matches will not affect ranked performance.</p></div>
      </div>
      <p className="kc-warning">Important: a character with 3 wins from 3 matches should not automatically outrank one with 30 wins from 50. We will apply a minimum-match threshold and sample-size adjustment before calling anyone the strongest at BASE25.</p>
    </section>
    <footer><b>BASE25 PRO</b><span>KOMBAT · MORTAL KOMBAT 11</span><Link href="/">Back to competition board ↗</Link></footer>
    <style jsx>{`
      .kc-hero{position:relative;padding:68px 0 48px;border-bottom:1px solid var(--line)}
      .kc-eyebrow{font:10px 'DM Mono',monospace;letter-spacing:.14em;color:var(--lime)}
      .kc-tag{display:inline-block;margin-top:26px;padding:8px 11px;border:1px solid #52613c;color:var(--gold);font:9px 'DM Mono',monospace;letter-spacing:.12em}
      .kc-hero h1{font-size:clamp(42px,8vw,88px);line-height:.98;letter-spacing:-.075em;margin:22px 0}
      .kc-hero h1 span{color:var(--lime)}
      .kc-hero p{max-width:620px;color:var(--muted);font-size:14px;line-height:1.8}
      .kc-stats{display:flex;gap:52px;margin-top:34px}
      .kc-stats div{display:grid;gap:5px}.kc-stats strong{font:700 28px 'DM Mono';color:var(--text)}.kc-stats small{font:9px 'DM Mono';letter-spacing:.12em;color:var(--muted)}
      .kc-section{padding:54px 0;border-bottom:1px solid var(--line)}
      .kc-heading{display:flex;justify-content:space-between;align-items:end;gap:24px;margin-bottom:24px}
      .kc-heading h2,.kc-method h2{font-size:clamp(27px,4vw,40px);letter-spacing:-.06em;margin:10px 0 0}
      .kc-heading h2 span{color:var(--lime)}.kc-heading>p{max-width:360px;color:var(--muted);font-size:12px;line-height:1.7;margin:0}
      .kc-tier-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
      .kc-tier{padding:18px 14px;background:var(--panel);border:1px solid var(--line);display:grid;gap:9px}
      .kc-tier>b{font:10px 'DM Mono';color:var(--gold);letter-spacing:.1em}.kc-tier>strong{font:700 25px 'DM Mono';color:var(--lime)}.kc-tier>small{color:var(--muted);font-size:10px;line-height:1.5}
      .kc-count{font:10px 'DM Mono';color:var(--muted)}
      .kc-controls{display:grid;grid-template-columns:1fr 170px 170px;gap:10px;margin-bottom:16px}
      .kc-controls input,.kc-controls select{width:100%}
      .kc-list{border-top:1px solid var(--line)}
      .kc-row{display:grid;grid-template-columns:44px minmax(0,1fr) 100px 90px;gap:12px;align-items:center;padding:15px 10px;border-bottom:1px solid var(--line)}
      .kc-rank{font:11px 'DM Mono';color:var(--muted)}.kc-character{display:grid;gap:5px}.kc-character b{font-size:13px}.kc-character small{font:9px 'DM Mono';color:var(--muted)}
      .kc-tier-pill{justify-self:start;padding:6px 8px;border:1px solid var(--line);font:9px 'DM Mono';letter-spacing:.08em}
      .tier-s{color:#f0cf73;border-color:#756034}.tier-a{color:#c5f36a;border-color:#536b3d}.tier-b{color:#9eb8d2;border-color:#43586e}.tier-c{color:#c4a4d8;border-color:#614d70}.tier-d{color:#d48c83;border-color:#714640}
      .kc-rating{font:700 15px 'DM Mono';color:var(--lime);text-align:right}
      .kc-method-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:24px 0}
      .kc-method-grid>div{padding:22px;background:var(--panel);border:1px solid var(--line)}
      .kc-method-grid b{display:block;font:9px 'DM Mono';letter-spacing:.12em;color:var(--gold)}
      .kc-method-grid strong{display:block;margin:12px 0;font-size:20px}
      .kc-method-grid p,.kc-warning{color:var(--muted);font-size:12px;line-height:1.8}
      .kc-warning{padding:14px;border-left:3px solid var(--gold);background:#17150f}
      @media(max-width:700px){.kc-hero{padding:50px 0 38px}.kc-stats{gap:24px;justify-content:space-between}.kc-stats strong{font-size:23px}.kc-stats small{font-size:8px}.kc-heading{align-items:start;flex-direction:column}.kc-tier-grid{grid-template-columns:repeat(2,1fr)}.kc-controls{grid-template-columns:1fr 1fr}.kc-controls input{grid-column:1/-1}.kc-row{grid-template-columns:26px minmax(0,1fr) 68px 58px;gap:6px;padding:13px 2px}.kc-character b{font-size:11px}.kc-character small{font-size:8px}.kc-tier-pill{font-size:8px;padding:5px}.kc-rating{font-size:12px}.kc-method-grid{grid-template-columns:1fr}}
    `}</style>
  </main>;
}
