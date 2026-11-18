"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const competitionLinks = [
  { href: "/competition", label: "Competition Home", icon: "♜" },
  { href: "/leaderboard", label: "Leaderboard", icon: "▥" },
  { href: "/matches", label: "Match History", icon: "⚒" },
  { href: "/weekly-archive", label: "Weekly Archive", icon: "▦" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: "♛" },
];

export default function SiteNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [competitionOpen, setCompetitionOpen] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [signingOut, setSigningOut] = useState(false);

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
        setAccountName("");
        setAuthReady(true);
        return;
      }
      setSignedIn(true);
      const metadataName = user.user_metadata?.username || user.user_metadata?.prediction_nickname || user.user_metadata?.full_name || user.email?.split("@")[0] || "Member";
      setAccountName(metadataName);
      setAuthReady(true);
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

  const active = (href: string) => pathname === href || (href === "/leaderboard" && pathname === "/");
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
          <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/competition">Competition⌄</Link>
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
    <aside className={"site-drawer" + (open ? " is-open" : "")} aria-hidden={!open} aria-label="Site navigation">
      <div className="menu-v2-head">
        <Link className="menu-v2-brand" href="/" tabIndex={open ? 0 : -1} aria-label="BASE25 PRO home">
          <span className="menu-v2-mark">8</span>
          <span>BASE25 <b>PRO</b></span>
        </Link>
        <button type="button" className="menu-v2-close" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>×</button>
      </div>
      <div className="menu-v2-scroll">
        {!authReady ? <section className="menu-v2-account"><span className="menu-v2-avatar">…</span><div><strong>Loading account</strong><p>Checking your player profile.</p></div></section> : signedIn ? (
          <section className="menu-v2-account menu-v2-account-in">
            <span className="menu-v2-avatar">{(accountName || "P").charAt(0).toUpperCase()}</span>
            <div className="menu-v2-account-copy"><span className="menu-v2-kicker">PLAYER ACCOUNT</span><strong>{accountName || "Player"}</strong><p>Your BASE25 PRO player profile.</p></div>
            <Link className="menu-v2-profile-link" href="/account" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>View profile <span>↗</span></Link>
          </section>
        ) : (
          <section className="menu-v2-account">
            <span className="menu-v2-avatar">♙</span>
            <div className="menu-v2-account-copy"><strong>Welcome, player</strong><p>Log in to see your rank and rating.</p></div>
            <Link className="menu-v2-login" href="/login" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>Player Login <span>→</span></Link>
            <Link className="menu-v2-register" href="/register" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>New here? <b>Create account</b></Link>
          </section>
        )}
        <div className="menu-v2-section-label">MENU</div>
        <nav className="menu-v2-nav" aria-label="Menu">
          <Link className={pathname === "/" ? "active" : ""} href="/" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>⌂</span>Home</Link>
          <button className={"menu-v2-competition-toggle" + (pathname.startsWith("/competition") || competitionLinks.some(x => pathname === x.href) ? " active" : "")} type="button" aria-expanded={competitionOpen} onClick={() => setCompetitionOpen(value => !value)} tabIndex={open ? 0 : -1}>
            <span>♜</span>Competition<i className={competitionOpen ? "is-open" : ""}>⌄</i>
          </button>
          {competitionOpen && <div className="menu-v2-subnav" aria-label="Competition pages">
            <Link className={pathname === "/competition" ? "active" : ""} href="/competition" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>♜</span>Competition Home</Link>
            <Link className={pathname === "/leaderboard" ? "active" : ""} href="/leaderboard" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>▥</span>Leaderboard</Link>
            <Link className={pathname === "/matches" ? "active" : ""} href="/matches" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>⚒</span>Match History</Link>
            <Link className={pathname === "/weekly-archive" ? "active" : ""} href="/weekly-archive" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>▦</span>Weekly Archive</Link>
            <Link className={pathname === "/hall-of-fame" ? "active" : ""} href="/hall-of-fame" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>♛</span>Hall of Fame</Link>
          </div>}
          <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>♧</span>Players</Link>
          <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>◎</span>Predictions League</Link>
        </nav>
        <div className="menu-v2-section-label menu-v2-about-label">ABOUT</div>
        <nav className="menu-v2-nav" aria-label="About BASE25">
          <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>ⓘ</span>How It Works</Link>
          <Link className={pathname.includes("rules") ? "active" : ""} href="/how-it-works#rules" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}><span>▤</span>Rules &amp; Format</Link>
        </nav>
      </div>
      <div className="menu-v2-footer">
        {signedIn && authReady && <button type="button" className="menu-v2-logout" onClick={handleSignOut} disabled={signingOut} tabIndex={open ? 0 : -1}>{signingOut ? "Signing out…" : "↪  Log out"}</button>}
        <Link className="menu-v2-admin" href="/admin" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>Admin / staff access <span>→</span></Link>
        <div className="menu-v2-tagline">COMPETITION · PERFORMANCE · LEGACY</div>
      </div>
    </aside>
    <nav className="site-mobile-bottom" aria-label="Mobile navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/"><span>⌂</span>Home</Link>
      <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/competition"><span>♜</span>Competition</Link>
      <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players"><span>♧</span>Players</Link>
      <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions"><span>◎</span>Predictions</Link>
    </nav>
  </>;
}
