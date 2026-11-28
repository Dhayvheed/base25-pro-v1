import type { Metadata } from "next";
import CharacterArenaClient from "@/components/kombat/CharacterArenaClient";
export const metadata: Metadata = { title: "BASE25 KOMBAT · Character arena", description: "Explore BASE25 KOMBAT fighter performance, compare characters and track the roster.", openGraph: { title: "BASE25 KOMBAT · Character arena", description: "Explore the BASE25 KOMBAT character arena.", siteName: "BASE25 PRO", type: "website" } };
export default function CharacterArenaPage() { return <CharacterArenaClient />; }
