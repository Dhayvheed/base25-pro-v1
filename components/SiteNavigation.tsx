"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const competitionLinks = [
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
          <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/leaderboard">Competition⌄</Link>
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
      <div className="site-drawer-head">
        {brand(true)}
        <button type="button" className="site-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>×</button>
      </div>
      <div className="site-drawer-scroll">
        <nav className="site-drawer-nav">
          <Link className={"site-drawer-home" + (pathname === "/" ? " active" : "")} href="/" tabIndex={open ? 0 : -1}><span>⌂</span>Home</Link>
          <button className="site-drawer-section" type="button" onClick={() => setCompetitionOpen(v => !v)} aria-expanded={competitionOpen} tabIndex={open ? 0 : -1}><span>♜</span>Competition<i className={competitionOpen ? "rotated" : ""}>⌄</i></button>
          {competitionOpen && <div className="site-drawer-subnav">{competitionLinks.map(item => <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}><span>{item.icon}</span>{item.label}<i>→</i></Link>)}</div>}
          <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players" tabIndex={open ? 0 : -1}><span>♧</span>Players<i>›</i></Link>
          <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions" tabIndex={open ? 0 : -1}><span>◎</span>Predictions League<i>›</i></Link>
          <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works" tabIndex={open ? 0 : -1}><span>▤</span>How It Works<i>›</i></Link>
          <Link href="/how-it-works#rules" tabIndex={open ? 0 : -1}><span>ⓘ</span>Rules &amp; Format<i>›</i></Link>
        </nav>
        <div className="site-drawer-brand-card">
          <span className="site-drawer-brand-ball">8</span>
          <span><b>BASE25 <em>PRO</em></b><small>Competition. Performance. Legacy.</small></span>
        </div>
        <Link className="site-drawer-admin" href="/admin" tabIndex={open ? 0 : -1}>♙ &nbsp; Admin / Staff Access <span>→</span></Link>
      </div>
      <div className="site-drawer-account-fixed">
        <span className="site-drawer-account-label">ACCOUNT</span>
        {!authReady ? <span className="site-drawer-account-loading">Checking account…</span> : signedIn ? <>
          <Link className="site-drawer-login-cta" href="/account" tabIndex={open ? 0 : -1}>♙ &nbsp; My Account <span>→</span></Link>
          <button className="site-drawer-signout" type="button" onClick={handleSignOut} disabled={signingOut} tabIndex={open ? 0 : -1}>{signingOut ? "Signing out…" : "Sign Out"}</button>
        </> : <>
          <Link className="site-drawer-login-cta" href="/login" tabIndex={open ? 0 : -1}>♙ &nbsp; Player Login <span>→</span></Link>
          <Link className="site-drawer-register" href="/register" tabIndex={open ? 0 : -1}>Create Account <span>→</span></Link>
        </>}
      </div>
    </aside>
    <nav className="site-mobile-bottom" aria-label="Mobile navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/"><span>⌂</span>Home</Link>
      <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/leaderboard"><span>♜</span>Competition</Link>
      <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players"><span>♧</span>Players</Link>
      <Link className={pathname === "/predictions" ? "active" : ""} href="/predictions"><span>◎</span>Predictions</Link>
    </nav>
  </>;
}
