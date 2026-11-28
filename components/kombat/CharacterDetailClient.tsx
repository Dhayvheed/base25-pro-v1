"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FighterTile, KombatCard, KombatTag, PrimaryButton, SecondaryButton, RankBadge, Avatar } from "@/components/kombat/KombatUI";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import MatchRow from "@/components/kombat/MatchRow";
import { CHARACTER_DETAIL_SAMPLE, SAMPLE_DETAIL_FIGHTERS } from "@/lib/kombat/character-detail-data";

function SectionHeading({ eyebrow, title, right }: { eyebrow: string; title: string; right?: React.ReactNode }) {
  return <div className="kombat-detail-section-heading"><div><small>{eyebrow}</small><h2>{title}</h2></div>{right}</div>;
}
function ShareButton({ url }: { url: string }) {
  const share = async () => {
    const shareData = { title: "BASE25 KOMBAT · Scorpion", text: "Check out this fighter's BASE25 KOMBAT performance.", url };
    try {
      if (typeof navigator !== "undefined" && navigator.share) await navigator.share(shareData);
      else if (typeof navigator !== "undefined" && navigator.clipboard) await navigator.clipboard.writeText(url);
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError" && navigator.clipboard) {
        try { await navigator.clipboard.writeText(url); } catch { /* clipboard unavailable */ }
      }
    }
  };
  return <SecondaryButton onClick={share}>Share</SecondaryButton>;
}
function LoadingState() {
  return <div className="kombat-detail-loading" aria-label="Loading character details">
    {Array.from({ length: 5 }).map((_, i) => <div className="kombat-detail-skeleton" key={i}><i/><i/><i/></div>)}
  </div>;
}

export default function CharacterDetailClient({ slug }: { slug: string }) {
  const [retryKey, setRetryKey] = useState(0);
  const fighter = CHARACTER_DETAIL_SAMPLE[slug];
  const known = SAMPLE_DETAIL_FIGHTERS.find((item) => item.slug === slug);
  const isKnown = Boolean(fighter || known);
  const displayName = fighter?.name || known?.name || slug.split("-").map(x => x.charAt(0).toUpperCase()+x.slice(1)).join(" ");
  const shareUrl = typeof window === "undefined" ? "https://base25-pro-v1.vercel.app/kombat/characters/" + slug : window.location.href;
  const matchups = useMemo(() => fighter ? [...fighter.matchups].sort((a,b) => (b.winRate ?? -1) - (a.winRate ?? -1)) : [], [fighter]);
  if (!isKnown) return <KombatPageShell active="characters" title="CHARACTER"><div className="kombat-detail-content"><KombatCard className="kombat-detail-empty"><strong>FIGHTER NOT FOUND</strong><p>We couldn't find this character in the current Kombat roster.</p><Link href="/kombat/characters">Back to Character Arena</Link></KombatCard></div></KombatPageShell>;
  if (!fighter || fighter.matches === 0) return <KombatPageShell active="characters" title="CHARACTER"><div className="kombat-detail-content"><KombatCard className="kombat-detail-hero"><FighterTile slug={slug} name={displayName} /><h1>{displayName}</h1><p>No ranked matches with this fighter yet.</p><KombatTag tone="new">TIER NEW</KombatTag></KombatCard></div></KombatPageShell>;

  const matchRows = fighter.fights.map((fight) => ({
    ...fight, fighterOneSlug: "scorpion", fighterTwoSlug: "sub-zero",
  }));
  const chartAlt = "Win rate by week: " + fighter.weekly.map(v => v === null ? "no ranked matches" : v + " percent").join(", ");
  return <KombatPageShell active="characters" title="CHARACTER">
    <div className="kombat-detail-content" key={retryKey}>
      <KombatCard className="kombat-detail-hero">
        <div className="kombat-detail-art-row">
          <div className="kombat-detail-hero-tile"><FighterTile slug={slug} name={displayName}/><span>{fighter.tier}</span></div>
          {fighter.portraitSrc ? <div className="kombat-detail-portrait"><img src={fighter.portraitSrc} alt={displayName + " full fighter portrait"}/></div> : <div className="kombat-detail-portrait kombat-detail-art-placeholder"><span>ART · FULL FIGHTER<br/>PORTRAIT (REPLACES THE TILE)</span></div>}
        </div>
        <div className="kombat-detail-identity"><div><small>BASE25 PERFORMANCE · NOT OFFICIAL</small><h1>{displayName}</h1></div><KombatTag tone={fighter.tier === "S" ? "gold" : fighter.tier === "A" ? "steel" : fighter.tier === "B" ? "bronze" : fighter.tier === "C" ? "grey" : "new"}>TIER {fighter.tier}</KombatTag></div>
        <div className="kombat-detail-stats">
          <div><small>WIN RATE</small><b className="gold">{fighter.winRate}%</b></div>
          <div><small>MATCHES</small><b>{fighter.matches}</b></div>
          <div><small>W – L</small><b>{fighter.wins}–{fighter.losses}</b></div>
        </div>
        <div className="kombat-detail-secondary-stats">
          <div><small>PICK RATE</small><b>{fighter.pickRate}%</b><span className="kombat-detail-pick-track"><i style={{width: fighter.pickRate + "%"}}/></span></div>
          <div><small>FIGHTER RANK</small><b>#{fighter.rank}<em> of {fighter.enabledFighterCount}</em></b></div>
        </div>
        <div className="kombat-detail-actions"><ShareButton url={shareUrl}/><PrimaryButton href={"/kombat/characters/compare?a=" + encodeURIComponent(slug)}>Compare fighter</PrimaryButton></div>
      </KombatCard>

      <KombatCard className="kombat-detail-panel">
        <SectionHeading eyebrow="TREND" title="Win rate by week" right={<KombatTag tone="steel">LAST 6 WEEKS</KombatTag>}/>
        <div className="kombat-detail-chart" role="img" aria-label={chartAlt}>
          {fighter.weekly.map((value, i) => <div className="kombat-detail-chart-col" key={i}>
            <div className="kombat-detail-chart-track">{value !== null && <span className={i === 5 ? "current" : ""} style={{height: value + "%"}}/>}</div>
            <small>W{i+1}</small><b>{value === null ? "–" : value + "%"}</b>
          </div>)}
        </div>
        <table className="kombat-detail-visually-hidden"><caption>Win rate by week</caption><thead><tr><th>Week</th><th>Win rate</th></tr></thead><tbody>{fighter.weekly.map((value,i)=><tr key={i}><td>W{i+1}</td><td>{value === null ? "No ranked matches" : value + "%"}</td></tr>)}</tbody></table>
      </KombatCard>

      <KombatCard className="kombat-detail-panel">
        <SectionHeading eyebrow="BEST AND WORST MATCHUPS" title="Against other fighters"/>
        <p className="kombat-detail-note">Win rate when {displayName} is used. Shown only with 3 or more meetings.</p>
        <div className="kombat-detail-matchups">{matchups.slice(0,5).map(opponent => <Link href={"/kombat/characters/compare?a="+slug+"&b="+opponent.slug} className="kombat-detail-matchup" key={opponent.slug}>
          <FighterTile slug={opponent.slug} name={opponent.name} size="compare"/>
          <span className="kombat-detail-matchup-main"><b>{opponent.name}</b>{opponent.meetings >= 3 && opponent.winRate !== null ? <i><span className={opponent.winRate >= 50 ? "gold-fill" : "red-fill"} style={{width:opponent.winRate+"%"}}/></i> : <small>NOT ENOUGH DATA · {opponent.meetings} MEETINGS</small>}</span>
          {opponent.meetings >= 3 && opponent.winRate !== null && <span className={"kombat-detail-matchup-rate "+(opponent.winRate>=50?"gold":"red")}>{opponent.winRate}%<small>{opponent.meetings} MEETINGS</small></span>}
        </Link>)}</div>
      </KombatCard>

      <KombatCard className="kombat-detail-panel">
        <SectionHeading eyebrow="PLAYERS" title={"Top " + displayName + " players"}/>
        <div className="kombat-detail-players">{fighter.topPlayers.filter(p=>p.matches>=3).sort((a,b)=>b.winRate-a.winRate).slice(0,3).map((player,i)=><Link className="kombat-detail-player" href={"/kombat/players/"+player.id} key={player.id}>
          <RankBadge rank={i+1}/><Avatar name={player.name} imageSrc={player.avatarSrc}/><b>{player.name}</b><span><strong>{player.winRate}%</strong><small>{player.matches} MATCHES</small></span>
        </Link>)}</div>
      </KombatCard>

      <KombatCard className="kombat-detail-panel">
        <SectionHeading eyebrow="RECENT" title={"Latest " + displayName + " fights"}/>
        <div className="kombat-detail-fights">{matchRows.map(match=><MatchRow key={match.id} match={match} featuredFighter={{slug,name:displayName}}/>)}</div>
        <Link className="kombat-detail-view-all" href={"/kombat/coming-soon/matches?fighter="+encodeURIComponent(slug)}>View all {displayName} matches →</Link>
      </KombatCard>
      <p className="kombat-detail-footer-note">Fighter stats use ranked matches only. They describe how the fighter performs at BASE25 and never change a player's Elo.</p>
      <button type="button" className="kombat-detail-retry" onClick={()=>setRetryKey(v=>v+1)} hidden>Retry</button>
    </div>
  </KombatPageShell>;
}
