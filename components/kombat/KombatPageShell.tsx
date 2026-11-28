"use client";
import { useEffect, useRef } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";

type Section = "arena" | "leaderboard" | "characters" | "matches" | "rivalries" | "hall" | "players";
const sections: Array<{ key: Section; label: string; href: string }> = [
  { key: "arena", label: "Arena", href: "/?game=mortal-kombat" },
  { key: "leaderboard", label: "Leaderboard", href: "/kombat/leaderboard" },
  { key: "characters", label: "Characters", href: "/kombat/characters" },
  { key: "matches", label: "Matches", href: "/kombat/coming-soon/matches" },
  { key: "rivalries", label: "Rivalries", href: "/kombat/rivalries" },
  { key: "hall", label: "Hall of Fame", href: "/kombat/coming-soon/hall-of-fame" },
];

export default function KombatPageShell({ children, active, title = "KOMBAT" }: { children: React.ReactNode; active: Section; title?: string }) {
  const activeLink = useRef<HTMLAnchorElement | null>(null);
  useEffect(() => {
    activeLink.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [active]);

  return <main className="shell redesign-shell kombat-shell kombat-character-shell">
    <SiteNavigation />
    <header className="kombat-character-header">
      <Link href="/?game=mortal-kombat" className="kombat-header-icon" aria-label="Back to Kombat Arena">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m0 0 7-7m-7 7 7 7" /></svg>
      </Link>
      <strong>{title}</strong>
      <button type="button" className="kombat-header-icon" aria-label="Open navigation menu" onClick={() => window.dispatchEvent(new Event("base25:open-menu"))}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>
    </header>
    <nav className="kombat-section-menu" aria-label="Kombat sections">
      {sections.map((section) => <Link
        key={section.key}
        href={section.href}
        ref={active === section.key ? activeLink : undefined}
        className={active === section.key ? "active" : ""}
        aria-current={active === section.key ? "page" : undefined}
      >{section.label}</Link>)}
    </nav>
    {children}
  </main>;
}
