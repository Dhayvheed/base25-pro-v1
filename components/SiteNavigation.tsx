"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function MenuIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7v10H3z" /></>,
    trophy: <><path d="M8 21h8M12 17v4M7 4h10v7a5 5 0 0 1-10 0V4Z" /><path d="M7 6H3v3a4 4 0 0 0 4 4M17 6h4v3a4 4 0 0 1-4 4" /></>,
    chart: <><path d="M5 20V11M12 20V4M19 20v-7" /></>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    crown: <><path d="m2 7 5 4 5-7 5 7 5-4-2 13H4L2 7Z" /></>,
    players: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 8a4 4 0 0 1-3 3.87M20 21v-2a4 4 0 0 0-3-3.87" /></>,
    target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="1" /></>,
    help: <><circle cx="12" cy="12" r="9" /><path d="M9.6 9a2.5 2.5 0 1 1 4.3 1.7c-1.1 1.1-1.9 1.4-1.9 3M12 17h.01" /></>,
    file: <><path d="M6 3h9l4 4v14H6zM15 3v5h5M9 12h7M9 16h7" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a8 8 0 0 1 16 0v1" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
    login: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v16h-7" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">{paths[name] || paths.target}</svg>;
}

const competitionLinks = [
  { href: "/competition", label: "Competition home", icon: "trophy" },
  { href: "/competition?leaderboard=full#weekly-leaderboard", label: "Leaderboard", icon: "chart" },
  { href: "/matches", label: "Match history", icon: "history" },
  { href: "/weekly-archive", label: "Weekly archive", icon: "calendar" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: "crown" },
];

export default function SiteNavigation({ onHomeAccountChange }: { onHomeAccountChange?: (value: { signedIn:boolean; authReady:boolean; profile:any; accountName:string }) => void } = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [competitionOpen, setCompetitionOpen] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [staffRole, setStaffRole] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [playerSummary, setPlayerSummary] = useState<any>(null);
  const [signingOut, setSigningOut] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => { onHomeAccountChange?.({ signedIn, authReady, profile: playerSummary, accountName }); }, [signedIn, authReady, playerSummary, accountName, onHomeAccountChange]);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!supabase) { setAuthReady(true); return; }
    let active = true;
    const loadAccount = async (user: any) => {
      if (!active) return;
      if (!user) {
        setSignedIn(false);
        setStaffRole(null);
        setAccountName("");
        setPlayerSummary(null);
        setAuthReady(true);
        return;
      }
      setSignedIn(true);
      const { data: staffAccessData } = await supabase!.rpc("get_my_staff_access");
      if (!active) return;
      const staffAccess = Array.isArray(staffAccessData) ? staffAccessData[0] : staffAccessData;
      setStaffRole(staffAccess?.is_active ? staffAccess.role : null);
      const metadataName = user.user_metadata?.username || user.user_metadata?.prediction_nickname || user.user_metadata?.full_name || user.email?.split("@")[0] || "Member";
      setAccountName(metadataName);
      setAuthReady(true);
      setPlayerSummary(null);
      if (!supabase) return;
      const { data: profileData } = await supabase.rpc("get_my_base25_player_profile");
      if (!active) return;
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      if (!profile?.id) return;
      const [{ data: allTimeBoard }, { data: weeklyBoard }] = await Promise.all([
        supabase.from("player_public_leaderboard").select("id,photo_url,elo_rating,rank"),
        supabase.rpc("get_period_leaderboard", { p_period: "this_week" })
      ]);
      if (!active) return;
      const allRows = allTimeBoard || [];
      const weekRows = weeklyBoard || [];
      const allRank = allRows.find((row: any) => row.id === profile.id)?.rank ?? null;
      const weeklyRank = weekRows.findIndex((row: any) => row.id === profile.id) + 1;
      const weeklyPlayer = weekRows.find((row: any) => row.id === profile.id);
      setPlayerSummary({ ...profile, photo_url: allRows.find((row: any) => row.id === profile.id)?.photo_url || null, globalRank: allRank, weeklyRank: weeklyRank || null, weeklyElo: weeklyPlayer?.elo_rating ?? null });
    };
    supabase.auth.getSession().then(({ data }) => loadAccount(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadAccount(session?.user ?? null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  const handleSignOut = async () => {
    if (!supabase || signingOut) return;
    setSigningOut(true);
    const { error } = await supabase.auth.signOut();
    setSigningOut(false);
    if (!error) {
      setOpen(false);
      setSignedIn(false);
      setAccountName("");
      router.push("/");
      router.refresh();
    }
  };

  const isCompetitionPage = pathname.startsWith("/competition") || ["/leaderboard", "/matches", "/weekly-archive", "/hall-of-fame", "/snapshots"].some((path) => pathname === path || pathname.startsWith(path + "/"));
  const ownPublicProfile = Boolean(playerSummary?.id && pathname === `/players/${playerSummary.id}`);
  const isOwnProfile = pathname === "/account" || ownPublicProfile;
  const isPlayersPage = (pathname === "/players" || pathname.startsWith("/players/")) && !ownPublicProfile;
  const isStaff = Boolean(staffRole);
  const brand = (drawer = false) => <Link className="site-brand" href="/" aria-label="BASE25 PRO home" tabIndex={!drawer || open ? 0 : -1}>
    <span className="site-brand-mark">8</span>
    <span className="site-brand-copy"><strong>BASE<span>25</span> <em>PRO</em></strong><small>The Official Billiards Competition</small>
      {authReady && signedIn && <span className="site-account-identity">Signed in as <b>@{accountName}</b></span>}
    </span>
  </Link>;

  return <>
    <header className="site-header">
      {brand()}
      <nav className="site-desktop-nav" aria-label="Main navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">Home</Link>
        <div className="site-desktop-group">
          <Link className={isCompetitionPage ? "active" : ""} href="/competition">Competition⌄</Link>
          <div className="site-desktop-dropdown">{competitionLinks.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
        </div>
        <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players">Players</Link>
        <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions">Predictions</Link>
        <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works">How It Works</Link>
      </nav>
      <div className="site-header-actions">
        {authReady && (signedIn
          ? <><Link className="site-admin-link" href="/account">My account</Link><button className="site-admin-link site-signout-button" type="button" onClick={handleSignOut} disabled={signingOut}>{signingOut ? "Signing out…" : "Sign out"}</button></>
          : <Link className="site-admin-link" href="/login">Player login</Link>)}
        <Link className="site-admin-link" href="/admin">Admin</Link>
        <button className="site-menu-button" type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}><span></span><span></span><span></span></button>
      </div>
    </header>
    <div className={"site-drawer-backdrop" + (open ? " is-open" : "")} onClick={() => setOpen(false)} aria-hidden="true"></div>
    <aside
      className={"site-drawer" + (open ? " is-open" : "")}
      aria-hidden={!open}
      aria-label="Site navigation"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        touchStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        if (!touchStart.current) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - touchStart.current.x;
        const deltaY = touch.clientY - touchStart.current.y;
        if (deltaX > 70 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) setOpen(false);
        touchStart.current = null;
      }}
    >
      <div className="menu-v2-head">
        <Link className="menu-v2-brand" href="/" tabIndex={open ? 0 : -1} aria-label="BASE25 PRO home">
          <span className="menu-v2-mark">8</span>
          <span>BASE25 <b>PRO</b></span>
        </Link>
        <button type="button" className="menu-v2-close" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>×</button>
      </div>
      <div className="menu-v2-scroll">
        {!authReady ? <section className="menu-v2-account"><span className="menu-v2-avatar">…</span><div><strong>Loading account</strong><p>Checking your player profile.</p></div></section> : signedIn ? (
          <section className="menu-v2-account menu-v2-account-in menu-v2-account-ranked">
            <div className="menu-v2-player-top">
              <span className="menu-v2-avatar">{playerSummary?.photo_url ? <img src={playerSummary.photo_url} alt="" /> : (playerSummary?.username || accountName || "P").charAt(0).toUpperCase()}</span>
              <div className="menu-v2-account-copy">
                <strong>{playerSummary?.username || playerSummary?.full_name || accountName || "Player"} {playerSummary && <span className="menu-v2-verified" aria-label="Competitive player">✓</span>}</strong>
                <p>{playerSummary?.player_code || "BASE25 PRO member"}{playerSummary?.globalRank ? " · Global rank #" + playerSummary.globalRank : " · Global rank —"}{playerSummary?.weeklyRank ? " · Weekly rank #" + playerSummary.weeklyRank : " · Weekly rank —"}</p>
              </div>
            </div>
            {playerSummary ? <div className="menu-v2-rating-grid"><div><strong>{Number(playerSummary.elo_rating || 1000).toLocaleString("en-NG")}</strong><span>All-time</span></div><div><strong>{playerSummary.weeklyElo === null ? "—" : Number(playerSummary.weeklyElo).toLocaleString("en-NG")}</strong><span>Weekly</span></div></div> : <p className="menu-v2-no-player">No BASE25 player profile is linked to this login yet.</p>}
            <Link className="menu-v2-profile-link" href="/account" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>My profile <span>→</span></Link>
          </section>
        ) : (
          <section className="menu-v2-account">
            <span className="menu-v2-avatar"><MenuIcon name="user" /></span>
            <div className="menu-v2-account-copy"><strong>Welcome, player</strong><p>Log in to see your rank and rating.</p></div>
            <Link className="menu-v2-login" href="/login" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>Player Login <span>→</span></Link>
            <Link className="menu-v2-register" href="/register" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>New here? <b>Create account</b></Link>
          </section>
        )}
        <div className="menu-v2-section-label">MENU</div>
        <nav className="menu-v2-nav" aria-label="Menu">
          <Link className={pathname === "/" ? "active" : ""} href="/" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="home" /></span>Home</Link>
          <button className={"menu-v2-competition-toggle" + (isCompetitionPage ? " active" : "")} type="button" aria-expanded={competitionOpen} onClick={() => setCompetitionOpen(value => !value)} tabIndex={open ? 0 : -1}>
            <span><MenuIcon name="trophy" /></span>Competition<i className={competitionOpen ? "is-open" : ""}>⌄</i>
          </button>
          {competitionOpen && <div className="menu-v2-subnav" aria-label="Competition pages">
            <Link className={pathname === "/competition" ? "active" : ""} href="/competition" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="trophy" /></span>Competition home</Link>
            <Link className={pathname === "/leaderboard" ? "active" : ""} href="/competition?leaderboard=full#weekly-leaderboard" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="chart" /></span>Leaderboard</Link>
            <Link className={pathname === "/matches" ? "active" : ""} href="/matches" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="history" /></span>Match history</Link>
            <Link className={pathname === "/weekly-archive" ? "active" : ""} href="/weekly-archive" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="calendar" /></span>Weekly archive</Link>
            <Link className={pathname === "/hall-of-fame" ? "active" : ""} href="/hall-of-fame" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="crown" /></span>Hall of Fame</Link>
          </div>}
          <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="players" /></span>Players</Link>
          {isStaff && <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="target" /></span>Predictions League</Link>}
        </nav>
        <div className="menu-v2-section-label menu-v2-about-label">ABOUT</div>
        <nav className="menu-v2-nav" aria-label="About BASE25">
          <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="help" /></span>How It Works</Link>
          <Link className={pathname.includes("rules") ? "active" : ""} href="/how-it-works#rules" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span><MenuIcon name="file" /></span>Rules &amp; Format</Link>
        </nav>
      </div>
      <div className="menu-v2-footer">
        {signedIn && authReady && <button type="button" className="menu-v2-logout" onClick={handleSignOut} disabled={signingOut} tabIndex={open ? 0 : -1}>{signingOut ? "Signing out…" : <><MenuIcon name="logout" /> <span>Log out</span></>}</button>}
        <Link className="menu-v2-admin" href="/admin" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>Admin / staff access <span>→</span></Link>
        <div className="menu-v2-tagline">COMPETITION · PERFORMANCE · LEGACY</div>
      </div>
    </aside>
    <nav className="site-mobile-bottom" aria-label="Primary navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/" aria-current={pathname === "/" ? "page" : undefined}><MenuIcon name="home" /><span>Home</span></Link>
      <Link className={isCompetitionPage ? "active" : ""} href="/competition" aria-current={isCompetitionPage ? "page" : undefined}><MenuIcon name="trophy" /><span>Competition</span></Link>
      {isStaff ? (
        <Link className={"site-mobile-record" + (pathname === "/admin" ? " active" : "")} href="/admin?section=match" aria-label="Record match"><span className="site-mobile-record-icon"><MenuIcon name="plus" /></span><span>Record</span></Link>
      ) : (
        <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions" aria-current={pathname === "/predictions" ? "page" : undefined}><MenuIcon name="target" /><span>Predictions</span></Link>
      )}
      <Link className={isPlayersPage ? "active" : ""} href="/players" aria-current={isPlayersPage ? "page" : undefined}><MenuIcon name="players" /><span>Players</span></Link>
      {signedIn ? (
        <Link className={isOwnProfile ? "active" : ""} href="/account" aria-current={isOwnProfile ? "page" : undefined}>
          {playerSummary?.photo_url ? <span className="site-mobile-me-avatar"><img src={playerSummary.photo_url} alt="" /></span> : <MenuIcon name="user" />}
          <span>Me</span>
        </Link>
      ) : (
        <Link className={pathname === "/login" ? "active" : ""} href="/login" aria-current={pathname === "/login" ? "page" : undefined}><MenuIcon name="login" /><span>Log in</span></Link>
      )}
    </nav>
  </>;
}
