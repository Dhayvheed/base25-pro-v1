"use client";

import { useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

type Account = { signedIn: boolean; authReady: boolean; profile: any; accountName: string };

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="kombat-empty-state">{children}</p>;
}

export default function KombatArenaHome({ account: initialAccount }: { account: Account }) {
  const [account, setAccount] = useState(initialAccount);
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "BASE25 KOMBAT ARENA", url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  return (
    <main className="shell redesign-shell kombat-shell">
      <SiteNavigation onHomeAccountChange={setAccount} />
      <header className="home-header">
        <Link href="/" className="home-header-brand"><span className="home-header-ball">8</span><strong>BASE25 <b>PRO</b></strong></Link>
        <div className="home-header-actions">
          {account.signedIn ? (
            <>
              <Link href="/account" className="home-header-bell" aria-label="Notifications">♧</Link>
              <Link href="/account" className="home-header-avatar" aria-label="My profile">{(account.profile?.username || account.accountName || "P").slice(0, 1).toUpperCase()}</Link>
            </>
          ) : <Link href="/login" className="kombat-login">LOG IN</Link>}
          <button type="button" className="home-menu-button" aria-label="Open navigation menu" onClick={() => window.dispatchEvent(new Event("base25:open-menu"))}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
      </header>

      <div className="home-game-row">
        <div className="home-game-chips" role="group" aria-label="Choose game">
          <Link href="/"><span>Billiards</span></Link>
          <Link href="/?game=fifa"><span>FIFA</span></Link>
          <Link href="/?game=mortal-kombat" className="active"><span>Mortal Kombat</span></Link>
        </div>
        <button type="button" className="home-share" onClick={share} aria-label="Share BASE25 KOMBAT">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L7 8m5-5 5 5M5 13v7h14v-7"/></svg>
        </button>
      </div>

      <div className="kombat-content">
        <section className="kombat-hero">
          <div className="kombat-hero-copy">
            <div className="kombat-label">MORTAL KOMBAT 11 · WEEKLY ARENA</div>
            <h1>BASE25<br/><em>KOMBAT</em></h1>
            <p>Your fighter. Your rank. Your rivals.</p>
            <div className="kombat-hero-actions">
              <Link href="/competition?game=mortal-kombat">LEADERBOARD</Link>
              <Link href="/?game=mortal-kombat#characters">CHARACTERS</Link>
            </div>
          </div>
          <div className="kombat-art-placeholder">ART · KEY VISUAL<br/>TWO FIGHTERS<br/>FACE TO FACE</div>
        </section>

        <section className="kombat-card kombat-king">
          <div className="kombat-king-copy">
            <div className="kombat-label">KING OF THE ARENA · THIS WEEK</div>
            <strong>NO CHAMPION YET</strong>
            <span>Play ranked matches to claim the throne.</span>
          </div>
          <div className="kombat-king-elo"><strong>—</strong><small>KOMBAT ELO</small></div>
        </section>

        <section className="kombat-card kombat-pot">
          <div className="kombat-pot-crown">♛</div>
          <h2>KOMBAT POT</h2>
          <div className="kombat-pot-status">COMING SOON</div>
          <strong className="is-steel">OPENS SOON</strong>
          <p>The Kombat prize pool will be activated by BASE25.</p>
          <Link href="/how-it-works">How KOMBAT works →</Link>
        </section>

        {account.authReady && (account.signedIn ? (
          <Link href="/account" className="kombat-card kombat-standing">
            <div><div className="kombat-label">MY KOMBAT STANDING</div><strong>{account.profile?.username || account.accountName || "FIGHTER"}</strong><p>Your Kombat ranking will appear after your first published ranked match.</p></div>
            <div className="kombat-standing-elo"><strong>—</strong><small>KOMBAT ELO</small></div>
          </Link>
        ) : (
          <section className="kombat-card kombat-welcome">
            <div className="kombat-label">WELCOME, FIGHTER</div>
            <h2>LOG IN TO ACCESS YOUR PLAYER PROFILE</h2>
            <Link href="/login">PLAYER LOGIN</Link>
            <small>Public Arena records will remain visible without login.</small>
          </section>
        ))}

        <section className="kombat-card kombat-section">
          <div className="kombat-section-head">
            <div><div className="kombat-label">WEEKLY LEADERBOARD</div><h2>TOP FIGHTERS</h2></div>
            <span className="kombat-tag ranked">AWAITING MATCHES</span>
          </div>
          <EmptyState>No published Kombat matches yet. The leaderboard will populate from Kombat records only.</EmptyState>
          <Link className="kombat-text-link" href="/competition?game=mortal-kombat">VIEW FULL LEADERBOARD →</Link>
        </section>

        <section className="kombat-card kombat-section">
          <div className="kombat-label">RECENT MATCHES</div><h2>LATEST FIGHTS</h2>
          <EmptyState>No Kombat fights have been recorded yet. Billiards and FIFA results are kept separate.</EmptyState>
          <Link className="kombat-text-link" href="/competition?game=mortal-kombat">VIEW ALL MATCHES →</Link>
        </section>

        <section className="kombat-card kombat-character" id="characters">
          <div className="kombat-label">CHARACTER OF THE WEEK</div>
          <div className="kombat-character-main"><div><h2>NOT DECIDED</h2><p>Character stats will be calculated from published ranked Kombat matches.</p></div></div>
          <Link className="kombat-text-link" href="/competition?game=mortal-kombat#characters">OPEN CHARACTER ARENA →</Link>
        </section>

        <section className="kombat-card kombat-rivalry">
          <div className="kombat-section-head"><div className="kombat-label">RIVALRIES</div><span className="kombat-tag heated">TO BE DECIDED</span></div>
          <EmptyState>Rivalries appear after players have faced each other at least three times.</EmptyState>
          <Link className="kombat-text-link" href="/competition?game=mortal-kombat#rivalries">ALL RIVALRIES →</Link>
        </section>
      </div>
    </main>
  );
}
