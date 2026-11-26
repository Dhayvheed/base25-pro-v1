import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "BASE25 PRO | The Competition Board", description: "Official BASE25 player rankings, match results and player records." };
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }