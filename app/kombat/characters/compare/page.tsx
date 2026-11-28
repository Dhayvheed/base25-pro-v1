import Link from "next/link";
export default async function KombatCharacterCompareComingSoon({searchParams}:{searchParams:Promise<{a?:string;b?:string}>}) {
 const {a="",b=""}=await searchParams;
 return <main className="shell redesign-shell kombat-shell kombat-character-shell"><section className="character-arena-state character-arena-placeholder"><strong>FIGHTER COMPARISON</strong><p>{a&&b?a.toUpperCase()+" VS "+b.toUpperCase():"Choose two fighters"} — detailed comparisons are coming soon.</p><Link href="/kombat/characters">Back to Character Arena</Link></section></main>;
}
