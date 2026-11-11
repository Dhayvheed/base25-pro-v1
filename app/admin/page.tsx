"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { id: string; full_name: string; player_code: string; username: string; photo_url?: string | null };
type MatchRecord = { id: string; played_at: string; venue: string; player_one_id: string; player_two_id: string; player_one_score: number; player_two_score: number; winner_id: string };
type Rack = { winnerId: string; loserBalls: string };

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [admin, setAdmin] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [photo, setPhoto] = useState("");
  const [one, setOne] = useState("");
  const [two, setTwo] = useState("");
  const [playerOneSearch, setPlayerOneSearch] = useState("");
  const [playerTwoSearch, setPlayerTwoSearch] = useState("");
  const [venue, setVenue] = useState("BASE25");
  const [racks, setRacks] = useState<Rack[]>([
    { winnerId: "", loserBalls: "0" },
    { winnerId: "", loserBalls: "0" },
    { winnerId: "", loserBalls: "0" },
  ]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [matchConfirmation, setMatchConfirmation] = useState<{ playerOne: string; playerTwo: string; scoreOne: number; scoreTwo: number } | null>(null);
  const [playerConfirmation, setPlayerConfirmation] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editPhoto, setEditPhoto] = useState("");
  const [editingMatch, setEditingMatch] = useState<{id:string;one:string;two:string;venue:string;racks:Rack[]}|null>(null);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function refresh() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("admin_list_players");
    if (error) setMessage(error.message);
    setPlayers(data || []);
  }

  async function refreshMatches() {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("matches")
      .select("id,played_at,venue,player_one_id,player_two_id,player_one_score,player_two_score,winner_id")
      .order("played_at", { ascending: false })
      .limit(50);
    if (error) setMessage(`Could not load match history: ${error.message}`);
    setMatches(data || []);
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
      if (data) { refresh(); refreshMatches(); }
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
    const { error } = await supabase.rpc("admin_create_player", { p_full_name: fullName.trim(), p_username: username.trim(), p_photo_url: photo.trim() || null });
    if (error) {
      setMessage(`Player was not registered: ${error.message}`);
    } else {
      const registeredUsername = username.trim().replace(/^@/, "");
      setMessage("");
      setPlayerConfirmation(registeredUsername);
      setFullName(""); setUsername(""); setPhoto("");
      await refresh();
    }
    setBusy(false);
  }


  function startEditPlayer(player: Player) { setEditingPlayer(player.id); setEditFullName(player.full_name); setEditUsername(player.username); setEditPhoto(player.photo_url || ""); }
  async function savePlayerEdit(event: FormEvent) {
    event.preventDefault(); if (!supabase || !editingPlayer) return; setBusy(true);
    const { error } = await supabase.rpc("admin_update_player", { p_player_id: editingPlayer, p_full_name: editFullName.trim(), p_username: editUsername.trim().replace(/^@/, ""), p_photo_url: editPhoto.trim() || null });
    if (error) setMessage(`Player update failed: ${error.message}`); else { setMessage("Player profile updated."); setEditingPlayer(null); await refresh(); }
    setBusy(false);
  }
  async function startEditMatch(match: MatchRecord) {
    if (!supabase) return; const { data, error } = await supabase.from("match_racks").select("winner_id,loser_balls_remaining").eq("match_id",match.id).order("rack_number");
    if (error) { setMessage(`Could not load rack details: ${error.message}`); return; }
    setEditingMatch({id:match.id,one:match.player_one_id,two:match.player_two_id,venue:match.venue,racks:(data||[]).map((r:any)=>({winnerId:r.winner_id,loserBalls:String(r.loser_balls_remaining)}))});
  }
  function updateEditingRack(index:number,field:keyof Rack,value:string) { setEditingMatch(cur=>cur?({...cur,racks:cur.racks.map((r,i)=>i===index?{...r,[field]:value}:r)}):cur); }
  async function saveMatchEdit(event:FormEvent) {
    event.preventDefault(); if(!supabase||!editingMatch)return;
    const payload=editingMatch.racks.map(r=>({winner_id:r.winnerId,loser_balls_remaining:Number(r.loserBalls),black_ball_finish:false}));
    if(payload.some(r=>![editingMatch.one,editingMatch.two].includes(r.winner_id)||!Number.isInteger(r.loser_balls_remaining)||r.loser_balls_remaining<0||r.loser_balls_remaining>7)){setMessage("Check every rack winner and balls remaining (0–7).");return;}
    setBusy(true); const {error}=await supabase.rpc("admin_update_match",{p_match_id:editingMatch.id,p_racks:payload,p_venue:editingMatch.venue.trim()||"BASE25"});
    if(error)setMessage(`Match update failed: ${error.message}`);else{setMessage("Match result corrected. ELO ratings recalculated.");setEditingMatch(null);await refreshMatches();await refresh();}
    setBusy(false);
  }
  async function deleteMatch(match:MatchRecord) {
    if(!supabase||!window.confirm(`Delete this ${playerName(match.player_one_id)} vs ${playerName(match.player_two_id)} match? This cannot be undone. ELO will be recalculated.`))return;
    setBusy(true);const {error}=await supabase.rpc("admin_delete_match",{p_match_id:match.id});
    if(error)setMessage(`Match deletion failed: ${error.message}`);else{setMessage("Match deleted. ELO ratings recalculated.");setEditingMatch(null);await refreshMatches();await refresh();}
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
      black_ball_finish: false,
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
    if (error) {
      setMessage(`Match was not published: ${error.message}`);
    } else {
      setMatchConfirmation({
        playerOne: playerName(one),
        playerTwo: playerName(two),
        scoreOne: rackWins.one,
        scoreTwo: rackWins.two,
      });
      setMessage("");
      setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]);
      setOne(""); setTwo("");
      await refreshMatches();
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
          <label>Password<div style={{ position: "relative" }}><input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 58, width: "100%" }} /><button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} style={{ position: "absolute", right: 10, left: "auto", top: "50%", transform: "translateY(-50%)", width: "auto", minWidth: 0, margin: 0, background: "transparent", border: 0, color: "inherit", padding: 8, cursor: "pointer", lineHeight: 0 }}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{showPassword ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.3 4.5 9 7-.3 1.1-1.2 2.5-2.5 3.7" /><path d="M6.2 6.2C4 7.6 2.5 9.7 2 12c.7 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5" /></> : <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg></button></div></label>
          <button disabled={busy}>{busy ? "Please wait..." : "Sign in"}</button>
        </form>{message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}
      </div>
    </main>
  );

  if (!admin) return <main className="shell"><h1>Access not authorised</h1><p>This account is not on the admin list.</p><button onClick={() => supabase!.auth.signOut()}>Sign out</button></main>;

  const playerName = (id: string) => players.find((player) => player.id === id)?.full_name || "Select player";
  const playerLabel = (player: Player) => `@${player.username} — ${player.full_name} (${player.player_code})`;
  const playerOneOptions = players.filter((player) => player.id !== two && `${player.username} ${player.full_name} ${player.player_code}`.toLowerCase().includes(playerOneSearch.trim().toLowerCase()));
  const playerTwoOptions = players.filter((player) => player.id !== one && `${player.username} ${player.full_name} ${player.player_code}`.toLowerCase().includes(playerTwoSearch.trim().toLowerCase()));
  const winnerOptions = players.filter((player) => player.id === one || player.id === two);

  return (
    <main className="shell admin-shell">
      <header className="topbar"><Link className="brand" href="/">BASE<span>25</span> PRO</Link><button className="secondary" onClick={() => supabase!.auth.signOut()}>Sign out</button></header>
      {playerConfirmation && (
        <div className="confirmation-backdrop" role="presentation">
          <section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="player-confirmation-title">
            <div className="confirmation-icon">✓</div>
            <div className="eyebrow">PLAYER REGISTERED</div>
            <h2 id="player-confirmation-title">Player added successfully.</h2>
            <div className="confirmation-score"><div><b>New player</b><strong>@{playerConfirmation}</strong></div></div>
            <p>The player is now available for match recording and appears on the public leaderboard.</p>
            <button type="button" onClick={() => setPlayerConfirmation(null)}>Done</button>
          </section>
        </div>
      )}
      {matchConfirmation && (
        <div className="confirmation-backdrop" role="presentation">
          <section className="confirmation-modal" role="dialog" aria-modal="true" aria-labelledby="match-confirmation-title">
            <div className="confirmation-icon">✓</div>
            <div className="eyebrow">RESULT RECORDED</div>
            <h2 id="match-confirmation-title">Match published successfully.</h2>
            <div className="confirmation-score">
              <div><b>{matchConfirmation.playerOne}</b><strong>{matchConfirmation.scoreOne}</strong></div>
              <span>—</span>
              <div><b>{matchConfirmation.playerTwo}</b><strong>{matchConfirmation.scoreTwo}</strong></div>
            </div>
            <p>ELO ratings have been updated.</p>
            <button type="button" onClick={() => setMatchConfirmation(null)}>Done</button>
          </section>
        </div>
      )}
      <div className="eyebrow">CONTROL ROOM</div><h1>Admin desk<span>.</span></h1>
      {message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}
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
            <label>Search player one
              <input type="search" placeholder="Search username, name or player code..." value={playerOneSearch} onChange={(e) => setPlayerOneSearch(e.target.value)} />
            </label>
            <label>Player one
              <select required value={one} onChange={(e) => { setOne(e.target.value); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>
                <option value="">Select player</option>{playerOneOptions.map((player) => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}
              </select>
            </label>
            <label>Search player two
              <input type="search" placeholder="Search username, name or player code..." value={playerTwoSearch} onChange={(e) => setPlayerTwoSearch(e.target.value)} />
            </label>
            <label>Player two
              <select required value={two} onChange={(e) => { setTwo(e.target.value); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>
                <option value="">Select player</option>{playerTwoOptions.map((player) => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}
              </select>
            </label>
            <label>Venue / table<input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>

            {[0, 1].map((index) => (
              <div className="admin-card" key={index}>
                <h3>Rack {index + 1}</h3>
                <label>Rack winner
                  <select required value={racks[index].winnerId} onChange={(e) => updateRack(index, "winnerId", e.target.value)}>
                    <option value="">Select rack winner</option>
                    {winnerOptions.map((player) => <option key={player.id} value={player.id}>{playerLabel(player)}</option>)}
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

      <section className="admin-card"><h2>Manage player profiles</h2>
        {players.map(player=><div key={player.id} className="player-row" style={{display:"block"}}>
          {editingPlayer===player.id?<form className="form" onSubmit={savePlayerEdit}>
            <label>Full name<input required value={editFullName} onChange={e=>setEditFullName(e.target.value)}/></label>
            <label>Username<input required value={editUsername} onChange={e=>setEditUsername(e.target.value)}/></label>
            <label>Photo URL<input value={editPhoto} onChange={e=>setEditPhoto(e.target.value)}/></label>
            <div className="two-fields"><button disabled={busy}>Save changes</button><button type="button" className="secondary" onClick={()=>setEditingPlayer(null)}>Cancel</button></div>
          </form>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><b>{player.full_name}</b><div className="eyebrow">@{player.username} · {player.player_code}</div></div><button type="button" className="secondary" onClick={()=>startEditPlayer(player)}>Edit</button></div>}
        </div>)}
      </section>
      <section className="admin-card"><h2>Manage match results</h2><p className="muted">Edit rack winners, balls remaining and venue. Deleting a match also deletes its rack records.</p>
        {editingMatch&&<form className="form" onSubmit={saveMatchEdit}><h3>Edit match · {playerName(editingMatch.one)} vs {playerName(editingMatch.two)}</h3>
          <label>Venue<input value={editingMatch.venue} onChange={e=>setEditingMatch({...editingMatch,venue:e.target.value})}/></label>
          {editingMatch.racks.map((rack,index)=><div className="admin-card" key={index}><h3>Rack {index+1}</h3>
            <label>Winner<select required value={rack.winnerId} onChange={e=>updateEditingRack(index,"winnerId",e.target.value)}><option value="">Select winner</option><option value={editingMatch.one}>{playerName(editingMatch.one)}</option><option value={editingMatch.two}>{playerName(editingMatch.two)}</option></select></label>
            <label>Balls left on table<input type="number" min="0" max="7" required value={rack.loserBalls} onChange={e=>updateEditingRack(index,"loserBalls",e.target.value)}/></label>
          </div>)}
          <div className="two-fields"><button disabled={busy}>Save corrected result</button><button type="button" className="secondary" onClick={()=>setEditingMatch(null)}>Cancel</button></div>
        </form>}
        {matches.length===0?<p className="muted">No matches recorded yet.</p>:matches.map(match=><div className="player-row" key={match.id} style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 180px"}}><b>{playerName(match.player_one_id)} {match.player_one_score}–{match.player_two_score} {playerName(match.player_two_id)}</b><div className="eyebrow">{new Date(match.played_at).toLocaleString()} · {match.venue}</div></div>
          <button type="button" className="secondary" onClick={()=>startEditMatch(match)}>Edit</button><button type="button" className="secondary" disabled={busy} onClick={()=>deleteMatch(match)}>Delete</button>
        </div>)}
      </section>

      <section className="admin-card"><h2>Registered players ({players.length})</h2>{players.map((player) => <div className="player-row" key={player.id}><b>{player.full_name}</b><span>{player.player_code}</span></div>)}</section>
    </main>
  );
}
