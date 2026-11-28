import type { Metadata } from "next";
import KombatMatchHistoryClient from "@/components/kombat/KombatMatchHistoryClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Match History", description: "Browse Mortal Kombat ranked, casual and final match results at BASE25." };
export default function KombatMatchHistoryPage(){ return <KombatMatchHistoryClient />; }
