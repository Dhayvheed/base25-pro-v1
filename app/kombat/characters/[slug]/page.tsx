import Link from "next/link";
export default async function KombatCharacterDetailComingSoon({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;const name=slug.split("-").map(p=>p.charAt(0).toUpperCase()+p.slice(1)).join(" ");
 return <main className="shell redesign-shell kombat-shell kombat-character-shell"><section className="character-arena-state character-arena-placeholder"><strong>{name.toUpperCase()}</strong><p>Fighter details are coming soon.</p><Link href="/kombat/characters">Back to Character Arena</Link></section></main>;
}
