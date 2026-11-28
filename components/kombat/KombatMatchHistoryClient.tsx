"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import { FighterTile } from "@/components/kombat/KombatUI";
import { FEATURED_ROSTER_FALLBACK } from "@/lib/kombat/data";
import type { KombatFighter } from "@/lib/kombat/types";

type Row = Record<string, any> & { id:string };
type Player = { id:string; username:string; player_code?:string|null };
type Filter = "all"|"ranked"|"casual"|"finals";
const getDate=(m:Row)=>m.published_at||m.played_at||m.created_at||null;
const getScore=(m:Row,side:"one"|"two")=>m["player_"+side+"_score"]??m["fighter_"+side+"_score"]??m[side+"_score"]??null;
const getGames=(m:Row):any[]=>Array.isArray(m.games)?m.games:Array.isArray(m.game_scores)?m.game_scores:Array.isArray(m.rounds)?m.rounds:[];
const isFinal=(m:Row)=>m.is_final===true||m.final===true||m.status==="final"||m.match_type==="final";
const isEdited=(m:Row)=>m.is_edited===true||m.edited===true||Boolean(m.edited_at);
const eloChange=(m:Row,side:"one"|"two")=>{const direct=m["player_"+side+"_elo_change"]??m["fighter_"+side+"_elo_change"];if(direct!==undefined&&direct!==null)return Number(direct);const before=m["player_"+side+"_elo_before"],after=m["player_"+side+"_elo_after"];return before!=null&&after!=null?Number(after)-Number(before):null};
const initials=(name:string)=>name.split(/\s+/).map(s=>s[0]).join("").slice(0,2).toUpperCase();
const fmtDate=(value:string)=>{const d=new Date(value);return d.toLocaleDateString("en-GB",{weekday:"short",day:"2-digit",month:"short"}).toUpperCase().replace(","," ·")};
const timeLabel=(value:string|null)=>value?new Date(value).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}):"";
export default function KombatMatchHistoryClient(){
 const [rows,setRows]=useState<Row[]>([]);
 const [players,setPlayers]=useState<Record<string,Player>>({});
 const [fighters,setFighters]=useState<KombatFighter[]>(FEATURED_ROSTER_FALLBACK);
 const [filter,setFilter]=useState<Filter>("all");
 const [search,setSearch]=useState("");
 const [expanded,setExpanded]=useState<string|null>(null);
 const [visible,setVisible]=useState(20);
 const [loading,setLoading]=useState(true);
 const [unavailable,setUnavailable]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setUnavailable(true);setLoading(false);return;}
  const result=await supabase.from("kombat_matches").select("*").limit(200);
  if(!live)return;
  if(result.error){if(["42P01","PGRST205"].includes(result.error.code||""))setUnavailable(true);else setError("Match history could not be loaded.");setLoading(false);return;}
  const data=(result.data||[]) as Row[];
  const published=data.filter(m=>m.voided_at==null&&(m.published_at||m.played_at||m.created_at)).sort((a,b)=>new Date(getDate(b)||0).getTime()-new Date(getDate(a)||0).getTime());
  setRows(published);
  if(published.length)setExpanded(published[0].id);
  const playerIds=[...new Set(published.flatMap(m=>[m.player_one_id,m.player_two_id]).filter(Boolean))];
  const fighterIds=[...new Set(published.flatMap(m=>[m.fighter_one_id,m.fighter_two_id]).filter(Boolean))];
  const [pr,fr]=await Promise.all([
   playerIds.length?supabase.from("players").select("id,username,player_code").in("id",playerIds):Promise.resolve({data:[],error:null}),
   fighterIds.length?supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").in("id",fighterIds):Promise.resolve({data:[],error:null})
  ]);
  if(!live)return;
  const pmap:Record<string,Player>={};(pr.data||[]).forEach((p:any)=>pmap[p.id]=p);setPlayers(pmap);
  if(fr.data?.length)setFighters(fr.data as KombatFighter[]);
  setLoading(false);
 })();return()=>{live=false}},[]);
 const fighterById=useMemo(()=>Object.fromEntries(fighters.map(f=>[f.id,f])),[fighters]);
 const filtered=useMemo(()=>rows.filter(m=>{
  if(filter==="ranked"&&m.match_type!=="ranked")return false;
  if(filter==="casual"&&m.match_type!=="casual")return false;
  if(filter==="finals"&&!isFinal(m))return false;
  if(!search.trim())return true;
  const q=search.trim().toLowerCase();
  const p1=players[m.player_one_id]?.username||"",p2=players[m.player_two_id]?.username||"";
  const f1=fighterById[m.fighter_one_id]?.name||"",f2=fighterById[m.fighter_two_id]?.name||"";
  return [p1,p2,f1,f2].some(v=>v.toLowerCase().includes(q));
 }),[rows,filter,search,players,fighterById]);
 const shown=filtered.slice(0,visible);
 const groups=useMemo(()=>{const map=new Map<string,Row[]>();shown.forEach(m=>{const date=getDate(m);const key=date?fmtDate(date):"DATE UNAVAILABLE";if(!map.has(key))map.set(key,[]);map.get(key)!.push(m)});return [...map.entries()]},[shown]);
 const name=(id:string)=>players[id]?.username||"Unknown player";
 const fighter=(id:string)=>fighterById[id]||FEATURED_ROSTER_FALLBACK.find(f=>f.id===id)||null;
 const badge=(m:Row)=>isFinal(m)?"FINAL":m.match_type==="casual"?"CASUAL":"RANKED";
 return <KombatPageShell active="matches" title="KOMBAT">
  <div className="kombat-history-page">
   <header className="kombat-history-intro"><small>MORTAL KOMBAT 11 · ALL MATCHES</small><h1>MATCH <em>HISTORY</em></h1></header>
   <label className="kombat-history-search"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input value={search} onChange={e=>{setSearch(e.target.value);setVisible(20)}} placeholder="Search player or fighter" aria-label="Search player or fighter"/></label>
   <div className="kombat-history-filters" role="group" aria-label="Filter matches">{([{id:"all",label:"ALL"},{id:"ranked",label:"RANKED"},{id:"casual",label:"CASUAL"},{id:"finals",label:"FINALS"}] as const).map(f=><button key={f.id} className={filter===f.id?"active":""} onClick={()=>{setFilter(f.id);setVisible(20)}}>{f.label}</button>)}</div>
   {loading?<div className="kombat-history-empty">Loading match history…</div>:error?<div className="kombat-history-empty">{error}</div>:unavailable?<div className="kombat-history-empty"><b>Match history is being prepared</b><p>Ranked and casual Kombat results will appear here once the Kombat match records are connected.</p></div>:filtered.length===0?<div className="kombat-history-empty"><b>{rows.length?"No matches found":"No Kombat matches recorded yet"}</b><p>{rows.length?"Try another search or filter.":"Recorded Mortal Kombat results will appear here automatically."}</p></div>:<>
    <div className="kombat-history-list">{groups.map(([date,items])=><section className="kombat-history-day" key={date}><h2>{date}</h2>{items.map(m=>{
      const p1=name(m.player_one_id),p2=name(m.player_two_id),f1=fighter(m.fighter_one_id),f2=fighter(m.fighter_two_id);
      const score1=getScore(m,"one"),score2=getScore(m,"two");
      const games=getGames(m),open=expanded===m.id,elo1=eloChange(m,"one"),elo2=eloChange(m,"two");
      return <article className={"kombat-history-match "+(open?"expanded":"")} key={m.id}>
       <button className="kombat-history-match-head" onClick={()=>setExpanded(open?null:m.id)} aria-expanded={open}>
        <span className="kombat-history-fighter-icon">{f1?<FighterTile slug={f1.slug} name={f1.name} imageSrc={f1.image_src} size="compare"/>:<b>MK</b>}</span>
        <span className="kombat-history-match-copy"><strong>{p1} <i>vs</i> {p2}</strong><small>{f1?.name||"Fighter"} · {f2?.name||"Fighter"}{timeLabel(getDate(m))?" · "+timeLabel(getDate(m)):""}</small></span>
        <span className="kombat-history-score">{score1??"—"} – {score2??"—"}</span><span className="kombat-history-chevron">›</span>
        <span className={"kombat-history-badge "+(badge(m)==="CASUAL"?"casual":"")}>{badge(m)}</span>
        {isEdited(m)&&<span className="kombat-history-edited">EDITED</span>}
       </button>
       {open&&<div className="kombat-history-expanded">
        {games.length?games.map((g:any,i:number)=><div className="kombat-history-game" key={g.id||i}><small>GAME {g.game_number||g.game||i+1}</small><strong>{g.winner_name||((g.winner_id===m.player_one_id)?p1:(g.winner_id===m.player_two_id)?p2:"Game result") } won</strong><b>{g.player_one_score??g.score_one??g.score??"—"} – {g.player_two_score??g.score_two??"—"}</b></div>):<p className="kombat-history-no-games">Game-by-game scores aren't available for this record.</p>}
        <div className="kombat-history-elo">{elo1!==null&&<span>{p1} <b className={elo1>=0?"positive":"negative"}>{elo1>0?"+":""}{elo1} Elo</b></span>}{elo2!==null&&<span>{p2} <b className={elo2>=0?"positive":"negative"}>{elo2>0?"+":""}{elo2} Elo</b></span>}</div>
        <span className="kombat-history-open-label">MATCH BREAKDOWN</span>
       </div>}
      </article>
    })}</section>)}</div>
    {visible<filtered.length&&<button className="kombat-history-load" onClick={()=>setVisible(v=>v+20)}>LOAD MORE MATCHES</button>}
   </>}
   <p className="kombat-history-footnote">Casual matches appear here but do not change Elo, the leaderboard, character stats or the pot. “Edited” marks a match whose result was corrected by an admin.</p>
  </div>
 </KombatPageShell>;
}
