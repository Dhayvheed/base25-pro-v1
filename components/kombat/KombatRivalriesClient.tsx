"use client";
import {useEffect,useMemo,useState} from "react";
import {supabase} from "@/lib/supabase";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {FighterTile} from "@/components/kombat/KombatUI";
import {FEATURED_ROSTER_FALLBACK} from "@/lib/kombat/data";
import type {KombatFighter} from "@/lib/kombat/types";

type Row=Record<string,any>&{id:string};
type Player={id:string;username:string};
type Rivalry={key:string;one:string;two:string;oneName:string;twoName:string;oneFighter:string;twoFighter:string;oneFighterName:string;twoFighterName:string;oneWins:number;twoWins:number;meetings:Row[];last: string|null;lastWinner:string|null;streak:number};
const dateOf=(m:Row)=>m.published_at||m.played_at||m.created_at||null;
const labelDate=(v:string|null)=>v?new Date(v).toLocaleDateString("en-GB",{day:"2-digit",month:"short"}).toUpperCase():"—";
const pairKey=(a:string,b:string)=>[a,b].sort().join("::");
export default function KombatRivalriesClient(){
 const [rows,setRows]=useState<Row[]>([]),[players,setPlayers]=useState<Record<string,Player>>({}),[fighters,setFighters]=useState<KombatFighter[]>(FEATURED_ROSTER_FALLBACK);
 const [tab,setTab]=useState<"all"|"mine">("all"),[sort,setSort]=useState<"hottest"|"meetings"|"recent">("hottest"),[visible,setVisible]=useState(8),[userId,setUserId]=useState<string|null>(null);
 const [loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false),[error,setError]=useState(""),[expanded,setExpanded]=useState<string|null>(null);
 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setUnavailable(true);setLoading(false);return}
  const [mr,ur]=await Promise.all([supabase.from("kombat_matches").select("*").limit(1000),supabase.auth.getUser()]);
  if(!live)return;
  if(mr.error){if(["42P01","PGRST205"].includes(mr.error.code||""))setUnavailable(true);else setError("Rivalries could not be loaded.");setLoading(false);return}
  setUserId(ur.data.user?.id||null);
  const valid=(mr.data||[] as Row[]).filter((m:Row)=>m.match_type==="ranked"&&m.voided_at==null&&(m.published_at||m.played_at||m.created_at));
  valid.sort((a:Row,b:Row)=>new Date(dateOf(b)||0).getTime()-new Date(dateOf(a)||0).getTime());
  setRows(valid);
  const pids=[...new Set(valid.flatMap((m:Row)=>[m.player_one_id,m.player_two_id]).filter(Boolean))],fids=[...new Set(valid.flatMap((m:Row)=>[m.fighter_one_id,m.fighter_two_id]).filter(Boolean))];
  const [pr,fr]=await Promise.all([
   pids.length?supabase.from("players").select("id,username").in("id",pids):Promise.resolve({data:[]}),
   fids.length?supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").in("id",fids):Promise.resolve({data:[]})
  ]);
  if(!live)return;
  const pm:Record<string,Player>={};(pr.data||[]).forEach((p:any)=>pm[p.id]=p);setPlayers(pm);
  if(fr.data?.length)setFighters(fr.data as KombatFighter[]);
  setLoading(false);
 })();return()=>{live=false}},[]);
 const fMap=useMemo(()=>Object.fromEntries(fighters.map(f=>[f.id,f])),[fighters]);
 const rivalries=useMemo(()=>{
  const groups=new Map<string,Row[]>();
  rows.forEach(m=>{if(!m.player_one_id||!m.player_two_id||m.player_one_id===m.player_two_id)return;const k=pairKey(m.player_one_id,m.player_two_id);if(!groups.has(k))groups.set(k,[]);groups.get(k)!.push(m)});
  const out:Rivalry[]=[];
  groups.forEach((ms,key)=>{
   if(ms.length<3)return;
   const first=ms[0],same=first.player_one_id<first.player_two_id,one=same?first.player_one_id:first.player_two_id,two=same?first.player_two_id:first.player_one_id;
   let oneWins=0,twoWins=0,lastWinner:string|null=null,streak=0;
   ms.forEach(m=>{const w=m.winner_id;if(w===one)oneWins++;if(w===two)twoWins++});
   const last=ms[0];lastWinner=last.winner_id||null;
   for(const m of ms){if(!m.winner_id||m.winner_id!==lastWinner)break;streak++}
   const f1=first.player_one_id===one?first.fighter_one_id:first.fighter_two_id;
   const f2=first.player_one_id===two?first.fighter_one_id:first.fighter_two_id;
   out.push({key,one,two,oneName:players[one]?.username||"Player",twoName:players[two]?.username||"Player",oneFighter:f1, twoFighter:f2,oneFighterName:fMap[f1]?.name||"Fighter",twoFighterName:fMap[f2]?.name||"Fighter",oneWins,twoWins,meetings:ms,last:dateOf(last),lastWinner,streak});
  });
  return out;
 },[rows,players,fMap]);
 const sorted=useMemo(()=>{let list=[...rivalries];if(tab==="mine"){if(!userId)return [];list=list.filter(r=>r.one===userId||r.two===userId)}
  if(sort==="meetings")list.sort((a,b)=>b.meetings.length-a.meetings.length);
  else if(sort==="recent")list.sort((a,b)=>new Date(b.last||0).getTime()-new Date(a.last||0).getTime());
  else list.sort((a,b)=>{const hot=(r:Rivalry)=>{const recent=r.meetings.slice(0,7);const diff=Math.abs(recent.filter(m=>m.winner_id===r.one).length-recent.filter(m=>m.winner_id===r.two).length);return recent.length>=7&&diff<=1?3:recent.length>=5&&diff<=2?2:Math.abs(r.oneWins-r.twoWins)<=1?1:0};return hot(b)-hot(a)||b.meetings.length-a.meetings.length});
  return list;
 },[rivalries,tab,sort,userId]);
 const hottest=sorted[0]||null;
 const status=(r:Rivalry)=>{const recent=r.meetings.slice(0,7),a=recent.filter(m=>m.winner_id===r.one).length,b=recent.filter(m=>m.winner_id===r.two).length;if(recent.length>=5&&Math.abs(a-b)<=1)return "HEATED";if(recent.length>=4&&Math.abs(a-b)<=2)return "ONGOING";if(Math.max(a,b)/Math.max(1,recent.length)>=.75)return "ONE-SIDED";return "ONGOING"};
 const strip=(r:Rivalry)=><div className="kombat-rivalry-strip">{r.meetings.slice(0,7).reverse().map((m,i)=><i key={m.id} className={m.winner_id===r.one?"left":m.winner_id===r.two?"right":"draw"}/>)}</div>;
 const card=(r:Rivalry,featured=false)=><article className={"kombat-rivalry-card "+(featured?"featured":"")} key={r.key}>
  <div className="kombat-rivalry-card-meta"><span className={"kombat-rivalry-status "+status(r).toLowerCase()}>{status(r)}</span><small>{r.meetings.length} MEETINGS · LAST {labelDate(r.last)}</small></div>
  <div className="kombat-rivalry-versus">
   <div className="kombat-rivalry-player"><FighterTile slug={fMap[r.oneFighter]?.slug||"scorpion"} name={r.oneFighterName} imageSrc={fMap[r.oneFighter]?.image_src} size="compare"/><b>{r.oneName}</b><small>{r.oneFighterName}</small></div>
   <div className="kombat-rivalry-score"><strong>{r.oneWins}–{r.twoWins}</strong><small>{featured?"LAST 7 MEETINGS":"HEAD TO HEAD"}</small></div>
   <div className="kombat-rivalry-player"><FighterTile slug={fMap[r.twoFighter]?.slug||"sub-zero"} name={r.twoFighterName} imageSrc={fMap[r.twoFighter]?.image_src} size="compare"/><b>{r.twoName}</b><small>{r.twoFighterName}</small></div>
  </div>
  {strip(r)}
  <p className="kombat-rivalry-last">{r.lastWinner?(players[r.lastWinner]?.username||"A player")+" won the last meeting · "+labelDate(r.last):"Last result unavailable"}</p>
  <div className="kombat-rivalry-card-actions"><button type="button" onClick={()=>setExpanded(expanded===r.key?null:r.key)}>{expanded===r.key?"HIDE MEETINGS":"ALL MEETINGS"}</button><button type="button" className="primary" onClick={()=>setExpanded(expanded===r.key?null:r.key)}>{expanded===r.key?"CLOSE RIVALRY":"VIEW RIVALRY"}</button></div>{expanded===r.key&&<div className="kombat-rivalry-meeting-list">{r.meetings.map((m,i)=><div key={m.id}><span>MEETING {r.meetings.length-i}</span><b>{players[m.winner_id]?.username||"Result pending"} won</b><small>{labelDate(dateOf(m))}</small></div>)}</div>}
 </article>;
 return <KombatPageShell active="rivalries" title="KOMBAT"><div className="kombat-rivalries-page">
  <header className="kombat-rivalries-intro"><small>MORTAL KOMBAT 11 · RECURRING MATCHUPS</small><h1>KOMBAT <em>RIVALRIES</em></h1><p>Players who keep meeting. A rivalry starts after 3 ranked meetings. Casual matches don't count.</p></header>
  <div className="kombat-rivalries-tabs"><button className={tab==="all"?"active":""} onClick={()=>setTab("all")}>ALL RIVALRIES</button><button className={tab==="mine"?"active":""} onClick={()=>setTab("mine")}>MY RIVALRIES</button></div>
  <div className="kombat-rivalries-sorts">{([{id:"hottest",label:"HOTTEST"},{id:"meetings",label:"MOST MEETINGS"},{id:"recent",label:"RECENT"}] as const).map(s=><button className={sort===s.id?"active":""} key={s.id} onClick={()=>setSort(s.id)}>{s.label}</button>)}</div>
  {loading?<div className="kombat-rivalry-empty">Loading rivalries…</div>:error?<div className="kombat-rivalry-empty">{error}</div>:unavailable?<div className="kombat-rivalry-empty"><b>KOMBAT MATCH DATA NOT CONNECTED</b><p>Rivalries will appear after ranked Mortal Kombat matches are connected. Casual matches never count.</p></div>:sorted.length===0?<div className="kombat-rivalry-empty"><b>{tab==="mine"&&!userId?"Sign in to see your rivalries":"No rivalries yet"}</b><p>{tab==="mine"?"Your ranked head-to-heads will appear here once you have at least three meetings.":"A rivalry begins when the same two players meet in at least three ranked matches."}</p></div>:<>
   {hottest&&<section className="kombat-rivalry-feature"><div className="kombat-rivalry-feature-head"><small>RIVALRY OF THE WEEK</small><span>{status(hottest)}</span></div>{card(hottest,true)}</section>}
   <div className="kombat-rivalries-list-head"><h2>MORE RIVALRIES</h2><small>{sorted.length} TOTAL</small></div>
   {sorted.filter(r=>r.key!==hottest?.key).slice(0,visible).map(r=>card(r))}
   {sorted.length>(hottest?1:0)+visible&&<button className="kombat-rivalry-load" onClick={()=>setVisible(v=>v+8)}>LOAD MORE RIVALRIES</button>}
  </>}
  <section className="kombat-rivalry-legend"><small>HOW STATUS WORKS</small><p><b className="heated">HEATED</b> the last 7 meetings are within one win</p><p><b className="ongoing">ONGOING</b> a lead, but not a big one</p><p><b className="one-sided">ONE-SIDED</b> one player won 75% or more</p><div><i className="left"/> left player won · <i className="right"/> right player won · oldest to newest</div></section>
 </div></KombatPageShell>;
}
