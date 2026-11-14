"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { id: string; full_name: string; player_code: string; username: string; photo_url?: string | null };
type PlayerAccountStatus = { player_id: string; assigned_email: string | null; account_status: "Not Assigned" | "Verification Pending" | "Verified" };
type MatchRecord = { id: string; played_at: string; venue: string; player_one_id: string; player_two_id: string; player_one_score: number; player_two_score: number; winner_id: string };
type Rack = { winnerId: string; loserBalls: string };
type StaffMember = { user_id: string; email: string; role: "owner" | "manager" | "attendant"; is_active: boolean; created_at: string };

export default function Admin() {
  const [session, setSession] = useState<any>(null);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [newStaffEmail, setNewStaffEmail] = useState("");
  const [newStaffRole, setNewStaffRole] = useState<"manager" | "attendant">("manager");
  const [staffRoleDrafts, setStaffRoleDrafts] = useState<Record<string, "manager" | "attendant">>({});
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerAccountStatuses, setPlayerAccountStatuses] = useState<PlayerAccountStatus[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
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
  const [playerOnePickerOpen, setPlayerOnePickerOpen] = useState(false);
  const [playerTwoPickerOpen, setPlayerTwoPickerOpen] = useState(false);
  const [venue, setVenue] = useState("BASE25");
  const [matchFormat, setMatchFormat] = useState<"single" | "best_of_3">("single");
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
  const [championWeek, setChampionWeek] = useState("");
  const [championPlayer, setChampionPlayer] = useState("");
  const [championNotice, setChampionNotice] = useState("");
  const [activeSection, setActiveSection] = useState<"overview"|"register"|"match"|"champion"|"staff"|"players"|"matches"|"directory">("overview");

  async function refreshStaff() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("admin_list_staff");
    if (error) { setMessage(`Could not load staff: ${error.message}`); return; }
    const rows = (data || []) as StaffMember[];
    setStaffMembers(rows);
    setStaffRoleDrafts(Object.fromEntries(rows.filter((row) => row.role !== "owner").map((row) => [row.user_id, row.role as "manager" | "attendant"])));
  }

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

  async function refreshPlayerAccountStatuses() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("admin_list_player_account_status");
    if (error) { setMessage(`Could not load account assignments: ${error.message}`); return; }
    const rows = (data || []) as PlayerAccountStatus[];
    setPlayerAccountStatuses(rows);
    setEmailDrafts(Object.fromEntries(rows.map(row => [row.player_id, row.assigned_email || ""])));
  }

  async function assignPlayerEmail(player: Player) {
    if (!supabase || staffRole !== "owner") return;
    const emailValue = (emailDrafts[player.id] || "").trim().toLowerCase();
    if (!emailValue) { setMessage("Enter an email address first."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("admin_assign_player_email", { p_player_id: player.id, p_email: emailValue });
    if (error) setMessage(`Email assignment failed: ${error.message}`);
    else { setMessage(`Email assigned to @${player.username}. The player must verify it before signing in.`); await refreshPlayerAccountStatuses(); }
    setBusy(false);
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
      const { data, error } = await supabase.rpc("get_my_staff_access");
      const access = Array.isArray(data) ? data[0] : null;
      const role = access?.is_active ? access.role : null;
      setStaffRole(role === "owner" || role === "manager" || role === "attendant" ? role : null);
      if (error) setMessage(error.message);
      if (role) { refresh(); refreshMatches(); }
      if (role === "owner") { refreshStaff(); refreshPlayerAccountStatuses(); }
    }
    checkAdmin();
  }, [session]);

  const thirdRackNeeded = matchFormat === "best_of_3" && !!racks[0].winnerId && !!racks[1].winnerId && racks[0].winnerId !== racks[1].winnerId;
  const rackWins = useMemo(() => {
    const completed = matchFormat === "single" ? racks.slice(0, 1) : thirdRackNeeded ? racks.slice(0, 3) : racks.slice(0, 2);
    return {
      one: completed.filter((rack) => rack.winnerId === one).length,
      two: completed.filter((rack) => rack.winnerId === two).length,
    };
  }, [racks, one, two, thirdRackNeeded, matchFormat]);

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

  async function addStaff(event: FormEvent) {
    event.preventDefault();
    if (!supabase || staffRole !== "owner") return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_add_staff_by_email", { p_email: newStaffEmail.trim(), p_role: newStaffRole });
    if (error) setMessage(`Staff member was not added: ${error.message}`);
    else { setMessage("Staff access granted. The member can now sign in."); setNewStaffEmail(""); await refreshStaff(); }
    setBusy(false);
  }

  async function saveStaffMember(member: StaffMember) {
    if (!supabase || staffRole !== "owner" || member.role === "owner") return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_staff", {
      p_user_id: member.user_id,
      p_role: staffRoleDrafts[member.user_id] || member.role,
      p_is_active: member.is_active,
    });
    if (error) setMessage(`Staff update failed: ${error.message}`);
    else { setMessage("Staff permissions updated."); await refreshStaff(); }
    setBusy(false);
  }

  async function toggleStaffAccess(member: StaffMember) {
    if (!supabase || staffRole !== "owner" || member.role === "owner") return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_update_staff", {
      p_user_id: member.user_id,
      p_role: staffRoleDrafts[member.user_id] || member.role,
      p_is_active: !member.is_active,
    });
    if (error) setMessage(`Staff access update failed: ${error.message}`);
    else { setMessage(member.is_active ? "Staff access deactivated." : "Staff access reactivated."); await refreshStaff(); }
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

  async function saveWeeklyChampion(event: FormEvent) {
    event.preventDefault(); if (!supabase || staffRole !== "owner" || !championWeek || !championPlayer) return;
    setBusy(true); const { error } = await supabase.rpc("admin_record_weekly_champion", { p_week_start: championWeek, p_player_id: championPlayer });
    setChampionNotice(error ? `Champion was not saved: ${error.message}` : "Saturday Final Champion successfully updated in the Hall of Fame."); setBusy(false);
  }

  async function addMatch(event: FormEvent) {
    event.preventDefault();
    if (!supabase || !one || !two || one === two) return;
    if (!racks[0].winnerId || (matchFormat === "best_of_3" && !racks[1].winnerId)) {
      setMessage(matchFormat === "single" ? "Select the winner and balls remaining for the rack." : "Select a winner and balls remaining for racks 1 and 2.");
      return;
    }
    if (thirdRackNeeded && !racks[2].winnerId) {
      setMessage("The match is tied 1–1. Complete rack 3.");
      return;
    }
    const rackCount = matchFormat === "single" ? 1 : thirdRackNeeded ? 3 : 2;
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
          <label>Password<div className="password-field"><input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} /><button type="button" className="password-toggle" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{showPassword ? <><path d="M3 3l18 18" /><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" /><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.3 4.5 9 7-.3 1.1-1.2 2.5-2.5 3.7" /><path d="M6.2 6.2C4 7.6 2.5 9.7 2 12c.7 2.5 4 7 10 7 1.1 0 2.1-.2 3-.5" /></> : <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>}</svg></button></div></label>
          <button disabled={busy}>{busy ? "Please wait..." : "Sign in"}</button>
        </form>{message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}
      </div>
    </main>
  );

  if (!staffRole) return <main className="shell"><h1>Access not authorised</h1><p>This account does not have an active BASE25 staff role.</p><button onClick={() => supabase!.auth.signOut()}>Sign out</button></main>;

  const playerName = (id: string) => players.find((player) => player.id === id)?.full_name || "Select player";
  const playerMatchLabel = (id: string) => { const player = players.find((item) => item.id === id); return player ? `@${player.username} · ${player.player_code}` : "Unknown player"; };
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
      <div className="eyebrow">CONTROL ROOM · {staffRole.toUpperCase()}</div><h1>Admin desk<span>.</span></h1>
      <nav className="admin-workspace-nav" aria-label="Admin sections">
        <button type="button" className={activeSection==="overview"?"active":""} onClick={()=>setActiveSection("overview")}><span>⌂</span>Overview</button>
        <button type="button" className={activeSection==="register"?"active":""} onClick={()=>setActiveSection("register")}><span>＋</span>Register player</button>
        <button type="button" className={activeSection==="match"?"active":""} onClick={()=>setActiveSection("match")}><span>▣</span>Record match</button>
        {staffRole==="owner"&&<button type="button" className={activeSection==="champion"?"active":""} onClick={()=>setActiveSection("champion")}><span>♛</span>Saturday Champion</button>}
        {staffRole==="owner"&&<button type="button" className={activeSection==="staff"?"active":""} onClick={()=>setActiveSection("staff")}><span>♙</span>Staff management</button>}
        {staffRole==="owner"&&<button type="button" className={activeSection==="players"?"active":""} onClick={()=>setActiveSection("players")}><span>◎</span>Manage profiles</button>}
        {staffRole==="owner"&&<button type="button" className={activeSection==="matches"?"active":""} onClick={()=>setActiveSection("matches")}><span>◷</span>Manage matches</button>}
        <button type="button" className={activeSection==="directory"?"active":""} onClick={()=>setActiveSection("directory")}><span>☷</span>Player directory</button>
      </nav>
      {activeSection==="overview"&&<section className="admin-card admin-overview">
        <div className="eyebrow">YOUR WORKSPACE</div><h2>What would you like to do?</h2>
        <p className="muted">Choose an action from the navigation. Each workspace is kept separate so the desk stays tidy.</p>
        <div className="admin-overview-actions">
          <button type="button" onClick={()=>setActiveSection("register")}>＋ <span><b>Register a player</b><small>Add a new BASE25 competitor</small></span></button>
          <button type="button" onClick={()=>setActiveSection("match")}>▣ <span><b>Record a match</b><small>Publish a result and update ELO</small></span></button>
          {staffRole==="owner"&&<button type="button" onClick={()=>setActiveSection("champion")}>♛ <span><b>Record Saturday Champion</b><small>Update the Hall of Fame and archive</small></span></button>}
          <button type="button" onClick={()=>setActiveSection("directory")}>☷ <span><b>Player directory</b><small>View all registered players</small></span></button>
        </div>
      </section>}

      {message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}
      <div className="admin-grid">
        <section className="admin-card" style={{display:activeSection==="register"?"block":"none"}}>
          <h2>Register player</h2>
          <form className="form" onSubmit={addPlayer}>
            <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Username<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label>Photo URL (optional)<input value={photo} onChange={(e) => setPhoto(e.target.value)} /></label>
            <button disabled={busy}>Register player</button>
          </form>
        </section>

        <section className="admin-card" style={{display:activeSection==="match"?"block":"none"}}>
          <h2>Record match</h2>
          <p className="eyebrow">OFFICIAL RANKED FORMAT · ONE RACK</p>
          <form className="form" onSubmit={addMatch}>
            <label>Player one
              <div className="player-picker">
                <input type="text" autoComplete="off" placeholder="Search or select player one..." value={playerOneSearch} onFocus={() => setPlayerOnePickerOpen(true)} onChange={(e) => { setPlayerOneSearch(e.target.value); setOne(""); setPlayerOnePickerOpen(true); }} />
                {playerOnePickerOpen && <div className="player-picker-options">
                  {playerOneOptions.map((player) => <button type="button" key={player.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setOne(player.id); setPlayerOneSearch(playerLabel(player)); setPlayerOnePickerOpen(false); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>{playerLabel(player)}</button>)}
                  {playerOneOptions.length === 0 && <div className="player-picker-empty">No matching players</div>}
                </div>}
              </div>
            </label>
            <label>Player two
              <div className="player-picker">
                <input type="text" autoComplete="off" placeholder="Search or select player two..." value={playerTwoSearch} onFocus={() => setPlayerTwoPickerOpen(true)} onChange={(e) => { setPlayerTwoSearch(e.target.value); setTwo(""); setPlayerTwoPickerOpen(true); }} />
                {playerTwoPickerOpen && <div className="player-picker-options">
                  {playerTwoOptions.map((player) => <button type="button" key={player.id} onMouseDown={(e) => e.preventDefault()} onClick={() => { setTwo(player.id); setPlayerTwoSearch(playerLabel(player)); setPlayerTwoPickerOpen(false); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}>{playerLabel(player)}</button>)}
                  {playerTwoOptions.length === 0 && <div className="player-picker-empty">No matching players</div>}
                </div>}
              </div>
            </label>
            <label>Match format<select value={matchFormat} onChange={(e) => { setMatchFormat(e.target.value as "single" | "best_of_3"); setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]); }}><option value="single">Ranked match · One rack</option><option value="best_of_3">Special match · Best of 3</option></select></label>
            <label>Venue / table<input value={venue} onChange={(e) => setVenue(e.target.value)} /></label>

            {(matchFormat === "single" ? [0] : [0, 1]).map((index) => (
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
              <p className="eyebrow">{matchFormat === "single" ? (rackWins.one === 1 ? `Match winner: ${playerName(one)}` : rackWins.two === 1 ? `Match winner: ${playerName(two)}` : "Complete the rack") : rackWins.one === 2 ? `Match winner: ${playerName(one)}` : rackWins.two === 2 ? `Match winner: ${playerName(two)}` : thirdRackNeeded ? "Decider required" : "Complete rack 1 and rack 2"}</p>
            </div>
            <button disabled={busy || !one || !two || one === two || !racks[0].winnerId || (matchFormat === "best_of_3" && !racks[1].winnerId) || (thirdRackNeeded && !racks[2].winnerId) || (matchFormat === "single" ? (rackWins.one !== 1 && rackWins.two !== 1) : (rackWins.one !== 2 && rackWins.two !== 2))}>
              {busy ? "Saving match..." : "Save match"}
            </button>
          </form>
        </section>
      </div>

      {staffRole === "owner" && <>
      <section className="admin-card" style={{display:activeSection==="champion"?"block":"none"}}><h2>Record Saturday Champion</h2><p className="muted">Add the winner of the Saturday final. This does not change weekly rankings or career records.</p><form className="form" onSubmit={saveWeeklyChampion}><label>Competition week starting (Saturday)<input type="date" required value={championWeek} onChange={e=>{setChampionWeek(e.target.value);setChampionNotice("");}}/></label><label>Saturday final champion<select required value={championPlayer} onChange={e=>{setChampionPlayer(e.target.value);setChampionNotice("");}}><option value="">Select champion</option>{players.map(p=><option key={p.id} value={p.id}>@{p.username} · {p.player_code}</option>)}</select></label><button disabled={busy || !championWeek || !championPlayer}>{busy ? "Saving champion..." : "Save Hall of Fame entry"}</button></form>{championNotice&&<div className="champion-save-notice" role="status" aria-live="polite"><strong>{championNotice}</strong><button type="button" className="secondary" onClick={()=>setChampionNotice("")}>Dismiss</button></div>}</section>
            <section className="admin-card" style={{display:activeSection==="staff"?"block":"none"}}><h2>Staff management</h2>
        <p className="muted">Only the Owner can grant, change or deactivate staff access. Staff must already have a Supabase login using the email below.</p>
        <form className="form" onSubmit={addStaff}>
          <label>Staff email<input type="email" required value={newStaffEmail} onChange={(e) => setNewStaffEmail(e.target.value)} placeholder="staff@example.com" /></label>
          <label>Access level<select value={newStaffRole} onChange={(e) => setNewStaffRole(e.target.value as "manager" | "attendant")}><option value="manager">Manager</option><option value="attendant">Attendant</option></select></label>
          <button disabled={busy || !newStaffEmail.trim()}>Grant staff access</button>
        </form>
        <h3>Current staff ({staffMembers.length})</h3>
        {staffMembers.length === 0 ? <p className="muted">No staff accounts found.</p> : staffMembers.map((member) => <div className="player-row" key={member.user_id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 180px"}}><b>{member.email}</b><div className="eyebrow">{member.role.toUpperCase()} · {member.role === "owner" ? "FULL CONTROL" : member.is_active ? "ACTIVE" : "DEACTIVATED"}</div></div>
          {member.role === "owner" ? <span className="muted">Protected owner account</span> : <>
            <label style={{minWidth:130}}>Role<select value={staffRoleDrafts[member.user_id] || member.role} onChange={(e) => setStaffRoleDrafts((current) => ({...current,[member.user_id]:e.target.value as "manager" | "attendant"}))}><option value="manager">Manager</option><option value="attendant">Attendant</option></select></label>
            <button type="button" className="secondary" disabled={busy} onClick={() => saveStaffMember(member)}>Save role</button>
            <button type="button" className="secondary" disabled={busy} onClick={() => toggleStaffAccess(member)}>{member.is_active ? "Deactivate" : "Reactivate"}</button>
          </>}
        </div>)}
      </section>

      <section className="admin-card" style={{display:activeSection==="players"?"block":"none"}}><h2>Manage player profiles</h2><p className="muted">Assign each existing player an email address. The player must verify that email before their account is linked.</p>
        {players.map(player=>{ const account = playerAccountStatuses.find(row => row.player_id === player.id); return <div key={player.id} className="player-row" style={{display:"block"}}>
          {editingPlayer===player.id?<form className="form" onSubmit={savePlayerEdit}>
            <label>Full name<input required value={editFullName} onChange={e=>setEditFullName(e.target.value)}/></label>
            <label>Username<input required value={editUsername} onChange={e=>setEditUsername(e.target.value)}/></label>
            <label>Photo URL<input value={editPhoto} onChange={e=>setEditPhoto(e.target.value)}/></label>
            <div className="two-fields"><button disabled={busy}>Save changes</button><button type="button" className="secondary" onClick={()=>setEditingPlayer(null)}>Cancel</button></div>
          </form>:<div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><b>{player.full_name}</b><div className="eyebrow">@{player.username} · {player.player_code}</div></div><button type="button" className="secondary" onClick={()=>startEditPlayer(player)}>Edit</button></div>}
          <div className="form" style={{marginTop:14}}><label>Player email<input type="email" value={emailDrafts[player.id] || ""} onChange={e=>setEmailDrafts(current=>({...current,[player.id]:e.target.value}))} placeholder="player@example.com" /></label><div className="eyebrow">ACCOUNT STATUS · {account?.account_status || "Not Assigned"}</div><button type="button" className="secondary" disabled={busy || account?.account_status === "Verified"} onClick={()=>assignPlayerEmail(player)}>{account?.account_status === "Verification Pending" ? "Update assigned email" : account?.account_status === "Verified" ? "Email verified" : "Assign email"}</button></div>
        </div>})}
      </section>
      <section className="admin-card" style={{display:activeSection==="matches"?"block":"none"}}><h2>Manage match results</h2><p className="muted">Edit rack winners, balls remaining and venue. Deleting a match also deletes its rack records.</p>
        {editingMatch&&<form className="form" onSubmit={saveMatchEdit}><h3>Edit match · {playerMatchLabel(editingMatch.one)} vs {playerMatchLabel(editingMatch.two)}</h3>
          <label>Venue<input value={editingMatch.venue} onChange={e=>setEditingMatch({...editingMatch,venue:e.target.value})}/></label>
          {editingMatch.racks.map((rack,index)=><div className="admin-card" key={index}><h3>Rack {index+1}</h3>
            <label>Winner<select required value={rack.winnerId} onChange={e=>updateEditingRack(index,"winnerId",e.target.value)}><option value="">Select winner</option><option value={editingMatch.one}>{playerMatchLabel(editingMatch.one)}</option><option value={editingMatch.two}>{playerMatchLabel(editingMatch.two)}</option></select></label>
            <label>Balls left on table<input type="number" min="0" max="7" required value={rack.loserBalls} onChange={e=>updateEditingRack(index,"loserBalls",e.target.value)}/></label>
          </div>)}
          <div className="two-fields"><button disabled={busy}>Save corrected result</button><button type="button" className="secondary" onClick={()=>setEditingMatch(null)}>Cancel</button></div>
        </form>}
        {matches.length===0?<p className="muted">No matches recorded yet.</p>:matches.map(match=><div className="player-row" key={match.id} style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{flex:"1 1 180px"}}><b>{playerMatchLabel(match.player_one_id)} {match.player_one_score}–{match.player_two_score} {playerMatchLabel(match.player_two_id)}</b><div className="eyebrow">{new Date(match.played_at).toLocaleString()} · {match.venue}</div></div>
          <button type="button" className="secondary" onClick={()=>startEditMatch(match)}>Edit</button><button type="button" className="secondary" disabled={busy} onClick={()=>deleteMatch(match)}>Delete</button>
        </div>)}
      </section>
      </>}
      <section className="admin-card" style={{display:activeSection==="directory"?"block":"none"}}><h2>Registered players ({players.length})</h2>{players.map((player) => <div className="player-row" key={player.id}><b>{player.full_name}</b><span>{player.player_code}</span></div>)}</section>
    </main>
  );
}
