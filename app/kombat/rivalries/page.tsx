import type { Metadata } from "next";
import KombatRivalriesListClient from "@/components/kombat/KombatRivalriesListClient";
export const metadata: Metadata = {
 title: "BASE25 KOMBAT · Rivalries: Moscow vs Oscar 4-3",
 description: "Players who keep meeting. Explore recurring BASE25 KOMBAT ranked matchups.",
 openGraph: {
  title: "BASE25 KOMBAT · Rivalries: Moscow vs Oscar 4-3",
  description: "Moscow leads Oscar 4-3 across their last seven ranked meetings.",
  siteName: "BASE25 PRO",
  type: "website",
 },
};
export default function KombatRivalriesPage(){return <KombatRivalriesListClient/>;}
