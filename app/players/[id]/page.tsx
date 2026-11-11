"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Rack = {
  id: string;
  match_id: string;
  rack_number: number;
  winner_id: string;
  loser_id: string;
  loser_balls_remaining: number;
};

export default function PlayerProfile() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [racksByMatch, setRacksByMatch] = useState<Record<string, Rack[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!supabase) { setLoading(false); return; }
      const [{ data: profile }, { data: games, error: gamesError }] = await Promise.all([
        supabase.from("player_leaderboard").select("*").eq("id", id).single(),
        supabase.from("matches")
          .select("*,one:players!matches_player_one_id_fkey(full_name,player_code),two:players!matches_player_two_id_fkey(full_name,player_code)")
          .or(`player_one_id.eq.${id},player_two_id.eq.${id}`)
          .order("played_at", { ascending: false }),
      ]);

      setPlayer(profile);
      if (gamesError) console.error("Could not load player matches:", gamesError);
      const matchRows = games || [];
      setMatches(matchRows);

      if (matchRows.length) {
        const { data: rackRows, error: rackError } = await supabase
          .from("match_racks")
          .select("id,match_id,rack_number,winner_id,loser_id,loser_balls_remaining")
          .in("match_id", matchRows.map((match: any) => match.id))
          .order("rack_number", { ascending: true });

        if (rackError) console.error("Could not load rack details:", rackError);
        const grouped: Record<string, Rack[]> = {};
        (rackRows || []).forEach((rack: Rack) => {
          if (!grouped[rack.match_id]) grouped[rack.match_id] = [];
          grouped[rack.match_id].push(rack);
        });
        setRacksByMatch(grouped);
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <main className="shell">Loading player...</main>;
  if (!player) return <main className="shell"><Link href="/">← Leaderboard</Link><h1>Player not found</h1></main>;

  return (
    <main className="shell">
      <header className="topbar">
        <Link className="brand" href="/">BASE<span>25</span> PRO</Link>
        <Link href="/">← Leaderboard</Link>
      </header>

      <section className="profile-hero">
        <div className="avatar large">{player.photo_url ? <img src={player.photo_url} alt="" /> : player.full_name[0]}</div>
        <div>
          <div className="eyebrow">{player.player_code} / PLAYER PROFILE</div>
          <h1>{player.full_name}</h1>
          <p>@{player.username}</p>
        </div>
        <div className="profile-rating"><small>CURRENT ELO</small><strong>{player.elo_rating}</strong></div>
      </section>

      <section className="stats">
        <div><small>MATCHES</small><strong>{player.matches_played}</strong></div>
        <div><small>WINS / LOSSES</small><strong>{player.wins} / {player.losses}</strong></div>
        <div><small>WIN RATE</small><strong>{player.win_percentage}%</strong></div>
        <div><small>HIGHEST ELO</small><strong>{player.highest_elo}</strong></div>
      </section>

      <section className="section">
        <div className="eyebrow">MATCH RECORD</div>
        <h2>All matches<span>.</span></h2>
        {matches.length === 0 ? <p className="muted">No matches recorded.</p> : (
          <div className="match-list">
            {matches.map((match) => {
              const isPlayerOne = match.player_one_id === id;
              const opponent = isPlayerOne ? match.two : match.one;
              const didWin = match.winner_id === id;
              const racks = racksByMatch[match.id] || [];
              return (
                <article className="match match-detail" key={match.id}>
                  <div className="match-summary">
                    <div>
                      <b className={didWin ? "win-text" : "loss-text"}>{didWin ? "WIN" : "LOSS"}</b>
                      <small>vs {opponent?.full_name} · {opponent?.player_code}</small>
                    </div>
                    <strong>{match.player_one_score} — {match.player_two_score}</strong>
                    <div className="right">
                      <b>{isPlayerOne ? match.player_one_elo_after : match.player_two_elo_after} ELO</b>
                      <small>{isPlayerOne ? match.player_one_elo_after - match.player_one_elo_before : match.player_two_elo_after - match.player_two_elo_before} rating change</small>
                    </div>
                    <time>{new Date(match.played_at).toLocaleDateString()}</time>
                  </div>

                  <div className="rack-breakdown">
                    <div className="eyebrow">RACK-BY-RACK RESULT</div>
                    {racks.length ? racks.map((rack) => {
                      const thisPlayerWonRack = rack.winner_id === id;
                      const ballsLeftForOpponent = rack.loser_id !== id;
                      return (
                        <div className="rack-line" key={rack.id}>
                          <b>Rack {rack.rack_number}</b>
                          <span className={thisPlayerWonRack ? "win-text" : "loss-text"}>{thisPlayerWonRack ? "You won" : "You lost"}</span>
                          <span>{ballsLeftForOpponent ? "Opponent" : "You"} left <strong>{rack.loser_balls_remaining}</strong> balls</span>
                        </div>
                      );
                    }) : <p className="muted">Rack details are not available for this match.</p>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
