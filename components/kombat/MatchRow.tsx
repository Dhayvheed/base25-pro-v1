import Link from "next/link";
import { FighterTile } from "@/components/kombat/KombatUI";

export type KombatMatchRowData = {
  id: string; playerOne: string; playerTwo: string; winner: "one" | "two";
  fighterOne: string; fighterTwo: string; fighterOneSlug: string; fighterTwoSlug: string;
  dateLabel: string; score: string; ranked: boolean;
};

export default function MatchRow({ match, featuredFighter }: { match: KombatMatchRowData; featuredFighter: { slug: string; name: string } }) {
  const href = "/kombat/matches/" + encodeURIComponent(match.id);
  return <Link className="kombat-detail-match-row" href={href} aria-label={match.playerOne + " versus " + match.playerTwo + ", score " + match.score}>
    <FighterTile slug={featuredFighter.slug} name={featuredFighter.name} size="compare" />
    <span className="kombat-detail-match-copy">
      <strong><span className={match.winner === "one" ? "match-winner" : "match-loser"}>{match.playerOne}</span><i> vs </i><span className={match.winner === "two" ? "match-winner" : "match-loser"}>{match.playerTwo}</span></strong>
      <small>{match.fighterOne.toUpperCase()} · {match.fighterTwo.toUpperCase()} · {match.dateLabel}</small>
    </span>
    <span className="kombat-detail-match-result"><b>{match.score}</b>{match.ranked && <em>RANKED</em>}</span>
    <span className="kombat-detail-chevron" aria-hidden="true">›</span>
  </Link>;
}
