import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "BASE25 PRO · Every match counts", description: "Follow the BASE25 PRO competition: player rankings, live King’s Pot and match results.", openGraph: { title: "BASE25 PRO · Every match counts", description: "Follow the BASE25 PRO competition: player rankings, live King’s Pot and match results.", siteName: "BASE25 PRO", type: "website" } };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }