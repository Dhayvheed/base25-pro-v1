"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PredictionQuestionsAdmin from "@/components/PredictionQuestionsAdmin";

type Player = { id: string; full_name: string; player_code: string; username: string; photo_url?: string | null; elo_rating?: number | null; designation?: "regular" | "house_ghost" | "boardman" };
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
  const [recentPlayerIds, setRecentPlayerIds] = useState<string[]>([]);
  const [playerAccountStatuses, setPlayerAccountStatuses] = useState<PlayerAccountStatus[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [playerPasswordDrafts, setPlayerPasswordDrafts] = useState<Record<string, string>>({});
  const [showPlayerPasswords, setShowPlayerPasswords] = useState<Record<string, boolean>>({});
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
  const [playerPickerTarget, setPlayerPickerTarget] = useState<"one" | "two" | null>(null);
  const [venue, setVenue] = useState("BASE25");
  const [matchFormat, setMatchFormat] = useState<"single" | "best_of_3">("single");
  const [wagerEnabled, setWagerEnabled] = useState(false);
  const [wagerOneStake, setWagerOneStake] = useState("2000");
  const [wagerTwoStake, setWagerTwoStake] = useState("2000");
  const [wagerCustom, setWagerCustom] = useState(false);
  const [wagerAgreedOne, setWagerAgreedOne] = useState(false);
  const [wagerAgreedTwo, setWagerAgreedTwo] = useState(false);
  const [recordErrors, setRecordErrors] = useState<Record<string, string>>({});
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
  const [activeSection, setActiveSection] = useState<"overview"|"register"|"match"|"champion"|"staff"|"players"|"matches"|"directory"|"predictions">("overview");
  const [profileSearch, setProfileSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<"all" | "no-login" | "active">("all");
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);


  async function refreshStaff() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("admin_list_staff");
    if (error) { setMessage(`Could not load staff: ${error.message}`); return; }
    const rows = (data || []) as StaffMember[];
    setStaffMembers(rows);
    setStaffRoleDrafts(Object.fromEntries(rows.filter((row) => row.role !== "owner").map((row) => [row.user_id, row.role as "manager" | "attendant"])));
  }

  useEffect(() => {
    if (!playerPickerTarget) return;
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updatePickerViewport = () => {
      document.documentElement.style.setProperty("--record-picker-vh", `${viewport.height}px`);
      document.documentElement.style.setProperty("--record-picker-top", `${viewport.offsetTop}px`);
    };
    updatePickerViewport();
    viewport.addEventListener("resize", updatePickerViewport);
    viewport.addEventListener("scroll", updatePickerViewport);
    window.addEventListener("orientationchange", updatePickerViewport);
    return () => {
      viewport.removeEventListener("resize", updatePickerViewport);
      viewport.removeEventListener("scroll", updatePickerViewport);
      window.removeEventListener("orientationchange", updatePickerViewport);
      document.documentElement.style.removeProperty("--record-picker-vh");
      document.documentElement.style.removeProperty("--record-picker-top");
    };
  }, [playerPickerTarget]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("base25-record-match-recent-players");
      if (saved) setRecentPlayerIds(JSON.parse(saved).filter((id: unknown) => typeof id === "string").slice(0, 3));
    } catch { /* Ignore unavailable or invalid local recent-player history. */ }
  }, []);

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 4500);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function refresh() {
    if (!supabase) return;
    const { data, error } = await supabase.rpc("admin_list_players");
    if (error) { setMessage(error.message); return; }
    const { data: designations, error: designationError } = await supabase.from("players").select("id,designation");
    if (designationError) { setMessage(`Could not load player roles: ${designationError.message}`); return; }
    const roleById = new Map((designations || []).map((row: any) => [row.id, row.designation]));
    setPlayers((data || []).map((player: Player) => ({ ...player, designation: (roleById.get(player.id) as Player["designation"]) || "regular" })));
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
    const passwordValue = playerPasswordDrafts[player.id] || "";
    if (!emailValue) { setMessage("Enter an email address first."); return; }
    if (passwordValue.length < 8) { setMessage("Choose a password with at least 8 characters."); return; }
    setBusy(true);
    const { data: loginResult, error } = await supabase.functions.invoke("owner-assign-player-login", { body: { player_id: player.id, email: emailValue, password: passwordValue } });
    if (error || loginResult?.error) setMessage(`Player login setup failed: ${loginResult?.error || error?.message || "Unknown error"}`);
    else {
      setMessage(`Player login created for @${player.username}. Give them the email and password you entered.`);
      setPlayerPasswordDrafts(current => ({ ...current, [player.id]: "" }));
      await refreshPlayerAccountStatuses();
    }
    setBusy(false);
  }

  async function resetPlayerPassword(player: Player) {
    if (!supabase || staffRole !== "owner") return;
    const passwordValue = playerPasswordDrafts[player.id] || "";
    if (passwordValue.length < 8) { setMessage("Choose a password with at least 8 characters."); return; }
    setBusy(true);
    const { data: resetResult, error } = await supabase.functions.invoke("owner-reset-player-password", {
      body: { player_id: player.id, password: passwordValue },
    });
    if (error || resetResult?.error) {
      setMessage(`Password update failed: ${resetResult?.error || error?.message || "Unknown error"}`);
    } else {
      setMessage(`Password updated for @${player.username}. Share the new password with the player.`);
      setPlayerPasswordDrafts(current => ({ ...current, [player.id]: "" }));
      setShowPlayerPasswords(current => ({ ...current, [player.id]: false }));
    }
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
    if (!supabase || staffRole !== "owner") { setMessage("Owner access required to register players."); return; }
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
  async function updatePlayerDesignation(player: Player, designation: "regular" | "house_ghost" | "boardman") {
    if (!supabase || staffRole !== "owner" || busy || designation === player.designation) return;
    setBusy(true);
    const { error } = await supabase.from("players").update({ designation }).eq("id", player.id);
    if (error) setMessage(`Player role update failed: ${error.message}`);
    else { setMessage(`@${player.username} is now ${designation === "house_ghost" ? "a House Ghost" : designation === "boardman" ? "a Boardman" : "a Regular player"}.`); await refresh(); }
    setBusy(false);
  }
  async function savePlayerEdit(event: FormEvent) {
    event.preventDefault(); if (!supabase || !editingPlayer) return; setBusy(true);
    const { error } = await supabase.rpc("admin_update_player", { p_player_id: editingPlayer, p_full_name: editFullName.trim(), p_username: players.find(item => item.id === editingPlayer)?.username || "", p_photo_url: editPhoto.trim() || null });
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
    event.preventDefault();
    if (!supabase || staffRole !== "owner" || !championWeek || !championPlayer) return;
    setBusy(true);
    const { error } = await supabase.rpc("admin_record_weekly_champion", { p_week_start: championWeek, p_player_id: championPlayer });
    if (error) setChampionNotice("Champion was not saved: " + error.message);
    else {
      const { data: saved } = await supabase.from("weekly_champions").select("prize_amount,payout_confirmed_at").eq("week_start", championWeek).maybeSingle();
      setChampionNotice("Champion published. ₦" + Number(saved?.prize_amount || 0).toLocaleString("en-NG") + " King's Pot recorded as prize and payout automatically marked paid.");
    }
    setBusy(false);
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
    if (wagerEnabled && (!wagerAgreedOne || !wagerAgreedTwo)) { setMessage("Both players must agree to the wager before saving."); return; }
    if (wagerEnabled) {
      const stakeOne = Number(wagerOneStake), stakeTwo = Number(wagerTwoStake);
      if (!Number.isInteger(stakeOne) || !Number.isInteger(stakeTwo) || stakeOne < 2000 || stakeTwo < 2000 || stakeOne > 1000000 || stakeTwo > 1000000) {
        setMessage("The minimum wager is ₦2,000 per player. Maximum is ₦1,000,000.");
        return;
      }
    }
    setBusy(true);
    const { data, error } = await supabase.rpc("record_match_with_racks_and_wager", {
      p_player_one_id: one,
      p_player_two_id: two,
      p_racks: payload,
      p_venue: venue.trim() || "BASE25",
      p_player_one_stake: wagerEnabled ? Number(wagerOneStake) : null,
      p_player_two_stake: wagerEnabled ? Number(wagerTwoStake) : null,
    });
    if (error) {
      setMessage(`Match was not published: ${error.message}`);
    } else {
      const winnerId = rackWins.one > rackWins.two ? one : two;
      const playerOne = players.find(player => player.id === one);
      const playerTwo = players.find(player => player.id === two);
      setMatchConfirmation({ playerOne: playerOne?.username || "Player one", playerTwo: playerTwo?.username || "Player two", scoreOne: rackWins.one, scoreTwo: rackWins.two });
      setMessage("");
      setRacks([{ winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }, { winnerId: "", loserBalls: "0" }]);
      setWagerEnabled(false); setWagerOneStake("2000"); setWagerTwoStake("2000"); setWagerCustom(false); setWagerAgreedOne(false); setWagerAgreedTwo(false); setRecordErrors({});
      setOne(""); setTwo("");
      setPlayerOneSearch(""); setPlayerTwoSearch("");
      setPlayerOnePickerOpen(false); setPlayerTwoPickerOpen(false); setPlayerPickerTarget(null);
      setActiveSection("match");
      await Promise.all([refreshMatches(), refresh()]);
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

  const playerName = (id: string) => { const player = players.find((item) => item.id === id); return player ? `@${player.username}` : "Select player"; };
  const recentPlayers = recentPlayerIds.map((id) => players.find((player) => player.id === id)).filter((player): player is Player => Boolean(player));
  function selectMatchPlayer(id: string, target: "one" | "two") {
    if (target === "one") { setOne(id); setPlayerOneSearch(""); setPlayerPickerTarget("two"); }
    else { setTwo(id); setPlayerTwoSearch(""); setPlayerPickerTarget(null); }
    const next = [id, ...recentPlayerIds.filter((recentId) => recentId !== id)].slice(0, 3);
    setRecentPlayerIds(next);
    try { window.localStorage.setItem("base25-record-match-recent-players", JSON.stringify(next)); } catch { /* Recent history remains available for this session. */ }
  }
  const playerMatchLabel = (id: string) => { const player = players.find((item) => item.id === id); return player ? `@${player.username} · ${player.player_code}` : "Unknown player"; };
  const playerLabel = (player: Player) => `@${player.username} — ${player.full_name} (${player.player_code})`;
  const playerOneOptions = players.filter((player) => player.id !== two && `${player.username} ${player.full_name} ${player.player_code}`.toLowerCase().includes(playerOneSearch.trim().toLowerCase()));
  const playerTwoOptions = players.filter((player) => player.id !== one && `${player.username} ${player.full_name} ${player.player_code}`.toLowerCase().includes(playerTwoSearch.trim().toLowerCase()));
  const winnerOptions = players.filter((player) => player.id === one || player.id === two);

  const activeProfileCount = playerAccountStatuses.filter(row => row.account_status === "Verified").length;
  const noLoginProfileCount = Math.max(0, players.length - activeProfileCount);
  const visibleProfilePlayers = players.filter(player => {
    const account = playerAccountStatuses.find(row => row.player_id === player.id);
    const active = account?.account_status === "Verified";
    const matchesFilter = profileFilter === "all" || (profileFilter === "active" ? active : !active);
    const query = profileSearch.trim().toLowerCase();
    const matchesSearch = !query || `${player.full_name} @${player.username} ${player.player_code}`.toLowerCase().includes(query);
    return matchesFilter && matchesSearch;
  });

  const today = new Date();
  const daysToSaturday = (6 - today.getDay() + 7) % 7 || 7;
  const saturdayCountdown = daysToSaturday === 1 ? "1 day" : `${daysToSaturday} days`;

  return (
    <main className="shell admin-shell">
      <header className="topbar admin-v2-topbar"><Link className="brand" href="/"><span className="admin-v2-ball">8</span><span className="admin-v2-wordmark">BASE25 <b>PRO</b></span></Link><span className="admin-v2-owner">{staffRole==="owner"?"Owner":staffRole}</span><button className="admin-v2-signout" aria-label="Sign out" onClick={() => supabase!.auth.signOut()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></svg></button></header>
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
            <div className="record-confirm-actions"><button type="button" onClick={() => { setMatchConfirmation(null); setActiveSection("matches"); }}>View match history</button><div className="record-confirm-actions"><button type="button" onClick={() => { setMatchConfirmation(null); setActiveSection("matches"); }}>View match history</button><button type="button" onClick={() => setMatchConfirmation(null)}>Done</button></div></div>
          </section>
        </div>
      )}
      {activeSection!=="overview"&&<button type="button" className="admin-v2-back" onClick={()=>setActiveSection("overview")}>← Admin desk</button>}
      {activeSection==="overview"&&<section className="admin-v2-overview">
        <div className="admin-v2-heading"><div className="eyebrow">CONTROL ROOM</div><h1>Admin desk<span>.</span></h1><p>Signed in as {session?.user?.email?.split("@")[0] || "staff"}</p></div>
        <button type="button" className="admin-v2-primary" onClick={()=>setActiveSection("match")}><span>＋</span>Record a match</button>
        <div className="admin-v2-quick-actions">
          {staffRole==="owner"&&<button type="button" onClick={()=>setActiveSection("register")}><span className="admin-v2-action-icon">♙</span><b>Register player</b></button>}
          {staffRole==="owner"&&<button type="button" className="admin-v2-champion-action" onClick={()=>setActiveSection("champion")}><span className="admin-v2-action-icon">♛</span><b>Crown Saturday champion</b></button>}
          {staffRole!=="owner"&&<button type="button" onClick={()=>setActiveSection("directory")}><span className="admin-v2-action-icon">♙</span><b>Player directory</b></button>}
        </div>
        <div className="admin-v2-stats"><div><strong>{players.length}</strong><span>Players</span></div><div><strong>{matches.length}</strong><span>Matches</span></div><div><strong>{saturdayCountdown}</strong><span>To Saturday final</span></div></div>
        <div className="admin-v2-section-head"><h2>Recent matches</h2><button type="button" onClick={()=>setActiveSection("matches")}>Manage all →</button></div>
        <div className="admin-v2-recent">
          {matches.length===0?<p className="admin-v2-empty">No matches recorded yet.</p>:matches.slice(0,3).map(match=><div className="admin-v2-match" key={match.id}>
            <span className="admin-v2-win">W</span><div className="admin-v2-match-copy"><strong>{playerName(match.winner_id)} beat {playerName(match.winner_id===match.player_one_id?match.player_two_id:match.player_one_id)}</strong><small>{new Date(match.played_at).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} · {match.player_one_score} – {match.player_two_score}</small></div>
            <button type="button" aria-label="Edit match result" onClick={()=>{startEditMatch(match);setActiveSection("matches");}}>✎</button>
          </div>)}
        </div>
        <p className="admin-v2-hint">Entered a wrong result? Tap the pencil to fix it.</p>
        <h2 className="admin-v2-manage-title">Manage</h2>
        <div className="admin-v2-manage">
          {staffRole==="owner"&&<button type="button" onClick={()=>setActiveSection("predictions")}><span className="admin-v2-manage-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h5M8 17h3"/><path d="m17 15 2 2 3-4"/></svg></span><div><b>Prediction questions</b><small>Manage weekly questions, points and schedules</small></div><i>›</i></button>}
          <button type="button" onClick={()=>setActiveSection("matches")}><span className="admin-v2-manage-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"/><path d="m3 6 1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/></svg></span><div><b>Manage matches</b><small>Edit or remove results</small></div><i>›</i></button>
          {staffRole==="owner"&&<button type="button" onClick={()=>setActiveSection("players")}><span className="admin-v2-manage-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2.2"/><path d="M5.8 16c.7-1.8 2-2.7 3.2-2.7s2.5.9 3.2 2.7M15 9h3M15 13h3"/></svg></span><div><b>Manage profiles</b><small>Photos, names and bios</small></div><i>›</i></button>}
          <button type="button" onClick={()=>setActiveSection("directory")}><span className="admin-v2-manage-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.5-3.1 2.5-4.8 5.5-4.8s5 1.7 5.5 4.8M16 5.5a3 3 0 0 1 0 5.8M17 14.5c2.1.6 3.3 2.1 3.6 4.5"/></svg></span><div><b>Player directory</b><small>All {players.length} registered players</small></div><i>›</i></button>
          {staffRole==="owner"&&<button type="button" onClick={()=>setActiveSection("staff")}><span className="admin-v2-manage-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.6-3.2 7.7-8 9.5-4.8-1.8-8-4.9-8-9.5V6l8-3Z"/><rect x="9" y="10.5" width="6" height="5" rx="1"/><path d="M10.5 10.5V9a1.5 1.5 0 0 1 3 0v1.5"/></svg></span><div><b>Staff management</b><small>Owner only</small></div><i>›</i></button>}
        </div>
      </section>}

      {activeSection==="predictions"&&staffRole==="owner"&&<PredictionQuestionsAdmin onBack={()=>setActiveSection("overview")} setNotice={setMessage}/>}

      {message && <div className="toast" role="status" aria-live="polite"><span>{message}</span><button type="button" className="toast-close" aria-label="Dismiss notification" onClick={() => setMessage("")}>×</button></div>}
      <div className="admin-grid">
        <section className="admin-card" style={{display:staffRole==="owner"&&activeSection==="register"?"block":"none"}}>
          <h2>Register player</h2>
          <form className="form" onSubmit={addPlayer}>
            <label>Full name<input required value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
            <label>Username<input required value={username} onChange={(e) => setUsername(e.target.value)} /></label>
            <label>Photo URL (optional)<input value={photo} onChange={(e) => setPhoto(e.target.value)} /></label>
            <button disabled={busy}>Register player</button>
          </form>
        </section>

        <section className="admin-card record-match-shell" style={{display:activeSection==="match"?"block":"none"}}>
          <form className="record-match-form record-v3" onSubmit={addMatch}>
            <div className="record-match-header"><button type="button" className="record-back" onClick={()=>setActiveSection("overview")} aria-label="Back"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button><h2>Record match</h2><span className="record-admin-tag">ADMIN</span></div>
            <div className="record-format-switch" role="group" aria-label="Match format">
              <button type="button" className={matchFormat==="single"?"selected":""} onClick={()=>{setMatchFormat("single");setRacks([{winnerId:"",loserBalls:"3"},{winnerId:"",loserBalls:"3"},{winnerId:"",loserBalls:"3"}]);setRecordErrors({});}}>One rack</button>
              <button type="button" className={matchFormat==="best_of_3"?"selected":""} onClick={()=>{setMatchFormat("best_of_3");setRacks([{winnerId:"",loserBalls:"3"},{winnerId:"",loserBalls:"3"},{winnerId:"",loserBalls:"3"}]);setRecordErrors({});}}>Best of 3</button>
            </div>
            <p className="record-format-note">{matchFormat==="best_of_3"?"First to win 2 racks takes the match":"Single rack · one winner"}</p>

            <section className="record-v3-section">
              <div className="record-v3-section-head"><span>STEP 1</span><h3>Who played?</h3></div>
              <div className="record-player-pair">
                {(["one","two"] as const).map((slot,index)=>{
                  const id=slot==="one"?one:two, player=players.find(p=>p.id===id);
                  return <div className="record-player-slot-wrap" key={slot}>
                    <button type="button" className={"record-player-slot record-v3-player"+(player?" filled":"")} onClick={()=>{setPlayerPickerTarget(slot);setPlayerOnePickerOpen(slot==="one");setPlayerTwoPickerOpen(slot==="two");}}>
                      {player?<><span className="record-player-avatar" style={player.photo_url?{backgroundImage:`url(${player.photo_url})`}:{}}>{player.photo_url?"":player.username.slice(0,1).toUpperCase()}</span><b>@{player.username}</b><small>{Number(player.elo_rating||1000).toLocaleString()} rating</small><em>Change</em></>:<><span className="record-add-circle">＋</span><b>Choose player</b><em>Tap to select</em></>}
                    </button>
                    {index===0&&<span className="record-versus">vs</span>}
                  </div>;
                })}
              </div>
              <div className="record-inline-picker">
                <label className="record-v3-search"><svg viewBox="0 0 24 24"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input aria-label="Search a player" placeholder="Search a player…" value={playerPickerTarget==="two"?playerTwoSearch:playerOneSearch} onFocus={()=>setPlayerPickerTarget(one&&!two?"two":"one")} onChange={e=>{if(one&&!two)setPlayerTwoSearch(e.target.value);else setPlayerOneSearch(e.target.value);}} /></label>
                <div className="record-recent-row"><span>Recent</span>{recentPlayers.map(player=><button type="button" key={player.id} disabled={player.id===one||player.id===two} onClick={()=>selectMatchPlayer(player.id,!one?"one":"two")}>{player.username}</button>)}</div>
                {playerPickerTarget&&<div className="record-inline-results">{(playerPickerTarget==="two"?playerTwoOptions:playerOneOptions).slice(0,5).map(player=><button type="button" key={player.id} onClick={()=>selectMatchPlayer(player.id,playerPickerTarget)}><span>{player.username.slice(0,1).toUpperCase()}</span><b>@{player.username}</b><small>{Number(player.elo_rating||1000).toLocaleString()} rating</small></button>)}</div>}
              </div>
              {recordErrors.players&&<p className="record-field-error">{recordErrors.players}</p>}
            </section>

            {matchFormat==="single"?<section className="record-v3-section">
              <div className="record-v3-section-head"><span>STEP 2</span><h3>Who won the rack?</h3></div>
              <div className="record-winner-pair record-v3-winners">{winnerOptions.map(player=><button type="button" key={player.id} disabled={!one||!two} className={racks[0].winnerId===player.id?"selected":""} onClick={()=>{updateRack(0,"winnerId",player.id);setRecordErrors(current=>({...current,winner:""}));}}>{racks[0].winnerId===player.id?"✓ ":""}@{player.username}</button>)}</div>
              {recordErrors.winner&&<p className="record-field-error">{recordErrors.winner}</p>}
              <div className="record-balls-panel"><div><span>STEP 3</span><b>Balls left on the table</b><small>For losing player · {playerName(racks[0].winnerId?(racks[0].winnerId===one?two:one):"")}</small></div><div className="record-stepper"><button type="button" aria-label="Remove one ball" disabled={!one||!two||Number(racks[0].loserBalls)<=0} onClick={()=>updateRack(0,"loserBalls",String(Math.max(0,Number(racks[0].loserBalls)-1)))}>−</button><strong>{racks[0].loserBalls}</strong><button type="button" aria-label="Add one ball" disabled={!one||!two||Number(racks[0].loserBalls)>=7} onClick={()=>updateRack(0,"loserBalls",String(Math.min(7,Number(racks[0].loserBalls)+1)))}>＋</button></div></div>
            </section>:<section className="record-v3-section">
              <div className="record-v3-section-head"><span>STEP 2</span><h3>Rack results</h3></div>
              <div className="record-scoreboard record-v3-score"><div><small>{one?playerName(one):"Player one"}</small><strong>{rackWins.one}</strong></div><span>—</span><div><small>{two?playerName(two):"Player two"}</small><strong>{rackWins.two}</strong></div></div>
              {Array.from({length:thirdRackNeeded?3:2},(_,index)=>index).map(index=>{
                const rack=racks[index], loser=rack.winnerId?(rack.winnerId===one?two:one):"";
                return <div className="record-rack-card record-v3-rack" key={index}>
                  <div className="record-rack-title"><b>Rack {index+1}</b>{index===2&&<small>DECIDING RACK</small>}</div>
                  <div className="record-winner-pair record-v3-winners">{winnerOptions.map(player=><button type="button" key={player.id} disabled={!one||!two} className={rack.winnerId===player.id?"selected":""} onClick={()=>updateRack(index,"winnerId",player.id)}>{rack.winnerId===player.id?"✓ ":""}@{player.username}</button>)}</div>
                  <div className="record-rack-balls"><span>Balls left · {loser?playerName(loser):"losing player"}</span><div className="record-stepper"><button type="button" aria-label="Remove one ball" disabled={!one||!two||Number(rack.loserBalls)<=0} onClick={()=>updateRack(index,"loserBalls",String(Math.max(0,Number(rack.loserBalls)-1)))}>−</button><strong>{rack.loserBalls}</strong><button type="button" aria-label="Add one ball" disabled={!one||!two||Number(rack.loserBalls)>=7} onClick={()=>updateRack(index,"loserBalls",String(Math.min(7,Number(rack.loserBalls)+1)))}>＋</button></div></div>
                </div>;
              })}
              <p className="record-rack-hint">Rack 3 only appears when the score is tied 1–1. If one player wins the first two racks, the match ends 2–0.</p>
            </section>}

            <section className="record-v3-section record-wager-card">
              <button type="button" className="record-wager-toggle" aria-expanded={wagerEnabled} onClick={()=>{setWagerEnabled(v=>!v);setWagerAgreedOne(false);setWagerAgreedTwo(false);}}>
                <span><b>Wager (optional)</b><small>Both players must agree to the stake</small></span><i className={wagerEnabled?"on":""}><em/></i>
              </button>
              {wagerEnabled&&<div className="record-wager-content record-v3-wager">
                {([{slot:"one",name:one?playerName(one):"Player one",value:wagerOneStake,set:setWagerOneStake,custom:wagerCustom},{slot:"two",name:two?playerName(two):"Player two",value:wagerTwoStake,set:setWagerTwoStake,custom:wagerCustom}] as const).map((item,index)=><div className="record-stake-card" key={item.slot}>
                  <label>{item.name} stakes<input type="number" inputMode="numeric" min="2000" max="1000000" step="1" placeholder="₦ Enter amount" value={item.value} onChange={e=>{item.set(e.target.value);setWagerAgreedOne(false);setWagerAgreedTwo(false);}} /></label>
                  <div className="record-stake-chips">{[2000,5000].map(amount=><button type="button" key={amount} className={Number(item.value)===amount?"selected":""} onClick={()=>{item.set(String(amount));setWagerAgreedOne(false);setWagerAgreedTwo(false);}}>₦{amount.toLocaleString("en-NG")}</button>)}<button type="button" className={item.custom?"selected":""} onClick={()=>setWagerCustom(true)}>Custom</button></div>
                  <label className="record-agree"><input type="checkbox" checked={index===0?wagerAgreedOne:wagerAgreedTwo} onChange={e=>index===0?setWagerAgreedOne(e.target.checked):setWagerAgreedTwo(e.target.checked)}/><span>I agree to this stake</span><b>AGREED</b></label>
                </div>)}
                <div className="record-wager-pot"><span>Total pot · winner takes all</span><strong>₦{(Math.max(0,Number(wagerOneStake)||0)+Math.max(0,Number(wagerTwoStake)||0)).toLocaleString("en-NG")}</strong></div>
                <p className="record-wager-minimum">Minimum ₦2,000 per player · Maximum ₦1,000,000</p>
              </div>}
            </section>

            <section className="record-v3-result">
              <div className="record-v3-result-head"><span>LIVE RESULT</span><b>{one&&two&&((matchFormat==="single"&&racks[0].winnerId)||(matchFormat==="best_of_3"&&(rackWins.one===2||rackWins.two===2)))? "CONFIRMED SCORE":"AWAITING RESULT"}</b></div>
              <h3>{one&&two&&rackWins.one!==rackWins.two? `${playerName(rackWins.one>rackWins.two?one:two)} beats ${playerName(rackWins.one>rackWins.two?two:one)}`:"Select players and rack winners"}</h3>
              <div className="record-v3-result-score">{rackWins.one} <span>–</span> {rackWins.two}</div>
              <div className="record-v3-result-players"><div><b>{one?playerName(one):"Player one"}</b><strong className={rackWins.one>rackWins.two?"positive":rackWins.one<rackWins.two?"negative":""}>{rackWins.one>rackWins.two?"Winner":rackWins.one<rackWins.two?"Loser":"Pending"}</strong><small>Rating estimate: calculated on save</small>{wagerEnabled&&<small className={rackWins.one>rackWins.two?"positive":rackWins.one<rackWins.two?"negative":""}>Wager {rackWins.one>rackWins.two?"+":rackWins.one<rackWins.two?"−":""}₦{Number(wagerOneStake||0).toLocaleString("en-NG")}</small>}</div><div><b>{two?playerName(two):"Player two"}</b><strong className={rackWins.two>rackWins.one?"positive":rackWins.two<rackWins.one?"negative":""}>{rackWins.two>rackWins.one?"Winner":rackWins.two<rackWins.one?"Loser":"Pending"}</strong><small>Rating estimate: calculated on save</small>{wagerEnabled&&<small className={rackWins.two>rackWins.one?"positive":rackWins.two<rackWins.one?"negative":""}>Wager {rackWins.two>rackWins.one?"+":rackWins.two<rackWins.one?"−":""}₦{Number(wagerTwoStake||0).toLocaleString("en-NG")}</small>}</div></div>
              <p>Estimated rating change. Final values are calculated when you save.</p><p>This match adds ₦100 to the King's Pot.</p>
            </section>
            <div className="record-footer-venue"><span>Ranked · BASE25 table</span><button type="button" onClick={()=>setVenue(venue==="BASE25"?"BASE25 Table 2":"BASE25")}>Change</button></div>
            {message&&<p className="record-field-error" role="alert">{message}</p>}
            <button className="record-save-button record-v3-save" disabled={busy||!one||!two||one===two||!racks[0].winnerId||(matchFormat==="best_of_3"&&(!racks[1].winnerId||(thirdRackNeeded&&!racks[2].winnerId)))||(matchFormat==="single"?(rackWins.one!==1&&rackWins.two!==1):(rackWins.one!==2&&rackWins.two!==2))||(wagerEnabled&&(!wagerAgreedOne||!wagerAgreedTwo||!Number.isInteger(Number(wagerOneStake))||!Number.isInteger(Number(wagerTwoStake))||Number(wagerOneStake)<2000||Number(wagerTwoStake)<2000||Number(wagerOneStake)>1000000||Number(wagerTwoStake)>1000000))}>{busy?"Saving match...":wagerEnabled?"Save match & wager":"Save match"}</button>
            <button type="button" className="record-cancel-button record-v3-cancel" onClick={()=>setActiveSection("overview")}>Cancel</button>
          </form>
        </section>
      </div>

      {playerPickerTarget && <div className="record-picker-backdrop" onClick={()=>{setPlayerPickerTarget(null);setPlayerOnePickerOpen(false);setPlayerTwoPickerOpen(false);}}>
        <section className="record-picker-sheet" role="dialog" aria-modal="true" aria-label={`Choose player ${playerPickerTarget}`} onClick={event=>event.stopPropagation()}>
          <div className="record-picker-handle" />
          <div className="record-picker-heading"><h3>Choose player {playerPickerTarget}</h3><button type="button" onClick={()=>{setPlayerPickerTarget(null);setPlayerOnePickerOpen(false);setPlayerTwoPickerOpen(false);}}>Close</button></div>
          <input className="record-picker-search" autoFocus placeholder="Search username or player ID" value={playerPickerTarget==="one"?playerOneSearch:playerTwoSearch} onChange={event=>playerPickerTarget==="one"?setPlayerOneSearch(event.target.value):setPlayerTwoSearch(event.target.value)} />
          <div className="record-picker-recent"><span>Recent</span>{recentPlayers.map(player=><button type="button" key={player.id} disabled={player.id===(playerPickerTarget==="one"?two:one)} onClick={()=>selectMatchPlayer(player.id,playerPickerTarget)}>@{player.username}</button>)}</div>
          <div className="record-picker-list">{(playerPickerTarget==="one"?playerOneOptions:playerTwoOptions).slice(0,5).map(player=><button type="button" key={player.id} onClick={()=>selectMatchPlayer(player.id,playerPickerTarget)}><span className="record-picker-avatar">{player.username.slice(0,1).toUpperCase()}</span><span><b>@{player.username}</b><small>{player.player_code} · {Number(player.elo_rating||1000).toLocaleString()}</small></span>{player.id===(playerPickerTarget==="one"?one:two)&&<strong>✓</strong>}</button>)}{(playerPickerTarget==="one"?playerOneOptions:playerTwoOptions).length===0&&<p className="record-picker-empty">No matching players</p>}</div>
        </section>
      </div>}
      {staffRole === "owner" && <>
      <section className="admin-card" style={{display:activeSection==="champion"?"block":"none"}}><h2>Record Saturday Champion</h2><p className="muted">Publishing the official winner automatically awards the full accumulated King’s Pot and records the payout. Only publish after the cash has been paid at BASE25.</p><form className="form" onSubmit={saveWeeklyChampion}><label>Competition week starting (Saturday)<input type="date" required value={championWeek} onChange={e=>{setChampionWeek(e.target.value);setChampionNotice("");}}/></label><label>Saturday final champion<select required value={championPlayer} onChange={e=>{setChampionPlayer(e.target.value);setChampionNotice("");}}><option value="">Select champion</option>{players.map(p=><option key={p.id} value={p.id}>@{p.username} · {p.player_code}</option>)}</select></label><button disabled={busy || !championWeek || !championPlayer}>{busy ? "Publishing champion..." : "Publish Champion & Record Payout"}</button></form>{championNotice&&<div className="champion-save-notice" role="status" aria-live="polite"><strong>{championNotice}</strong><button type="button" className="secondary" onClick={()=>setChampionNotice("")}>Dismiss</button></div>}</section>
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

      <section className="admin-card manage-profiles-panel" style={{display:activeSection==="players"?"block":"none"}}>
        <div className="manage-profiles-heading">
          <div className="eyebrow">ADMIN · PLAYERS</div>
          <h1>Manage player profiles</h1>
          <p>Create logins for players and hand the details to them in person.</p>
        </div>
        <div className="manage-profile-stats">
          <div><strong>{players.length}</strong><span>Players</span></div>
          <div><strong>{activeProfileCount}</strong><span>Have login</span></div>
          <div><strong>{noLoginProfileCount}</strong><span>No login</span></div>
        </div>
        <label className="manage-profile-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input type="search" value={profileSearch} onChange={e=>setProfileSearch(e.target.value)} placeholder="Search name, @username or B25-ID" aria-label="Search players"/></label>
        <div className="manage-profile-filters" role="group" aria-label="Filter players">
          <button type="button" className={profileFilter==="all"?"selected":""} onClick={()=>setProfileFilter("all")}>All {players.length}</button>
          <button type="button" className={profileFilter==="no-login"?"selected":""} onClick={()=>setProfileFilter("no-login")}>No login {noLoginProfileCount}</button>
          <button type="button" className={profileFilter==="active"?"selected":""} onClick={()=>setProfileFilter("active")}>Active {activeProfileCount}</button>
        </div>
        <div className="manage-profile-list">
          {visibleProfilePlayers.map(player=>{
            const account=playerAccountStatuses.find(row=>row.player_id===player.id);
            const active=account?.account_status==="Verified";
            const expanded=expandedProfileId===player.id;
            return <article key={player.id} className={"manage-profile-card"+(expanded?" expanded":"")}>
              <button type="button" className="manage-profile-row" aria-expanded={expanded} onClick={()=>setExpandedProfileId(expanded?null:player.id)}>
                <span className="manage-profile-avatar">{player.full_name?.trim()?.[0]?.toUpperCase()||player.username?.[0]?.toUpperCase()||"?"}</span>
                <span className="manage-profile-identity"><strong>{player.full_name}</strong><small>@{player.username} · {player.player_code}</small></span>
                <span className={"manage-profile-status"+(active?" active":"")}>{active?"ACTIVE":"NO LOGIN"}</span>
                <svg className="manage-profile-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>
              </button>
              {expanded&&<div className="manage-profile-details">
                {editingPlayer===player.id?<form className="form manage-profile-edit" onSubmit={savePlayerEdit}>
                  <label>Full name<input required value={editFullName} onChange={e=>setEditFullName(e.target.value)}/></label>
                  <div className="eyebrow">USERNAME · @{player.username} (LOCKED)</div>
                  <label>Photo URL<input value={editPhoto} onChange={e=>setEditPhoto(e.target.value)}/></label>
                  <div className="manage-profile-actions"><button disabled={busy}>Save changes</button><button type="button" className="secondary" onClick={()=>setEditingPlayer(null)}>Cancel</button></div>
                </form>:<>
                  <label>Player role<select aria-label={`Player role for ${player.username}`} value={player.designation||"regular"} disabled={busy} onChange={e=>updatePlayerDesignation(player,e.target.value as "regular"|"house_ghost"|"boardman")}><option value="regular">Regular</option><option value="house_ghost">House Ghost</option><option value="boardman">Boardman</option></select></label>
                  <label>Player email<input type="email" value={emailDrafts[player.id]||""} onChange={e=>setEmailDrafts(current=>({...current,[player.id]:e.target.value}))} placeholder="player@example.com" readOnly={active}/></label>
                  <label>Temporary password<div className="manage-profile-password"><input type={showPlayerPasswords[player.id]?"text":"password"} autoComplete="new-password" minLength={8} value={playerPasswordDrafts[player.id]||""} onChange={e=>setPlayerPasswordDrafts(current=>({...current,[player.id]:e.target.value}))} placeholder="At least 8 characters"/><button type="button" className="secondary" onClick={()=>setShowPlayerPasswords(current=>({...current,[player.id]:!current[player.id]}))}>{showPlayerPasswords[player.id]?"Hide":"Show"}</button></div></label>
                  <button type="button" className="manage-profile-generate" onClick={()=>{const chars="ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";const values=new Uint32Array(14);window.crypto.getRandomValues(values);setPlayerPasswordDrafts(current=>({...current,[player.id]:Array.from(values,v=>chars[v%chars.length]).join("")}));setShowPlayerPasswords(current=>({...current,[player.id]:true}));}}>Generate password</button>
                  <p className="manage-profile-help">Give these details to the player directly. They can change the password after first login.</p>
                  {active?<button type="button" className="manage-profile-primary" disabled={busy||(playerPasswordDrafts[player.id]||"").length<8} onClick={()=>resetPlayerPassword(player)}>Reset password</button>:<button type="button" className="manage-profile-primary" disabled={busy||(playerPasswordDrafts[player.id]||"").length<8||!(emailDrafts[player.id]||"").trim()} onClick={()=>assignPlayerEmail(player)}>Create player login</button>}
                  <button type="button" className="manage-profile-edit-button" onClick={()=>startEditPlayer(player)}>Edit profile</button>
                </>}
              </div>}
            </article>;
          })}
          {visibleProfilePlayers.length===0&&<div className="manage-profile-empty">No players match this search or filter.</div>}
        </div>
        <p className="manage-profile-count">Showing {visibleProfilePlayers.length} of {players.length} · Scroll to browse</p>
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
