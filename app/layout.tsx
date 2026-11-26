import type { Metadata } from "next";
import "./globals.css";
import PWAInstall from "./components/PWAInstall";

export const metadata: Metadata = {
  title: "BASE25 PRO | The Competition Board",
  description: "Official BASE25 player rankings, match results and player records.",
  manifest: "/manifest.json",
  applicationName: "BASE25 PRO",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "BASE25 PRO" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  themeColor: "#0b0d0c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PWAInstall />{children}</body></html>;
}
