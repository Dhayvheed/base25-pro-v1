"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { KombatFighter } from "@/lib/kombat/types";
import { buildFighterPerformance, FEATURED_FIGHTER_ORDER, FEATURED_ROSTER_FALLBACK, type FighterPerformance, type KombatFighterMatch } from "@/lib/kombat/data";
import { FighterTile, KombatCard, KombatTag } from "@/components/kombat/KombatUI";
import KombatPageShell from "@/components/kombat/KombatPageShell";

type SortKey = "tier" | "win" | "picked" | "az";
type MatchRow = KombatFighterMatch & { match_type: "ranked" | "casual"; published_at: string | null; voided_at: string | null };
type ArenaFighter = KombatFighter & { performance: FighterPerformance };
const sortFromUrl = (): SortKey => {
  if (typeof window === "undefined") return "tier";
  const value = new URLSearchParams(window.location.search).get("sort");
  return value === "win" || value === "picked" || value === "az" ? value : "tier";
};
const sortOptions: Array<{ key: SortKey; label: string }> = [{key:"tier",label:"TIER"},{key:"win",label:"WIN RATE"},{key:"picked",label:"MOST PICKED"},{key:"az",label:"A–Z"}];
const tierOrder: Record<string, number> = { S:0,A:1,B:2,C:3,NEW:4 };
const featuredOrder = new Map<string, number>(FEATURED_FIGHTER_ORDER.map((slug,index): [string, number] => [slug,index]));

function isMissingKombatTable(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /kombat_(fighters|matches).*(does not exist|could not find the table)|relation .* does not exist/i.test(error.message || "");
}

export default function CharacterArenaClient() {
  const router=useRouter();
  const [fighters,setFighters]=useState<ArenaFighter[]>([]);
  const [query,setQuery]=useState("");
  const [sort,setSort]=useState<SortKey>("tier");
  const [selected,setSelected]=useState<string[]>(["scorpion","sub-zero"]);
  const [visibleCount,setVisibleCount]=useState(20);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [retryToken,setRetryToken]=useState(0);
  const load=useCallback(async()=>{
    setLoading(true);setError("");
    if(!supabase){setError("Kombat records are temporarily unavailable. Please try again.");setLoading(false);return;}
    const [fighterResult,matchResult]=await Promise.all([
      supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").eq("enabled",true).order("sort_order",{ascending:true}),
      supabase.from("kombat_matches").select("fighter_one_id,fighter_two_id,player_one_id,player_two_id,winner_id,match_type,published_at,voided_at").eq("match_type","ranked").not("published_at","is",null).is("voided_at",null),
    ]);
    const fighterTableMissing=isMissingKombatTable(fighterResult.error);
    const matchTableMissing=isMissingKombatTable(matchResult.error);
    if((fighterResult.error&&!fighterTableMissing)||(matchResult.error&&!matchTableMissing)){
      setError("We couldn't load the Character Arena data. Please retry.");
      setLoading(false);
      return;
    }
    // Keep the arena usable before the Kombat schema is installed. This is display-only
    // metadata: it does not create database rows or invent match statistics.
    const databaseRoster=(fighterTableMissing?[]:(fighterResult.data||[])) as KombatFighter[];
    const roster=databaseRoster.length?databaseRoster:FEATURED_ROSTER_FALLBACK;
    const ranked=matchTableMissing?[]:((matchResult.data||[]) as MatchRow[]).filter(m=>m.match_type==="ranked"&&Boolean(m.published_at)&&!m.voided_at);
    const performance=buildFighterPerformance(roster,ranked);
    setFighters(roster.map(f=>({...f,performance:performance[f.id]})));
    setLoading(false);
  },[]);
  useEffect(()=>{setSort(sortFromUrl());load();},[load,retryToken]);
  useEffect(()=>{setVisibleCount(20);},[query,sort]);
  const featured=useMemo(()=>fighters.filter(f=>featuredOrder.has(f.slug)).sort((a,b)=>(featuredOrder.get(a.slug)??99)-(featuredOrder.get(b.slug)??99)),[fighters]);
  const filtered=useMemo(()=>{
    const searching=query.trim().length>0;
    const source=searching?fighters:featured;
    const rows=[...source].filter(f=>!searching||f.name.toLowerCase().includes(query.trim().toLowerCase()));
    rows.sort((a,b)=>{
      if(sort==="az")return a.name.localeCompare(b.name);
      if(sort==="win")return (b.performance.winRate??-1)-(a.performance.winRate??-1)||b.performance.rankedMatches-a.performance.rankedMatches||((featuredOrder.get(a.slug)??99)-(featuredOrder.get(b.slug)??99));
      if(sort==="picked")return (b.performance.pickRate??-1)-(a.performance.pickRate??-1)||((featuredOrder.get(a.slug)??99)-(featuredOrder.get(b.slug)??99));
      return tierOrder[a.performance.tier]-tierOrder[b.performance.tier]||(b.performance.winRate??-1)-(a.performance.winRate??-1)||((featuredOrder.get(a.slug)??99)-(featuredOrder.get(b.slug)??99))||a.name.localeCompare(b.name);
    });
    return rows;
  },[fighters,featured,query,sort]);
  const shown=filtered.slice(0,visibleCount);
  const chosen=selected.map(slug=>fighters.find(f=>f.slug===slug)).filter(Boolean) as ArenaFighter[];
  const chooseSort=(next:SortKey)=>{setSort(next);const url=new URL(window.location.href);if(next==="tier")url.searchParams.delete("sort");else url.searchParams.set("sort",next);window.history.replaceState({},"",url.toString());};
  const toggleSelected=(slug:string,checked:boolean)=>setSelected(old=>{if(!checked)return old.filter(x=>x!==slug);if(old.includes(slug))return old;return old.length<2?[...old,slug]:[...old.slice(1),slug];});
  const compare=()=>{if(chosen.length===2)router.push("/kombat/characters/compare?a="+encodeURIComponent(chosen[0].slug)+"&b="+encodeURIComponent(chosen[1].slug));};
  const maxPickRate=Math.max(0,...fighters.map(f=>f.performance.pickRate??0));
  return <div className="character-arena-content">
    <section className="character-arena-intro"><div className="character-arena-eyebrow">BASE25 PERFORMANCE · NOT OFFICIAL RANKINGS</div><h1>Character <em>arena</em></h1><p>How each fighter performs at BASE25. Character tiers never change a player's Elo.</p></section>
    <div className="character-arena-search-wrap"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search fighters" aria-label="Search fighters"/></div>
    <div className="character-arena-sort" role="group" aria-label="Sort fighters">{sortOptions.map(o=><button key={o.key} type="button" className={sort===o.key?"active":""} aria-pressed={sort===o.key} onClick={()=>chooseSort(o.key)}>{o.label}</button>)}</div>
    {loading?<div className="character-arena-grid" aria-label="Loading fighters">{Array.from({length:8}).map((_,i)=><div className="character-arena-card character-arena-skeleton" key={i}><div className="character-arena-skeleton-portrait"/><div className="character-arena-skeleton-lines"><i/><i/><i/></div></div>)}</div>
    :error?<div className="character-arena-state character-arena-error" role="alert"><strong>ARENA UNAVAILABLE</strong><p>{error}</p><button type="button" onClick={()=>setRetryToken(v=>v+1)}>Retry</button></div>
    :filtered.length===0?<div className="character-arena-state"><strong>{query.trim()?"NO FIGHTERS MATCH YOUR SEARCH":"NO ENABLED FIGHTERS YET"}</strong>{query.trim()&&<button type="button" onClick={()=>setQuery("")}>Clear search</button>}</div>
    :<><div className="character-arena-grid">{shown.map(f=><KombatCard className={"character-arena-card"+(selected.includes(f.slug)?" is-selected":"")} key={f.id}>
      <Link href={"/kombat/characters/"+f.slug} className="character-arena-card-link" aria-label={"View "+f.name+" details"}><FighterTile slug={f.slug} name={f.name} imageSrc={f.image_src}/>
       <div className="character-arena-card-info"><strong className="character-arena-name">{f.name}</strong><div className="character-arena-stats"><div><b>{f.performance.winRate===null?"—":Math.round(f.performance.winRate)+"%"}</b><small>WIN RATE</small></div><div className="character-arena-matches"><b>{f.performance.rankedMatches?f.performance.rankedMatches.toLocaleString("en-NG"):"—"}</b><small>MATCHES</small></div></div>
        <div className="character-arena-pick-label">PICKED {f.performance.pickRate===null?"—":Math.round(f.performance.pickRate)+"%"}</div><div className="character-arena-pick-track"><span style={{width:f.performance.pickRate===null||maxPickRate===0?"0%":(f.performance.pickRate/maxPickRate*100)+"%"}}/></div>
       </div>
      <KombatTag tone={f.performance.tier==="S"?"gold":f.performance.tier==="A"?"steel":f.performance.tier==="B"?"bronze":f.performance.tier==="C"?"grey":"new"} className="character-arena-tier">TIER {f.performance.tier}</KombatTag>
      </Link>
      <label className="character-arena-select"><input type="checkbox" checked={selected.includes(f.slug)} onChange={e=>toggleSelected(f.slug,e.target.checked)} aria-label={"Select "+f.name+" for comparison"}/><span aria-hidden="true"><svg viewBox="0 0 16 16"><path d="m3 8 3.2 3.2L13 4.5"/></svg></span></label>
     </KombatCard>)}</div>{filtered.length>shown.length&&<button className="character-arena-load-more" type="button" onClick={()=>setVisibleCount(v=>v+20)}>Load more fighters</button>}</>}
    <p className="character-arena-note">Showing the 8 featured fighters until the Kombat roster is connected. Match statistics stay blank until official ranked records are available. Tier needs at least 10 ranked matches.</p>
    {chosen.length>0&&<aside className="character-arena-compare-bar" aria-label="Selected fighters"><div className="character-arena-compare-tiles">{chosen.map(f=><FighterTile key={f.id} slug={f.slug} name={f.name} imageSrc={f.image_src} size="compare"/>)}</div><div className="character-arena-compare-copy"><strong>{chosen.length} {chosen.length===1?"fighter":"fighters"} selected</strong><small>{chosen.length===2?chosen[0].name+" VS "+chosen[1].name:"Pick one more to compare"}</small></div><button type="button" onClick={compare} disabled={chosen.length!==2}>COMPARE</button></aside>}
  </div>;
}
