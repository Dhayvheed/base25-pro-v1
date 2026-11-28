import type { CSSProperties, ReactNode } from "react";
import { FIGHTER_INITIALS, FIGHTER_TILE_GRADIENTS } from "@/lib/kombat/data";

export function KombatCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={"kombat-card " + className}>{children}</section>;
}

export function KombatTag({ children, tone = "steel", className = "" }: { children: ReactNode; tone?: "gold" | "steel" | "bronze" | "grey" | "new" | "red"; className?: string }) {
  return <span className={"kombat-tag character-tag character-tag-" + tone + " " + className}>{children}</span>;
}

export function FighterTile({ slug, name, imageSrc, size = "portrait" }: { slug: string; name: string; imageSrc?: string | null; size?: "portrait" | "compare" }) {
  const gradient = FIGHTER_TILE_GRADIENTS[slug] || "linear-gradient(160deg,#59616a 0%,#17191c 100%)";
  const initials = FIGHTER_INITIALS[slug] || name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || name.slice(0, 2).toUpperCase();
  return <span className={"kombat-fighter character-fighter-tile character-fighter-" + size} style={{ "--fighter-gradient": gradient } as CSSProperties}>
    {imageSrc ? <img src={imageSrc} alt={name} /> : <b>{initials}</b>}
  </span>;
}

import Link from "next/link";

export function PrimaryButton({ children, href, onClick, className = "" }: { children: ReactNode; href?: string; onClick?: () => void; className?: string }) {
  if (onClick) return <button type="button" className={"kombat-detail-primary-button " + className} onClick={onClick}>{children}</button>;
  if (!href) return null;
  return <Link className={"kombat-detail-primary-button " + className} href={href}>{children}</Link>;
}
export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button type="button" className="kombat-detail-secondary-button" onClick={onClick}>{children}</button>;
}
export function RankBadge({ rank }: { rank: number }) {
  return <span className={"kombat-detail-rank rank-" + rank} aria-label={"Rank " + rank}>{rank}</span>;
}
export function Avatar({ name, imageSrc }: { name: string; imageSrc?: string | null }) {
  return <span className="kombat-detail-avatar">{imageSrc ? <img src={imageSrc} alt="" /> : name.slice(0,1).toUpperCase()}</span>;
}
