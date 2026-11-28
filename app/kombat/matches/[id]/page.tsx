import type { Metadata } from "next";
import KombatMatchDetailClient from "@/components/kombat/KombatMatchDetailClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Match Report", description: "Full match report, game-by-game results and rating changes." };
export default function KombatMatchDetailPage(){ return <KombatMatchDetailClient />; }
