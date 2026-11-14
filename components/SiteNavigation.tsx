"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const competitionLinks = [
  { href: "/leaderboard", label: "Leaderboard", icon: "▥" },
  { href: "/matches", label: "Match History", icon: "⚒" },
  { href: "/weekly-archive", label: "Weekly Archive", icon: "▦" },
  { href: "/hall-of-fame", label: "Hall of Fame", icon: "♛" },
];

export default function SiteNavigation() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [competitionOpen, setCompetitionOpen] = useState(true);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);
  const active = (href: string) => pathname === href || (href === "/leaderboard" && pathname === "/");
  return <>
    <header className="site-header">
      <Link className="site-brand" href="/" aria-label="BASE25 PRO home">
        <span className="site-brand-mark">8</span>
        <span className="site-brand-copy"><strong>BASE<span>25</span> <em>PRO</em></strong><small>The Official Billiards Competition</small></span>
      </Link>
      <nav className="site-desktop-nav" aria-label="Main navigation">
        <Link className={pathname === "/" ? "active" : ""} href="/">Home</Link>
        <div className="site-desktop-group">
          <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/leaderboard">Competition⌄</Link>
          <div className="site-desktop-dropdown">{competitionLinks.map(item => <Link key={item.href} href={item.href}>{item.label}</Link>)}</div>
        </div>
        <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players">Players</Link>
        <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works">How It Works</Link>
      </nav>
      <div className="site-header-actions">
        <Link className="site-admin-link" href="/admin">Admin</Link>
        <button className="site-menu-button" type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(true)}><span></span><span></span><span></span></button>
      </div>
    </header>
    <div className={"site-drawer-backdrop" + (open ? " is-open" : "")} onClick={() => setOpen(false)} aria-hidden="true"></div>
    <aside className={"site-drawer" + (open ? " is-open" : "")} aria-hidden={!open} aria-label="Site navigation">
      <div className="site-drawer-head">
        <Link className="site-brand" href="/" tabIndex={open ? 0 : -1}><span className="site-brand-mark">8</span><span className="site-brand-copy"><strong>BASE<span>25</span> <em>PRO</em></strong><small>The Official Billiards Competition</small></span></Link>
        <button type="button" className="site-drawer-close" aria-label="Close menu" onClick={() => setOpen(false)} tabIndex={open ? 0 : -1}>×</button>
      </div>
      <nav className="site-drawer-nav">
        <Link className={"site-drawer-home" + (pathname === "/" ? " active" : "")} href="/" tabIndex={open ? 0 : -1}><span>⌂</span>Home</Link>
        <button className="site-drawer-section" type="button" onClick={() => setCompetitionOpen(v => !v)} aria-expanded={competitionOpen} tabIndex={open ? 0 : -1}><span>♜</span>Competition<i className={competitionOpen ? "rotated" : ""}>⌄</i></button>
        {competitionOpen && <div className="site-drawer-subnav">{competitionLinks.map(item => <Link key={item.href} href={item.href} tabIndex={open ? 0 : -1}><span>{item.icon}</span>{item.label}</Link>)}</div>}
        <Link href="/players" tabIndex={open ? 0 : -1}><span>♧</span>Players<i>›</i></Link>
        <Link href="/how-it-works" tabIndex={open ? 0 : -1}><span>▤</span>How It Works</Link>
        <Link href="/how-it-works#rules" tabIndex={open ? 0 : -1}><span>ⓘ</span>Rules &amp; Format</Link>
      </nav>
      <div className="site-drawer-footer"><p>BASE25 PRO<br/><small>Competition. Performance. Legacy.</small></p><Link href="/admin" tabIndex={open ? 0 : -1}>♙ &nbsp; Admin / Staff Access <span>→</span></Link></div>
    </aside>
    <nav className="site-mobile-bottom" aria-label="Mobile navigation">
      <Link className={pathname === "/" ? "active" : ""} href="/"><span>⌂</span>Home</Link>
      <Link className={competitionLinks.some(x => pathname === x.href) ? "active" : ""} href="/leaderboard"><span>♜</span>Competition</Link>
      <Link className={pathname.startsWith("/players") ? "active" : ""} href="/players"><span>♧</span>Players</Link>
      <Link className={pathname === "/how-it-works" ? "active" : ""} href="/how-it-works"><span>▤</span>How It Works</Link>
    </nav>
  </>;
}
