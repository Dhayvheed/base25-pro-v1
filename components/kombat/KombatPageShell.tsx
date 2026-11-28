import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import "./kombat-types";
export default function KombatPageShell({children,active}:{children:React.ReactNode;active:"leaderboard"|"players"|"characters"}) {
  return <main className="shell redesign-shell kb-shell">
    <SiteNavigation />
    <header className="kb-header">
      <Link href="/?game=mortal-kombat" className="kb-brand">BASE25 <b>KOMBAT</b></Link>
      <nav aria-label="Kombat navigation">
        <Link className={active==="leaderboard"?"active":""} href="/kombat/leaderboard">Leaderboard</Link>
        <Link className={active==="characters"?"active":""} href="/kombat/characters">Characters</Link>
      </nav>
    </header>
    {children}
    <footer className="kb-footer"><strong>BASE25 KOMBAT</strong><span>Every fight counts. Every record is earned.</span></footer>
  </main>;
}
