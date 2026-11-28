import Link from "next/link";
const labels:Record<string,string>={matches:"Matches",rivalries:"Rivalries","hall-of-fame":"Hall of Fame"};
export default async function KombatSectionComingSoon({params}:{params:Promise<{section:string}>}) {
 const {section}=await params;const label=labels[section]||"Kombat";
 return <main className="shell redesign-shell kombat-shell kombat-character-shell"><section className="character-arena-state character-arena-placeholder"><strong>{label.toUpperCase()}</strong><p>This Kombat section is coming soon.</p><Link href="/?game=mortal-kombat">Back to Kombat Arena</Link></section></main>;
}
