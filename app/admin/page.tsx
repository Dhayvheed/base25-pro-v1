"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { id: string; full_name: string; player_code: string };
type Rack = { winnerId: string; loserBalls: string };

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [admin, setAdmin] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState("");
  const [one, setOne] = useState("");
  const [two, setTwo] = useState("");
  const [venue, setVenue] = useState("BASE25");
  const [racks, setRacks] = useState<Rack[]>([
    { winnerId: "", loserBalls: "0" },
    { winnerId: "", loserBalls: "0" },
    { winnerId: "", loserBalls: "0" },
  ]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    if (!supabase) return;
    const { data, error } = await supabase.from("players").select("id,full_name,player_code").order("full_name");
    if (error) setMessage(error.message);
    setPlayers(data || []);
  }

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, currentSession) => setSession(currentSession));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function checkAdmin() {
      if (!supabase || !session) return;
      const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", session.user.id).maybeSingle();
      setAdmin(!!data);
      if (error) setMessage(error.message);
      if (data) refresh();
    }
    checkAdmin();
  }, [session]);

  const thirdRackNeeded = !!racks[0].winnerId && !!racks[1].winnerId && racks[0].winnerId !== racks[1].winnerId;
  const rackWins = useMemo(() => {
    const completed = thirdRackNeeded ? racks.slice(0, 3) : racks.slice(0, 2);
    return {
      one: completed.filter((rack) => rack.winnerId === one).length,
      two: completed.filter((rack) => rack.winnerId === two).length,
    };
  }, [racks, one, two, thirdRackNeeded]);

  function updateRack(index: number, field: keyof Rack, value: string) {
    setRacks((current) => current.map((rack, i) => i === index ? { ...rack, [field]: value } : rack));
  }

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error?.message || "Signed in.");
    setBusy(false);
  }

  async function addPlayer(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.from("players").insert({ full_name: fullName.trim(), username: username.trim(), photo_url: photo.trim() || null });
    setMessage(error?.message || "Player registered.");
    if (!error) {
      setFullName(""); setUsername(""); setPhoto("");
      await refresh();
    }
    setBusy(false);
  }

  async function addMatch(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !one || !two || one === two) return;
    if (!racks[0].winnerId || !racks[1].winnerId) {
      setMessage("Select a winner and balls remaining for racks 1 and 2.");
      return;
    }
    if (thirdRackNeeded && !racks[2].winnerId) {
      setMessage("The match is tied 1–1. Complete rack 3.");
      return;
    }
    const rackCount = thirdRackNeeded ? 3 : 2;
    const payload = racks.slice(0, rackCount).map((rack) => ({
      winner_id: rack.winnerId,
      loser_balls_remaining: Number(rack.loserBalls),
    }));
    if (payload.some((rack) => ![one, two].includes(rack.winner_id) || !Number.isInteger(rack.loser_balls_remaining) || rack.loser_balls_remaining < 0)) {
      setMessage("Check each rack winner and the losing player's balls remaining.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("record_match_with_racks", {
      p_player_one_id: one,
      p_player_two_id: two,
      p_racks: payload,
      p_venue: venue.trim() || "BASE25",
    });
    setMessage(error?.message || `Match saved successfully. Match ID: ${data}`);
    if (!error) {
      setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]);
      setOne(""); setTwo("");
    }
    setBusy(false);
  }

  if (!supabase) return <main className="shell"><h1>Supabase setup required</h1></main>;

  if (!session) return (
    <main className="shell admin-shell">
      <header className="topbar"><Link className="brand" href="/">BASE<span>25</span> PRO</Link><Link href="/">← Public site</Link></header>
      <div className="admin-card"><div className="eyebrow">RESTRICTED ACCESS</div><h1>Admin login<span>.</span></h1>
        <form className="form" onSubmit={login}>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <button disabled={busy}>{busy ? "Please wait..." : "Sign in"}</button>
        </form>{message && <p className="notice">{message}</p>}
      </div>
    </main>
  );

  if (!admin) return <main className="shell"><h1>Access not authorised</h1><p>This account is not on the admin list.</p><button onClick={() => supabase!.auth.signOut()}>Sign out</button></main>;

  const playerName = (id: string) => players.find((player) => player.id === id)?.full_name || "Select player";
  const winnerOptions = players.filter((player) => player.id === one || player.id === two);

  return (
    <main className="shell admin-shell">
      <header className="topbar"><Link className="brand" href="/">BASE<span>25</span> PRO</Link><button className="secondary" onClick={() => supabase!.auth.signOut()}>Sign out</button></header>
      <div className="eyebrow">CONTROL ROOM</div><h1>Admin desk<span>.</span></h1>
      {message && <p className="notice">{message}</p>}
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Register player</h2>
          <form className="form" onSubmit={addPlayer}>
            <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Username<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label>Photo URL (optional)<input value={photo} onChange={(e) => setPhoto(e.target.value)} /></label>
            <button disabled={busy}>Register player</button>
          </form>
        </section>

        <section className="admin-card">
          <h2>Record match</h2>
          <p className="eyebrow">OFFICIAL RANKED FORMAT · BEST OF 3 RACKS</p>
          <form className="form" onSubmit={addMatch}>
            <label>Player one
              <select required value={one} onChange={(e) => { setOne(e.target.value); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>
                <option value="">Select player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.full_name} ({player.player_code})</option>)}
              </select>
            </label>
            <label>Player two
              <select required value={two} onChange={(e) => { setTwo(e.target.value); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>
                <option value="">Select player</option>{players.filter((player) => player.id !== one).map((player) => <option key={player.id} value={player.id}>{player.full_name} ({player.player_code})</option>)}
              </select>
            </label>
            <label>Venue / table<input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>

            {[0, 1].map((index) => (
              <div className="admin-card" key={index}>
                <h3>Rack {index + 1}</h3>
                <label>Rack winner
                  <select required value={racks[index].winnerId} onChange={(e) => updateRack(index, "winnerId", e.target.value)}>
                    <option value="">Select rack winner</option>
                    {winnerOptions.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}
                  </select>
                </label>
                <label>Balls left on table by losing player
                  <input type="number" min="0" step="1" required value={racks[index].loserBalls} onChange={(e) => updateRack(index, "loserBalls", e.target.value)} />
                </label>
                {racks[index].winnerId && <p className="eyebrow">{playerName(racks[index].winnerId)} won · {playerName(racks[index].winnerId === one ? two : one)} left {racks[index].loserBalls || "0"} balls</p>}
              </div>
            ))}

            {thirdRackNeeded && (
              <div className="admin-card">
                <h3>Rack 3 · Decider</h3>
                <p className="eyebrow">The first two racks are tied 1–1. This rack decides the match.</p>
                <label>Rack winner
                  <select required value={racks[2].winnerId} onChange={(e) => updateRack(2, "winnerId", e.target.value)}>
                    <option value="">Select rack winner</option>
                    {winnerOptions.map((player) => <option key={player.id} value={player.id}>{player.full_name}</option>)}
                  </select>
                </label>
                <label>Balls left on table by losing player
                  <input type="number" min="0" step="1" required value={racks[2].loserBalls} onChange={(e) => updateRack(2, "loserBalls", e.target.value)} />
                </label>
                {racks[2].winnerId && <p className="eyebrow">{playerName(racks[2].winnerId)} won · {playerName(racks[2].winnerId === one ? two : one)} left {racks[2].loserBalls || "0"} balls</p>}
              </div>
            )}

            <div className="admin-card">
              <h3>Match score</h3>
              <div className="two-fields"><p>{playerName(one)}<br /><strong>{rackWins.one}</strong></p><p>{playerName(two)}<br /><strong>{rackWins.two}</strong></p></div>
              <p className="eyebrow">{rackWins.one === 2 ? `Match winner: ${playerName(one)}` : rackWins.two === 2 ? `Match winner: ${playerName(two)}` : thirdRackNeeded ? "Decider required" : "Complete rack 1 and rack 2"}</p>
            </div>
            <button disabled={busy || !one || !two || one === two || !racks[0].winnerId || !racks[1].winnerId || (thirdRackNeeded && !racks[2].winnerId) || (rackWins.one !== 2 && rackWins.two !== 2)}>
              {busy ? "Saving match..." : "Save match"}
            </button>
          </form>
        </section>
      </div>
      <section className="admin-card"><h2>Registered players ({players.length})</h2>{players.map((player) => <div className="player-row" key={player.id}><b>{player.full_name}</b><span>{player.player_code}</span></div>)}</section>
    </main>
  );
}
