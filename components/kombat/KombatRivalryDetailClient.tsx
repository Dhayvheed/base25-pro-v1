"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import { KombatCard, KombatTag, FighterTile, PrimaryButton, SecondaryButton } from "@/components/kombat/KombatUI";
import { SAMPLE_RIVALRY, SAMPLE_RIVALRY_ID } from "@/lib/kombat/rivalry-detail-sample";

function initialsName(name: string) { return name.toUpperCase(); }

export default function KombatRivalryDetailClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [visible, setVisible] = useState(10);
  const [shareMessage, setShareMessage] = useState("");
  const rivalry = id === SAMPLE_RIVALRY_ID ? SAMPLE_RIVALRY : null;

  const leftWins = rivalry?.resultsOldestFirst.filter((x) => x === "L").length ?? 0;
  const rightWins = rivalry?.resultsOldestFirst.length ? rivalry.resultsOldestFirst.length - leftWins : 0;
  const totalRecent = leftWins + rightWins;
  const timelineText = useMemo(() => rivalry?.resultsOldestFirst.map((result, index) =>
    "Meeting " + (index + 1) + ": " + (result === "L" ? rivalry.leftPlayer.name : rivalry.rightPlayer.name) + " won"
  ).join(". ") ?? "", [rivalry]);

  const share = async () => {
    if (!rivalry || typeof window === "undefined") return;
    const url = window.location.href;
    const title = "BASE25 KOMBAT · " + rivalry.leftPlayer.name + " vs " + rivalry.rightPlayer.name;
    const text = title + " · " + leftWins + "–" + rightWins + " in the last 7 meetings";
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        setShareMessage("Share sheet opened.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareMessage("Rivalry link copied.");
      } else {
        setShareMessage("Copy this page URL to share the rivalry.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      setShareMessage("Unable to share automatically. Copy this page URL instead.");
    }
  };

  if (!rivalry) {
    return <KombatPageShell active="rivalries" title="RIVALRY">
      <div className="kombat-rd-page">
        <KombatCard className="kombat-rd-not-found">
          <b>THIS RIVALRY DOESN'T EXIST (YET)</b>
          <p>It may have fewer than three published ranked meetings, or the link may be invalid.</p>
          <Link href="/kombat/rivalries">BACK TO RIVALRIES</Link>
        </KombatCard>
      </div>
    </KombatPageShell>;
  }

  const left = rivalry.leftPlayer;
  const right = rivalry.rightPlayer;
  const leaderCaption = rivalry.status === "HEATED"
    ? "Too close to call. " + left.name + " leads by one meeting."
    : rivalry.status === "ONE-SIDED"
      ? left.name + " dominates this rivalry."
      : left.name + " has the edge.";
  const mostPlayed = rivalry.pairings[0];
  const allMeetings = rivalry.meetingsNewestFirst;

  return <KombatPageShell active="rivalries" title="RIVALRY">
    <div className="kombat-rd-page">
      <section className="kombat-rd-hero">
        <div className="kombat-rd-hero-top">
          <KombatTag tone="red" className="kombat-rd-status heated">HEATED</KombatTag>
          <span>{allMeetings.length} RANKED MEETINGS</span>
        </div>
        <div className="kombat-rd-contenders">
          <Link className="kombat-rd-contender" href={"/kombat/players/" + left.id}>
            <FighterTile slug="scorpion" name="Scorpion" size="portrait" />
            <strong className="leader">{initialsName(left.name)}</strong>
            <small>SCORPION · ELO {left.elo.toLocaleString("en-US")}</small>
          </Link>
          <div className="kombat-rd-record">
            <strong><span>{leftWins}</span><i>–</i><span className="trailing">{rightWins}</span></strong>
            <small>LAST 7 MEETINGS</small>
          </div>
          <Link className="kombat-rd-contender" href={"/kombat/players/" + right.id}>
            <FighterTile slug="sub-zero" name="Sub-Zero" size="portrait" />
            <strong>{initialsName(right.name)}</strong>
            <small>SUB-ZERO · ELO {right.elo.toLocaleString("en-US")}</small>
          </Link>
        </div>
        <div className="kombat-rd-proportion" role="img" aria-label={left.name + " " + leftWins + " wins, " + right.name + " " + rightWins + " wins in the last 7 meetings"}>
          <span style={{ width: (leftWins / totalRecent * 100) + "%" }} />
          <span style={{ width: (rightWins / totalRecent * 100) + "%" }} />
        </div>
        <p>{leaderCaption}</p>
      </section>

      <section className="kombat-rd-stat-grid" aria-label="Rivalry statistics">
        <div className="kombat-rd-stat"><small>CURRENT STREAK</small><strong className="gold">W{rivalry.currentStreak.wins}</strong><span>{left.name}</span></div>
        <div className="kombat-rd-stat"><small>LAST MET</small><strong>{rivalry.lastMet}</strong><span>{rivalry.lastMeetingNote}</span></div>
        <div className="kombat-rd-stat"><small>GAMES WON</small><strong>{rivalry.gamesWon.left}–{rivalry.gamesWon.right}</strong><span>Dead level</span></div>
        <div className="kombat-rd-stat"><small>LONGEST STREAK</small><strong>W{rivalry.longestStreak.wins}</strong><span>{rivalry.longestStreak.names}</span></div>
      </section>

      <KombatCard className="kombat-rd-panel">
        <div className="kombat-rd-kicker">TIMELINE</div>
        <div className="kombat-rd-panel-heading"><h2>MEETING BY MEETING</h2><KombatTag tone="steel">OLDEST → NEWEST</KombatTag></div>
        <div className="kombat-rd-timeline" role="group" aria-label={timelineText}>
          {rivalry.resultsOldestFirst.map((result, index) => {
            const meeting = [...allMeetings].reverse()[index];
            return <Link key={meeting.id} href={"/kombat/matches/" + meeting.id} className={result === "L" ? "left" : "right"} aria-label={"Meeting " + (index + 1) + ": " + (result === "L" ? left.name : right.name) + " won"} />;
          })}
        </div>
        <div className="kombat-rd-timeline-key"><span><i className="left" />{left.name} won</span><span><i className="right" />{right.name} won</span></div>
        <p className="kombat-rd-sr-only">{timelineText}</p>
      </KombatCard>

      <KombatCard className="kombat-rd-panel">
        <div className="kombat-rd-kicker">FIGHTERS</div>
        <h2>WHO THEY PLAY AGAINST EACH OTHER</h2>
        <div className="kombat-rd-usage">
          <div><small>{left.name.toUpperCase()} USED</small><p>Scorpion in 7 of 7</p></div>
          <div><small>{right.name.toUpperCase()} USED</small><p>Sub-Zero in 6 · Liu Kang in 1</p></div>
        </div>
        <div className="kombat-rd-pairings">
          {rivalry.pairings.map((pair) => <div className="kombat-rd-pairing" key={pair.left.slug + pair.right.slug}>
            <div className="kombat-rd-pairing-tiles"><FighterTile slug={pair.left.slug} name={pair.left.name} size="compare" /><FighterTile slug={pair.right.slug} name={pair.right.name} size="compare" /></div>
            <div className="kombat-rd-pairing-copy"><strong>{pair.left.name} vs {pair.right.name}</strong><small>{pair.meetings} MEETINGS</small></div>
            <b>{pair.leftWins} – {pair.rightWins}</b>
          </div>)}
        </div>
        <Link className="kombat-rd-compare" href={"/kombat/characters/compare?a=" + mostPlayed.left.slug + "&b=" + mostPlayed.right.slug}>Compare {mostPlayed.left.name} vs {mostPlayed.right.name} →</Link>
      </KombatCard>

      <KombatCard className="kombat-rd-panel kombat-rd-meetings">
        <div className="kombat-rd-kicker">ALL MEETINGS</div>
        <div className="kombat-rd-panel-heading"><h2>MATCH BY MATCH</h2><KombatTag tone="steel">{allMeetings.length} RANKED</KombatTag></div>
        <div className="kombat-rd-meeting-list">
          {allMeetings.slice(0, visible).map((meeting) => {
            const winnerName = meeting.winner === "left" ? left.name : right.name;
            const loserName = meeting.winner === "left" ? right.name : left.name;
            return <Link className="kombat-rd-meeting" href={"/kombat/matches/" + meeting.id} key={meeting.id}>
              <small className="number">#{meeting.number}</small>
              <span className="kombat-rd-meeting-tiles"><FighterTile slug={meeting.leftFighter.slug} name={meeting.leftFighter.name} size="compare" /><FighterTile slug={meeting.rightFighter.slug} name={meeting.rightFighter.name} size="compare" /></span>
              <span className="kombat-rd-meeting-copy"><span><b>{winnerName}</b> beat <i>{loserName}</i></span><small>{meeting.dateLabel}</small><em>{meeting.status}</em></span>
              <strong className={meeting.winner === "left" ? "left-score" : "right-score"}>{meeting.leftScore} – {meeting.rightScore}</strong>
              <span className="chevron" aria-hidden="true">›</span>
            </Link>;
          })}
        </div>
        {visible < allMeetings.length && <button className="kombat-rd-load-more" onClick={() => setVisible((v) => v + 10)}>LOAD MORE MEETINGS</button>}
      </KombatCard>

      <div className="kombat-rd-actions">
        <div><SecondaryButton onClick={() => window.location.assign("/kombat/players/" + left.id)}>{left.name}'s profile</SecondaryButton><SecondaryButton onClick={() => window.location.assign("/kombat/players/" + right.id)}>{right.name}'s profile</SecondaryButton></div>
        <PrimaryButton className="kombat-rd-share" onClick={share}>SHARE RIVALRY</PrimaryButton>
        {shareMessage && <p role="status">{shareMessage}</p>}
      </div>
      <p className="kombat-rd-footnote">A rivalry counts ranked meetings only. Casual and removed matches are never included. Status is HEATED when the last 7 meetings are within one win.</p>
    </div>
  </KombatPageShell>;
}
