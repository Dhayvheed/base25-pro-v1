"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import { supabase } from "@/lib/supabase";

type Account = { signedIn: boolean; authReady: boolean; profile: any; accountName: string };
type Rating = { player_id: string; weekly_rating: number; all_time_elo: number; ranked_wins: number; ranked_losses: number };
type Player = { id: string; username: string; photo_url: string | null };
type Fighter = { id: string; name: string; slug: string; tile_color: string | null; image_src: string | null };
type KombatMatch = {
  id: string; player_one_id: string; player_two_id: string; fighter_one_id: string; fighter_two_id: string;
  winner_id: string; player_one_games_won: number; player_two_games_won: number;
  match_type: "ranked" | "casual"; is_final: boolean; published_at: string;
};
type PublicConfig = { pot_mode: "live" | "fixed" | "soon"; fixed_pot_amount: number | null; pot_per_ranked_match: number | null };
type ArenaData = { ratings: Rating[]; players: Map<string, Player>; fighters: Map<string, Fighter>; matches: KombatMatch[]; config: PublicConfig | null; livePotAmount: number; loading: boolean };

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="kombat-empty-state">{children}</p>;
}

function money(value: number) {
  return "₦" + Number(value || 0).toLocaleString("en-NG");
}

function FighterTile({ fighter }: { fighter?: Fighter }) {
  if (!fighter) return <span className="kombat-fighter"><b>?</b></span>;
  return <span className={"kombat-fighter kombat-fighter-" + fighter.slug.replace(/-/g, "")} style={fighter.tile_color ? { background: fighter.tile_color } : undefined}>
    {fighter.image_src ? <img src={fighter.image_src} alt={fighter.name} /> : <b>{fighter.name.slice(0, 1).toUpperCase()}</b>}
  </span>;
}

export default function KombatArenaHome({ account: initialAccount }: { account: Account }) {
  const [account, setAccount] = useState(initialAccount);
  const [arena, setArena] = useState<ArenaData>({ ratings: [], players: new Map(), fighters: new Map(), matches: [], config: null, livePotAmount: 0, loading: true });
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "BASE25 KOMBAT ARENA", url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
    } catch {}
  };

  useEffect(() => {
    let active = true;
    async function loadArena() {
      if (!supabase) {
        if (active) setArena((old) => ({ ...old, loading: false }));
        return;
      }
      const [ratingResult, matchResult, fighterResult, configResult, weekResult] = await Promise.all([
        supabase.from("kombat_ratings").select("player_id,weekly_rating,all_time_elo,ranked_wins,ranked_losses").order("weekly_rating", { ascending: false }).limit(5),
        supabase.from("kombat_matches").select("id,player_one_id,player_two_id,fighter_one_id,fighter_two_id,winner_id,player_one_games_won,player_two_games_won,match_type,is_final,published_at").not("published_at", "is", null).is("voided_at", null).order("published_at", { ascending: false }).limit(5),
        supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src").eq("enabled", true).order("sort_order", { ascending: true }),
        supabase.from("kombat_public_config").select("pot_mode,fixed_pot_amount,pot_per_ranked_match").maybeSingle(),
        supabase.from("kombat_weeks").select("id").eq("status", "open").order("starts_at", { ascending: false }).limit(1).maybeSingle()
      ]);
      if (!active) return;
      const ratings = (ratingResult.data || []) as Rating[];
      const matches = (matchResult.data || []) as KombatMatch[];
      let livePotAmount = 0;
      if (!weekResult.error && weekResult.data?.id) {
        const potResult = await supabase.from("kombat_matches").select("pot_contribution").eq("week_id", weekResult.data.id).eq("match_type", "ranked").eq("is_final", false).not("published_at", "is", null).is("voided_at", null);
        if (!potResult.error) livePotAmount = (potResult.data || []).reduce((total, row) => total + Number(row.pot_contribution || 0), 0);
      }
      const fighters = new Map(((fighterResult.data || []) as Fighter[]).map((fighter) => [fighter.id, fighter]));
      const ids = [...new Set([...ratings.map((row) => row.player_id), ...matches.flatMap((row) => [row.player_one_id, row.player_two_id])])];
      let players = new Map<string, Player>();
      if (ids.length) {
        const playerResult = await supabase.from("players").select("id,username,photo_url").in("id", ids);
        players = new Map(((playerResult.data || []) as Player[]).map((player) => [player.id, player]));
      }
      if (!active) return;
      setArena({
        ratings: ratingResult.error ? [] : ratings,
        players,
        fighters: fighterResult.error ? new Map() : fighters,
        matches: matchResult.error ? [] : matches,
        config: configResult.error ? null : (configResult.data as PublicConfig | null),
        livePotAmount,
        loading: false
      });
    }
    loadArena();
    const timer = window.setInterval(loadArena, 20000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const leader = arena.ratings[0];
  const leaderPlayer = leader ? arena.players.get(leader.player_id) : undefined;
  const potAmount = arena.config?.pot_mode === "fixed"
    ? Number(arena.config.fixed_pot_amount || 0)
    : arena.config?.pot_mode === "live"
      ? arena.livePotAmount
      : null;

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
          <div className="kombat-avatar">{leaderPlayer?.username?.slice(0, 1).toUpperCase() || "♛"}</div>
          <div className="kombat-king-copy">
            <div className="kombat-label">KING OF THE ARENA · THIS WEEK</div>
            <strong>{arena.loading ? "LOADING..." : leaderPlayer?.username || "NO CHAMPION YET"}</strong>
            <span>{leader ? `${leader.ranked_wins} W · ${leader.ranked_losses} L` : "Play ranked matches to claim the throne."}</span>
          </div>
          <div className="kombat-king-elo"><strong>{leader ? leader.weekly_rating.toLocaleString("en-NG") : "—"}</strong><small>KOMBAT ELO</small></div>
        </section>

        <section className="kombat-card kombat-pot">
          <div className="kombat-pot-crown">♛</div>
          <h2>KOMBAT POT</h2>
          <div className="kombat-pot-status">{arena.config?.pot_mode === "live" ? "LIVE CONTRIBUTIONS" : arena.config?.pot_mode === "fixed" ? "WEEKLY PRIZE" : "COMING SOON"}</div>
          <strong className={potAmount === null ? "is-steel" : ""}>{potAmount === null ? "OPENS SOON" : money(potAmount)}</strong>
          <p>{arena.config?.pot_mode === "live" ? "Built from eligible ranked matches this week." : arena.config?.pot_mode === "fixed" ? "Weekly amount set by BASE25." : "The Kombat prize pool will be activated by BASE25."}</p>
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
            <span className="kombat-tag ranked">{arena.loading ? "LOADING" : arena.ratings.length ? "RANKED" : "AWAITING MATCHES"}</span>
          </div>
          {arena.ratings.length ? arena.ratings.map((rating, index) => {
            const player = arena.players.get(rating.player_id);
            return <div className="kombat-player-row" key={rating.player_id}>
              <span className={"kombat-rank rank-" + (index + 1)}>{index + 1}</span>
              <span className="kombat-avatar">{player?.photo_url ? <img src={player.photo_url} alt="" /> : player?.username?.slice(0, 1).toUpperCase() || "?"}</span>
              <span className="kombat-player-copy"><strong>{player?.username || "FIGHTER"}</strong><span>{rating.ranked_wins} W · {rating.ranked_losses} L</span></span>
              <span className="kombat-record">{rating.ranked_wins + rating.ranked_losses} M</span>
              <strong className="kombat-rating">{rating.weekly_rating.toLocaleString("en-NG")}</strong>
            </div>;
          }) : <EmptyState>{arena.loading ? "Loading Kombat standings..." : "No published Kombat matches yet. The leaderboard will populate from Kombat records only."}</EmptyState>}
          <Link className="kombat-text-link" href="/competition?game=mortal-kombat">VIEW FULL LEADERBOARD →</Link>
        </section>

        <section className="kombat-card kombat-section">
          <div className="kombat-label">RECENT MATCHES</div><h2>LATEST FIGHTS</h2>
          {arena.matches.length ? arena.matches.map((match) => {
            const one = arena.players.get(match.player_one_id);
            const two = arena.players.get(match.player_two_id);
            return <div className="kombat-fight-row" key={match.id}>
              <div className="kombat-fighter-side"><FighterTile fighter={arena.fighters.get(match.fighter_one_id)} /><span><b className={match.winner_id === match.player_one_id ? "winner" : ""}>{one?.username || "FIGHTER"}</b><small>{match.match_type.toUpperCase()}{match.is_final ? " · FINAL" : ""}</small></span></div>
              <div className="kombat-fight-score"><strong>{match.player_one_games_won}–{match.player_two_games_won}</strong><span className="kombat-tag">FINAL</span></div>
              <div className="kombat-fighter-side right"><span><b className={match.winner_id === match.player_two_id ? "winner" : ""}>{two?.username || "FIGHTER"}</b><small>{match.match_type.toUpperCase()}{match.is_final ? " · FINAL" : ""}</small></span><FighterTile fighter={arena.fighters.get(match.fighter_two_id)} /></div>
            </div>;
          }) : <EmptyState>{arena.loading ? "Loading recent fights..." : "No Kombat fights have been recorded yet. Billiards and FIFA results are kept separate."}</EmptyState>}
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
