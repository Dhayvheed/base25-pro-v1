import type { Metadata } from "next";
import KombatRivalriesListClient from "@/components/kombat/KombatRivalriesListClient";

export const metadata: Metadata = {
  title: "BASE25 KOMBAT · Rivalries",
  description: "Real head-to-head records from published, ranked BASE25 KOMBAT matches.",
  openGraph: {
    title: "BASE25 KOMBAT · Rivalries",
    description: "Explore real player rivalries, head-to-head records and recent form.",
    siteName: "BASE25 PRO",
    type: "website",
  },
};

export default function KombatRivalriesPage() {
  return <KombatRivalriesListClient />;
}
