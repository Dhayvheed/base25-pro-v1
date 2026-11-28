"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { FEATURED_ROSTER_FALLBACK } from "@/lib/kombat/data";
import type { KombatFighter } from "@/lib/kombat/types";
import { FighterTile, KombatTag } from "@/components/kombat/KombatUI";
import KombatPageShell from "@/components/kombat/KombatPageShell";

type Match = { id:string; fighter_one_id:string; fighter_two_id:string; player_one_id:string; player_two_id:string; winner_id:string; match_type:string; published_at:string|null; voided_at:string|null;  };
type PlayerStat = { id:string; name:string; wins:number; matches:number };
const nameFromId=(id:string)=>"Player "+id.slice(0,5).toUpperCase();
const pct=(wins:number,total:number)=>total?Math.round(wins/total*100):null;
const dateLabel=(date:string|null)=>date?new Date(date).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase():"—";

export default function CharacterCompareClient(){
 const params=useSearchParams();
 const [fighters,setFighters]=useState<KombatFighter[]>(FEATURED_ROSTER_FALLBACK);
 const [matches,setMatches]=useState<Match[]>([]);
 const [a,setA]=useState(params.get("a")||"scorpion");
 const [b,setB]=useState(params.get("b")||"sub-zero");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [swap,setSwap]=useState(false);
 const load=useCallback(async()=>{
  if(!supabase){setError("Kombat data is not connected yet.");setLoading(false);return;}
  const [fr,mr]=await Promise.all([
   supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").eq("enabled",true).order("sort_order"),
   supabase.from("kombat_matches").select("id,fighter_one_id,fighter_two_id,player_one_id,player_two_id,winner_id,match_type,published_at,voided_at").eq("match_type","ranked").not("published_at","is",null).is("voided_at",null).order("published_at",{ascending:false})
  ]);
  if(fr.error && !["42P01","PGRST205"].includes(fr.error.code||""))setError("Could not load the fighter roster.");
  else if(mr.error && !["42P01","PGRST205"].includes(mr.error.code||""))setError("Could not load ranked match records.");
  else {
   if(fr.data?.length)setFighters(fr.data as KombatFighter[]);
   setMatches((mr.data||[]) as Match[]);
  }
  setLoading(false);
 },[]);
 useEffect(()=>{load()},[load]);
 const leftSlug=swap?b:a, rightSlug=swap?a:b;
 const left=fighters.find(f=>f.slug===leftSlug)||FEATURED_ROSTER_FALLBACK.find(f=>f.slug===leftSlug)||FEATURED_ROSTER_FALLBACK[0];
 const right=fighters.find(f=>f.slug===rightSlug)||FEATURED_ROSTER_FALLBACK.find(f=>f.slug===rightSlug)||FEATURED_ROSTER_FALLBACK[1];
 const fighterStats=useMemo(()=>{const calc=(id:string)=>{const rows=matches.filter(m=>m.fighter_one_id===id||m.fighter_two_id===id);const wins=rows.filter(m=>(m.fighter_one_id===id&&m.winner_id===m.player_one_id)||(m.fighter_two_id===id&&m.winner_id===m.player_two_id)).length;return {rows,wins,losses:rows.length-wins,rate:pct(wins,rows.length)};};return {left:calc(left.id),right:calc(right.id)}},[matches,left.id,right.id]);
 const head=useMemo(()=>matches.filter(m=>(m.fighter_one_id===left.id&&m.fighter_two_id===right.id)||(m.fighter_one_id===right.id&&m.fighter_two_id===left.id)),[matches,left.id,right.id]);
 const headWins=head.reduce((n,m)=>{const leftWon=(m.fighter_one_id===left.id&&m.winner_id===m.player_one_id)||(m.fighter_two_id===left.id&&m.winner_id===m.player_two_id);return n+(leftWon?1:0)},0);
 const headLosses=head.length-headWins;
 const topPlayers=(fighterId:string)=>{const map=new Map<string,PlayerStat>();matches.forEach(m=>{let pid="",won=false;if(m.fighter_one_id===fighterId){pid=m.player_one_id;won=m.winner_id===pid}else if(m.fighter_two_id===fighterId){pid=m.player_two_id;won=m.winner_id===pid}else return;const row=map.get(pid)||{id:pid,name:nameFromId(pid),wins:0,matches:0};row.matches++;if(won)row.wins++;map.set(pid,row)});return [...map.values()].sort((x,y)=>(y.wins/y.matches)-(x.wins/x.matches)||y.matches-x.matches).slice(0,3)};
 const leftTop=topPlayers(left.id),rightTop=topPlayers(right.id);
 const choose=(side:"a"|"b",slug:string)=>{if(side==="a"){if(swap)setB(slug);else setA(slug);}else{if(swap)setA(slug);else setB(slug);}setSwap(false);};
 const displayA=swap?right:left,displayB=swap?left:right;
 return <KombatPageShell active="characters" title="COMPARE">
 <div className="kombat-compare-page">
  <header className="kombat-compare-intro"><small>FIGHTER COMPARISON</small><h1>{displayA.name} <em>VS</em> {displayB.name}</h1></header>
  <section className="kombat-compare-pickers">
   {[{f:displayA,side:"a" as const,tone:"gold"},{f:displayB,side:"b" as const,tone:"blue"}].map(({f,side,tone})=><div className={"kombat-compare-fighter "+tone} key={side}>
    <FighterTile slug={f.slug} name={f.name} imageSrc={f.image_src}/>
    <b>{f.name}</b><KombatTag tone="grey">TIER {matches.filter(m=>m.fighter_one_id===f.id||m.fighter_two_id===f.id).length>=10?"RANKED":"NEW"}</KombatTag>
    <label className="kombat-compare-select"><span className="sr-only">Change {side==="a"?"first":"second"} fighter</span><select value={f.slug} onChange={e=>choose(side,e.target.value)}>{fighters.map(x=><option key={x.id} value={x.slug}>{x.name}</option>)}</select></label>
   </div>)}
   <span className="kombat-compare-vs">VS</span>
  </section>
  <div className="kombat-compare-actions"><span>CHANGE FIGHTER</span><button type="button" onClick={()=>setSwap(v=>!v)}>SWAP SIDES</button></div>
  {loading?<div className="kombat-compare-state">Loading ranked comparison…</div>:error?<div className="kombat-compare-state">{error}</div>:<>
   <section className="kombat-compare-headtohead"><small>HEAD TO HEAD AT BASE25</small><strong>{headWins} <i>–</i> {headLosses}</strong><p>{head.length?displayA.name+" leads over "+head.length+" ranked meetings": "No ranked meetings recorded yet"}</p><div><i style={{width:head.length?(headWins/head.length*100)+"%":"50%"}}/><i style={{width:head.length?(headLosses/head.length*100)+"%":"50%"}}/></div></section>
   <section className="kombat-compare-stats"><div className="kombat-compare-labels"><b>{displayA.name}</b><b>{displayB.name}</b></div>
    {([{label:"WIN RATE",l:fighterStats.left.rate,r:fighterStats.right.rate,kind:"pct"},{label:"MATCHES",l:fighterStats.left.rows.length,r:fighterStats.right.rows.length,kind:"num"},{label:"PICK RATE",l:null,r:null,kind:"na"},{label:"WINS",l:fighterStats.left.wins,r:fighterStats.right.wins,kind:"num"},{label:"BEST WEEKLY WIN RATE",l:null,r:null,kind:"na"}] as const).map(row=><div className="kombat-compare-stat" key={row.label}><div><b>{row.l===null?"—":row.kind==="pct"?row.l+"%":row.l}</b><span>{row.label}</span><b>{row.r===null?"—":row.kind==="pct"?row.r+"%":row.r}</b></div><div className="kombat-compare-bars"><i style={{width:row.l===null?"0%":Math.max(0,Math.min(100,Number(row.l)))+"%"}}/><i style={{width:row.r===null?"0%":Math.max(0,Math.min(100,Number(row.r)))+"%"}}/></div></div>)}
   </section>
   <section className="kombat-compare-top"><small>TOP PLAYERS</small><div className="kombat-compare-top-cols">{[{name:displayA.name,rows:leftTop},{name:displayB.name,rows:rightTop}].map(col=><div key={col.name}><b>{col.name}</b>{col.rows.length?col.rows.slice(0,2).map(p=><p key={p.id}><span>{p.name}</span><strong>{pct(p.wins,p.matches)}%</strong></p>):<p className="muted">No ranked data</p>}</div>)}</div></section>
   <section className="kombat-compare-meetings"><small>THEIR LAST MEETINGS</small><h2>{displayA.name} VS {displayB.name}</h2>{head.slice(0,3).map(m=><div className="kombat-compare-meeting" key={m.id}><FighterTile slug={displayA.slug} name={displayA.name} imageSrc={displayA.image_src} size="compare"/><div><b>{nameFromId(m.player_one_id)} vs {nameFromId(m.player_two_id)}</b><small>{displayA.name} · {displayB.name} · {dateLabel(m.published_at)}</small></div><strong>{"—"}</strong></div>)}{head.length===0&&<p className="muted">Their first ranked meeting is waiting to happen.</p>}<a href={"/kombat/coming-soon/matches?fighter="+displayA.slug+"&opponent="+displayB.slug}>SEE ALL {head.length} MEETINGS →</a></section>
  </>}
  <p className="kombat-compare-footnote">Comparisons use published, non-voided ranked matches only. Statistics remain blank when no ranked records are available.</p>
 </div></KombatPageShell>;
}
