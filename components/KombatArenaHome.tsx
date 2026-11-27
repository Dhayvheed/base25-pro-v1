"use client";
import { useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import { fighters, kombatDemo as d, kombatPotConfig as pot } from "@/lib/kombat/demo-data";
import type { FighterId } from "@/lib/kombat/demo-data";

type Account = { signedIn: boolean; authReady: boolean; profile: any; accountName: string };
function FighterTile({ id, imageSrc, large = false }: { id: FighterId; imageSrc?: string; large?: boolean }) {
  const fighter = fighters[id];
  return <span className={"kombat-fighter kombat-fighter-" + id + (large ? " is-large" : "")}>
    {imageSrc ? <img src={imageSrc} alt={fighter.name} /> : <b>{fighter.initials}</b>}
    {fighter.tier && <i>{fighter.tier}</i>}
  </span>;
}
function Avatar({ value }: { value: string }) { return <span className="kombat-avatar">{value.slice(0,1).toUpperCase()}</span>; }
function PotCard() {
  const amount = pot.mode === "live" ? pot.liveMatchesThisWeek * pot.contributionPerMatch : pot.fixedAmount;
  return <section className="kombat-card kombat-pot">
    <div className="kombat-pot-crown">♛</div><h2>KOMBAT POT</h2>
    <div className="kombat-pot-status">{pot.mode === "live" ? "LIVE · KOMBAT" : pot.mode === "fixed" ? "FIXED PRIZE" : "COMING SOON"}</div>
    <strong className={pot.mode === "soon" ? "is-steel" : ""}>{pot.mode === "soon" ? "OPENS SOON" : "₦" + amount.toLocaleString("en-NG")}</strong>
    <p>{pot.mode === "live" ? `${pot.liveMatchesThisWeek} matches × ₦${pot.contributionPerMatch} · resets Saturday` : pot.mode === "fixed" ? "Weekly prize set by BASE25 · paid to the Saturday champion" : "The Kombat pot starts when more fighters join"}</p>
    <Link href="/how-it-works">How KOMBAT works →</Link>
  </section>;
}
export default function KombatArenaHome({ account: initialAccount }: { account: Account }) {
  const [account, setAccount] = useState(initialAccount);
  const [showAll, setShowAll] = useState(false);
  const share = async () => { try { if (navigator.share) await navigator.share({ title: "BASE25 KOMBAT ARENA", url: window.location.href }); else await navigator.clipboard.writeText(window.location.href); } catch {} };
  return <main className="shell redesign-shell kombat-shell">
    <SiteNavigation onHomeAccountChange={setAccount} />
    <header className="home-header">
      <Link href="/" className="home-header-brand"><span className="home-header-ball">8</span><strong>BASE25 <b>PRO</b></strong></Link>
      <div className="home-header-actions">{account.signedIn ? <><Link href="/account" className="home-header-bell" aria-label="Notifications">♧</Link><Link href="/account" className="home-header-avatar" aria-label="My profile">{(account.profile?.username || account.accountName || "P").slice(0,1).toUpperCase()}</Link></> : <Link href="/login" className="kombat-login">LOG IN</Link>}
        <button type="button" className="home-menu-button" aria-label="Open navigation menu" onClick={() => window.dispatchEvent(new Event("base25:open-menu"))}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
      </div>
    </header>
    <div className="home-game-row"><div className="home-game-chips" role="group" aria-label="Choose game">
      <Link href="/"><span>Billiards</span></Link><Link href="/?game=fifa"><span>FIFA</span></Link><Link href="/?game=mortal-kombat" className="active"><span>Mortal Kombat</span></Link>
    </div><button type="button" className="home-share" onClick={share} aria-label="Share BASE25 KOMBAT"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7 8m5-5 5 5M5 13v7h14v-7"/></svg></button></div>
    <div className="kombat-content">
      <section className="kombat-hero">
        <div className="kombat-hero-copy"><div className="kombat-label">MORTAL KOMBAT 11 · WEEKLY ARENA</div><h1>BASE25<br/><em>KOMBAT</em></h1><p>Your fighter. Your rank. Your rivals.</p><div className="kombat-hero-actions"><Link href="/competition?game=mortal-kombat">LEADERBOARD</Link><Link href="/?game=mortal-kombat#characters">CHARACTERS</Link></div></div>
        <div className="kombat-art-placeholder">ART · KEY VISUAL<br/>TWO FIGHTERS<br/>FACE TO FACE</div>
      </section>
      <section className="kombat-card kombat-king"><Avatar value="M"/><div className="kombat-king-copy"><div className="kombat-label">KING OF THE ARENA · THIS WEEK</div><strong>{d.leader.name}</strong><span><FighterTile id={d.leader.fighter}/> {fighters[d.leader.fighter].name} · {d.leader.record} · {d.leader.streak}</span></div><div className="kombat-king-elo"><strong>{d.leader.elo.toLocaleString("en-NG")}</strong><small>ELO</small></div></section>
      <PotCard />
      {account.authReady && (account.signedIn ? <Link href="/account" className="kombat-card kombat-standing"><div><div className="kombat-label">MY KOMBAT STANDING</div><strong>{account.profile?.username || account.accountName || "FIGHTER"}</strong><p>Rank #{d.me.rank} · <em>{d.me.streak} streak</em></p></div><div className="kombat-standing-elo"><strong>{d.me.elo.toLocaleString("en-NG")}</strong><small>KOMBAT ELO</small></div></Link> : <section className="kombat-card kombat-welcome"><div className="kombat-label">WELCOME, FIGHTER</div><h2>LOG IN TO SEE YOUR KOMBAT RANK</h2><Link href="/login">PLAYER LOGIN</Link><small>No login yet? Ask the admin at the base.</small></section>)}
      <section className="kombat-card kombat-section"><div className="kombat-section-head"><div><div className="kombat-label">WEEKLY LEADERBOARD</div><h2>TOP FIGHTERS</h2></div><span className="kombat-tag ranked">LIVE</span></div>
        {(showAll ? d.leaderboard : d.leaderboard.slice(0,5)).map((p,i)=><div className="kombat-player-row" key={p.name}><span className={"kombat-rank rank-"+(i+1)}>{i+1}</span><Avatar value={p.avatar}/><div className="kombat-player-copy"><strong>{p.name}</strong><span><FighterTile id={p.fighter}/> MAIN · {fighters[p.fighter].name.toUpperCase()}</span></div><span className="kombat-record">{p.wins}–{p.losses}</span><b className="kombat-rating">{p.elo.toLocaleString("en-NG")}</b></div>)}
        <button className="kombat-text-link" type="button" onClick={()=>setShowAll(v=>!v)}>{showAll ? "SHOW LESS ↑" : "VIEW FULL LEADERBOARD →"}</button>
      </section>
      <section className="kombat-card kombat-section"><div className="kombat-label">RECENT MATCHES</div><h2>LATEST FIGHTS</h2>
        {d.fights.map((m,i)=><div className="kombat-fight-row" key={i}><div className="kombat-fighter-side"><FighterTile id={m.oneFighter}/><span><b className={m.winner===m.one?"winner":""}>{m.one}</b><small>{fighters[m.oneFighter].name.toUpperCase()}</small></span></div><div className="kombat-fight-score"><strong>{m.score}</strong><i className="kombat-tag ranked">{m.type}</i></div><div className="kombat-fighter-side right"><span><b className={m.winner===m.two?"winner":""}>{m.two}</b><small>{fighters[m.twoFighter].name.toUpperCase()}</small></span><FighterTile id={m.twoFighter}/></div></div>)}
        <Link className="kombat-text-link" href="/competition?game=mortal-kombat">VIEW ALL MATCHES →</Link>
      </section>
      <section className="kombat-card kombat-character" id="characters"><div className="kombat-label">CHARACTER OF THE WEEK</div><div className="kombat-character-main"><FighterTile id={d.character.fighter} large/><div><h2>{fighters[d.character.fighter].name}</h2><div className="kombat-stats"><span><b>{d.character.winRate}%</b><small>WIN RATE</small></span><span><b>{d.character.matches}</b><small>MATCHES</small></span><span><b>{d.character.picked}%</b><small>PICKED</small></span></div></div></div><Link className="kombat-text-link" href="/competition?game=mortal-kombat#characters">OPEN CHARACTER ARENA →</Link></section>
      <section className="kombat-card kombat-rivalry"><div className="kombat-section-head"><div className="kombat-label">RIVALRY</div><span className="kombat-tag heated">HEATED</span></div><div className="kombat-rivalry-main"><div><FighterTile id={d.rivalry.oneFighter} large/><b>{d.rivalry.one}</b></div><strong>{d.rivalry.oneWins} – {d.rivalry.twoWins}<small>LAST 7 MEETINGS</small></strong><div><FighterTile id={d.rivalry.twoFighter} large/><b>{d.rivalry.two}</b></div></div><Link className="kombat-text-link" href="/competition?game=mortal-kombat#rivalries">ALL RIVALRIES →</Link></section>
    </div>
  </main>;
}
