import type { Metadata } from "next";
import CharacterDetailClient from "@/components/kombat/CharacterDetailClient";
import { CHARACTER_DETAIL_SAMPLE } from "@/lib/kombat/character-detail-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const fighter = CHARACTER_DETAIL_SAMPLE[slug];
  const title = fighter
    ? "BASE25 KOMBAT · " + fighter.name + ", Tier " + fighter.tier + ", " + fighter.winRate + "% win rate"
    : "BASE25 KOMBAT · Character";
  return {
    title,
    description: fighter ? fighter.name + " performance at BASE25 KOMBAT. Ranked match statistics only." : "BASE25 KOMBAT character details.",
    openGraph: { title, description: fighter ? fighter.name + " · Tier " + fighter.tier + " · " + fighter.winRate + "% win rate" : "BASE25 KOMBAT character details.", type: "website", url: "https://base25-pro-v1.vercel.app/kombat/characters/" + slug },
  };
}

export default async function KombatCharacterDetailPage({ params }: Props) {
  const { slug } = await params;
  return <CharacterDetailClient slug={slug} />;
}
