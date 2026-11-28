import type { Metadata } from "next";
import CharacterCompareClient from "@/components/kombat/CharacterCompareClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Character compare", description: "Compare fighter performance and ranked head-to-head records at BASE25." };
type Props = { searchParams: Promise<{ a?: string; b?: string }> };
export default async function KombatCharacterComparePage({ searchParams }: Props) {
 const params = await searchParams;
 return <CharacterCompareClient initialA={params.a || "scorpion"} initialB={params.b || "sub-zero"} />;
}
