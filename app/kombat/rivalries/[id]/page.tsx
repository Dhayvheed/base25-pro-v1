import type { Metadata } from "next";
import KombatRivalryDetailClient from "@/components/kombat/KombatRivalryDetailClient";
import { SAMPLE_RIVALRY_ID } from "@/lib/kombat/rivalry-detail-sample";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  if (id === SAMPLE_RIVALRY_ID) {
    return {
      title: "BASE25 KOMBAT · Moscow vs Oscar, 4–3",
      description: "Sample rivalry detail: Moscow vs Oscar, seven ranked meetings.",
      openGraph: {
        title: "BASE25 KOMBAT · Moscow vs Oscar, 4–3",
        description: "Sample rivalry detail. TODO: connect to real published ranked Kombat matches.",
        siteName: "BASE25 PRO",
        type: "website",
      },
    };
  }
  return {
    title: "BASE25 KOMBAT · Rivalry",
    description: "Kombat rivalry detail.",
  };
}

export default function KombatRivalryDetailPage() {
  return <KombatRivalryDetailClient />;
}
