import type { Metadata } from "next";
import CharacterCompareClient from "@/components/kombat/CharacterCompareClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Character compare", description: "Compare fighter performance and ranked head-to-head records at BASE25." };
export default function KombatCharacterComparePage() { return <CharacterCompareClient />; }
