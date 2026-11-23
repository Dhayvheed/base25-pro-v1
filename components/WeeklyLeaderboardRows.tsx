"use client";

import Link from "next/link";

export type WeeklyLeaderboardPlayer = {
  id: string;
  player_code: string;
  username: string;
  photo_url: string | null;
  elo_rating: number;
  wins: number;
  losses: number;
  designation?: "regular" | "house_ghost" | "boardman";
  hasBoardmanSlayerBadge?: boolean;
  boardmanBonusPoints?: number;
};

function DesignationBadge({ designation, variant }: { designation?: WeeklyLeaderboardPlayer["designation"]; variant: "home" | "competition" }) {
  const normalizedDesignation = String(designation || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalizedDesignation === "boardman") {
    return <span className="home-v2-designation-tag is-boardman">BOARDMAN 💀</span>;
  }
  if (normalizedDesignation === "house_ghost" || normalizedDesignation === "house_ghosts") {
    return <span className="home-v2-designation-tag">HOUSE GHOSTS 👻</span>;
  }
  return null;
}

function HomeRows({ players }: { players: WeeklyLeaderboardPlayer[] }) {
  const rankColors = ["#F2C230", "#2F5FD0", "#D9402F", "#7B3FA0", "#E8782A"];
  let eligibleRank = 0;
  return <>{players.map((player) => {
    const isOdumodu = player.username?.trim().toLowerCase() === "odumodu";
    const rank = isOdumodu ? null : ++eligibleRank;
    const isHighlighted = isOdumodu;
    const rankIndex = rank === null ? 0 : rank - 1;
    return <Link className={"home-v2-player-row " + (isHighlighted ? "is-first" : "")} href={"/players/" + player.id} key={player.id}
      style={isHighlighted ? { background: "linear-gradient(105deg, rgba(190,35,45,.34), rgba(125,18,28,.16))", border: "1px solid rgba(235,75,85,.95)", boxShadow: "0 0 18px rgba(220,40,55,.22), inset 0 0 18px rgba(190,35,45,.10)", borderRadius: 14 } : undefined}>
      <span className={"home-v2-rank " + (rank === null ? "is-empty" : "rank-" + rank)}>{rank !== null && <span className="home-v2-rank-ball" style={{ background: rankColors[rankIndex] || "#52634b" }}><i>{rank}</i></span>}</span>
      <span className="home-v2-player">
        <span className="home-v2-avatar">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.username?.[0]?.toUpperCase() || "?"}</span>
        <span className="home-v2-player-copy">
          <strong>{player.username}{isHighlighted && <span className="home-v2-player-crown" aria-label="Featured player">♛</span>}</strong>
          <DesignationBadge designation={player.designation} variant="home" />
          {player.hasBoardmanSlayerBadge && <span className="home-v2-designation-tag is-boardman-slayer">BOARDMAN SLAYER ⚔</span>}
          <small>{player.player_code}</small>
        </span>
      </span>
      <strong className="home-v2-record">{player.wins}W / {player.losses}L</strong>
      <strong className="home-v2-rating">{(Number(player.elo_rating || 0) + Number(player.boardmanBonusPoints || 0)).toLocaleString("en-NG")}</strong>
    </Link>;
  })}</>;
}
function CompetitionRows({ players }: { players: WeeklyLeaderboardPlayer[] }) {
  let eligibleRank = 0;
  return <>{players.map((player) => {
    const isOdumodu = player.username?.trim().toLowerCase() === "odumodu";
    const rank = isOdumodu ? null : ++eligibleRank;
    const rankBackground = rank === 1 ? "#f2c230" : rank === 2 ? "#2f5fd0" : rank === 3 ? "#d9402f" : rank === 4 ? "#7b3fa0" : "#e8782a";
    return <Link href={"/players/" + player.id} className={"competition-ref-player-row " + (isOdumodu ? "is-leader" : "")} key={player.id}
      style={{ display: "grid", gridTemplateColumns: "26px 34px minmax(0,1fr) 48px 46px", alignItems: "center", columnGap: 10, minHeight: 56, padding: "0 10px", border: isOdumodu ? "1px solid rgba(200,241,105,.55)" : "1px solid transparent", borderBottomColor: isOdumodu ? "rgba(200,241,105,.55)" : "#1f2a24", borderRadius: 14, background: isOdumodu ? "linear-gradient(90deg,rgba(200,241,105,.18),rgba(200,241,105,.04))" : "transparent", color: "#f4f5f2", textDecoration: "none", width: "100%", boxSizing: "border-box" }}>
      <span className={"competition-ref-rank " + (rank === null ? "is-empty" : "rank-" + rank)} style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "50%", background: rank === null ? "transparent" : rankBackground, color: "#111", fontSize: 10, fontWeight: 900, lineHeight: 1, flexShrink: 0, boxShadow: rank === null ? "none" : "inset -2px -2px 4px rgba(0,0,0,.35)" }}>{rank !== null && <b style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", color: "#111" }}>{rank}</b>}</span>
      <span className="competition-ref-avatar" style={{ width: 34, height: 34, flex: "0 0 34px", display: "grid", placeItems: "center", position: "relative", overflow: "visible", border: "2px solid #c8f169", borderRadius: "50%", background: "#17251b", color: "#c8f169", fontSize: 14, fontWeight: 900, lineHeight: 1 }}>
        {player.photo_url ? <img src={player.photo_url} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : player.username?.[0]?.toUpperCase() || "?"}
        {rank === 1 && <i aria-label="Weekly leader" style={{ position: "absolute", right: -7, top: -8, color: "#e8c547", fontSize: 14, fontStyle: "normal" }}>♛</i>}
      </span>
      <span className="competition-ref-player-name" style={{ minWidth: 0, display: "grid", gap: 4 }}>
        <strong style={{ display: "block", minWidth: 0, overflow: "visible", textOverflow: "clip", whiteSpace: "normal", overflowWrap: "break-word", lineHeight: 1.2, fontSize: 15, fontWeight: 600, color: "#f4f5f2" }}>
          {player.username}
        </strong>
        <DesignationBadge designation={player.designation} variant="competition" />
        {player.hasBoardmanSlayerBadge && <span className="home-v2-designation-tag is-boardman-slayer">BOARDMAN SLAYER ⚔</span>}
        <small style={{ display: "block", font: "10px 'JetBrains Mono',monospace", letterSpacing: 0, color: "#9aa69f" }}>{player.player_code}</small>
      </span>
      <span className="competition-ref-record" style={{ display: "block", textAlign: "right", whiteSpace: "nowrap", fontSize: 12, color: "#d5dad6" }}>{player.wins}W / {player.losses}L</span>
      <strong className="competition-ref-rating" style={{ display: "block", textAlign: "right", whiteSpace: "nowrap", fontSize: 17, fontWeight: 800, color: "#c8f169", fontVariantNumeric: "tabular-nums" }}>{(Number(player.elo_rating || 0) + Number(player.boardmanBonusPoints || 0)).toLocaleString("en-NG")}</strong>
    </Link>;
  })}</>;
}
export async function getBoardmanSlayerPlayerIds(client: any): Promise<Set<string>> {
  const { data: boardmen, error: boardmenError } = await client
    .from("players")
    .select("id")
    .eq("designation", "boardman");

  if (boardmenError || !boardmen?.length) return new Set<string>();

  const boardmanIds = boardmen.map((player: { id: string }) => player.id).filter(Boolean);
  if (!boardmanIds.length) return new Set<string>();

  const idList = boardmanIds.join(",");
  const { data: matches, error: matchesError } = await client
    .from("matches")
    .select("player_one_id,player_two_id,player_one_score,player_two_score")
    .or(`player_one_id.in.(${idList}),player_two_id.in.(${idList})`);

  if (matchesError || !matches?.length) return new Set<string>();

  const boardmanSet = new Set(boardmanIds);
  const slayers = new Set<string>();
  for (const match of matches) {
    const oneIsBoardman = boardmanSet.has(match.player_one_id);
    const twoIsBoardman = boardmanSet.has(match.player_two_id);
    if (oneIsBoardman === twoIsBoardman) continue;
    if (Number(match.player_one_score) > Number(match.player_two_score) && !oneIsBoardman) slayers.add(match.player_one_id);
    if (Number(match.player_two_score) > Number(match.player_one_score) && !twoIsBoardman) slayers.add(match.player_two_id);
  }
  return slayers;
}

export default function WeeklyLeaderboardRows({ players, variant }: { players: WeeklyLeaderboardPlayer[]; variant: "home" | "competition" }) {
  return variant === "home" ? <HomeRows players={players} /> : <CompetitionRows players={players} />;
}
