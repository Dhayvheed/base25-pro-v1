import type { Metadata } from "next";
import KombatRivalriesClient from "@/components/kombat/KombatRivalriesClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Rivalries", description: "Track recurring ranked rivalries between BASE25 Kombat players." };
export default function KombatRivalriesPage(){ return <KombatRivalriesClient />; }
