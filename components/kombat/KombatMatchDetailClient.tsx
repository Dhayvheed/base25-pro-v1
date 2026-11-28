"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {FighterTile} from "@/components/kombat/KombatUI";
import {FEATURED_ROSTER_FALLBACK} from "@/lib/kombat/data";
import type {KombatFighter} from "@/lib/kombat/types";

type Row=Record<string,any>&{id:string};
type Player={id:string;username:string;player_code?:string|null;photo_url?:string|null};
const first=(...values:any[])=>values.find(v=>v!==undefined&&v!==null);
const dateOf=(m:Row)=>first(m.published_at,m.played_at,m.created_at);
const gamesOf=(m:Row):any[]=>{const v=first(m.games,m.game_scores,m.rounds,m.match_games);return Array.isArray(v)?v:[]};
const scoreOf=(m:Row,s:"one"|"two")=>first(m["player_"+s+"_score"],m["fighter_"+s+"_score"],m[s+"_score"]);
const changeOf=(m:Row,s:"one"|"two")=>{const direct=first(m["player_"+s+"_elo_change"],m["fighter_"+s+"_elo_change"],m["player_"+s+"_rating_change"]);if(direct!==undefined)return Number(direct);const before=first(m["player_"+s+"_elo_before"],m["player_"+s+"_rating_before"]),after=first(m["player_"+s+"_elo_after"],m["player_"+s+"_rating_after"]);return before!=null&&after!=null?Number(after)-Number(before):null};
const edited=(m:Row)=>Boolean(first(m.is_edited,m.edited,m.edited_at,m.correction_note,false));
const dateLabel=(v:string)=>new Date(v).toLocaleString("en-GB",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
const signed=(n:number)=>n>0?"+"+n:String(n);
export default function KombatMatchDetailClient(){
 const params=useParams<{id:string}>(),id=params.id;
 const [match,setMatch]=useState<Row|null>(null),[players,setPlayers]=useState<Record<string,Player>>({}),[fighters,setFighters]=useState<KombatFighter[]>(FEATURED_ROSTER_FALLBACK);
 const [rivalry,setRivalry]=useState<number|null>(null),[loading,setLoading]=useState(true),[unavailable,setUnavailable]=useState(false),[error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{
  if(!supabase){setUnavailable(true);setLoading(false);return}
  const result=await supabase.from("kombat_matches").select("*").eq("id",id).maybeSingle();
  if(!live)return;
  if(result.error){if(["42P01","PGRST205"].includes(result.error.code||""))setUnavailable(true);else setError("We couldn't load this match.");setLoading(false);return}
  if(!result.data){setLoading(false);return}
  const m=result.data as Row;setMatch(m);
  const playerIds=[m.player_one_id,m.player_two_id].filter(Boolean);
  const fighterIds=[m.fighter_one_id,m.fighter_two_id].filter(Boolean);
  const [pr,fr,rr]=await Promise.all([
   playerIds.length?supabase.from("players").select("id,username,player_code,photo_url").in("id",playerIds):Promise.resolve({data:[],error:null}),
   fighterIds.length?supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,enabled,sort_order").in("id",fighterIds):Promise.resolve({data:[],error:null}),
   playerIds.length===2?supabase.from("kombat_matches").select("id").neq("id",id).or("and(player_one_id.eq."+playerIds[0]+",player_two_id.eq."+playerIds[1]+"),and(player_one_id.eq."+playerIds[1]+",player_two_id.eq."+playerIds[0]+")").is("voided_at",null):Promise.resolve({data:null,error:null})
  ]);
  if(!live)return;
  const pmap:Record<string,Player>={};(pr.data||[]).forEach((p:any)=>pmap[p.id]=p);setPlayers(pmap);
  if(fr.data?.length)setFighters(fr.data as KombatFighter[]);
  if(!rr.error)setRivalry((rr.data||[]).length+1);
  setLoading(false);
 })();return()=>{live=false}},[id]);
 const fighterMap=useMemo(()=>Object.fromEntries(fighters.map(f=>[f.id,f])),[fighters]);
 const p1=match?players[match.player_one_id]:null,p2=match?players[match.player_two_id]:null;
 const f1=match?fighterMap[match.fighter_one_id]||FEATURED_ROSTER_FALLBACK.find(f=>f.id===match.fighter_one_id):null;
 const f2=match?fighterMap[match.fighter_two_id]||FEATURED_ROSTER_FALLBACK.find(f=>f.id===match.fighter_two_id):null;
 const games=match?gamesOf(match):[];
 const s1=match?scoreOf(match,"one"):null,s2=match?scoreOf(match,"two"):null;
 const winnerId=match?.winner_id;
 const winner=winnerId===match?.player_one_id?p1:winnerId===match?.player_two_id?p2:null;
 const e1=match?changeOf(match,"one"):null,e2=match?changeOf(match,"two"):null;
 const before1=match?first(match.player_one_elo_before,match.player_one_rating_before):null,after1=match?first(match.player_one_elo_after,match.player_one_rating_after):null;
 const before2=match?first(match.player_two_elo_before,match.player_two_rating_before):null,after2=match?first(match.player_two_elo_after,match.player_two_rating_after):null;
 const isCasual=match?.match_type==="casual";
 const final=match?.is_final===true||match?.final===true||match?.status==="final"||match?.match_type==="final";
 const pot=match?first(match.pot_contribution,match.kombat_pot_contribution,match.pot_added,match.pot_amount_added):null;
 const rank1=match?first(match.player_one_weekly_rank_after,match.player_one_rank_after):null;
 const streak=match?first(match.winner_streak_after,match.winner_weekly_streak_after):null;
 const idLabel=match?first(match.match_code,match.public_id,String(match.id).slice(0,8).toUpperCase()):"";
 const fmtMoney=(n:number)=>"₦"+Number(n).toLocaleString("en-NG");
 const share=async()=>{if(!match)return;const text="BASE25 KOMBAT MATCH\n"+(p1?.username||"Player 1")+" "+(s1??"—")+" – "+(s2??"—")+" "+(p2?.username||"Player 2")+"\nWinner: "+(winner?.username||"Result pending");const url=window.location.href;if(navigator.share)await navigator.share({title:"BASE25 KOMBAT Match",text,url});else if(navigator.clipboard)await navigator.clipboard.writeText(text+"\n"+url)};
 if(loading)return <KombatPageShell active="matches" title="MATCH"><div className="kombat-detail-loading">Loading match report…</div></KombatPageShell>;
 if(unavailable)return <KombatPageShell active="matches" title="MATCH"><div className="kombat-match-detail-empty"><b>KOMBAT MATCH DATA NOT CONNECTED</b><p>This screen is ready, but the Kombat match records have not been connected yet. No Billiards results are being substituted.</p><Link href="/kombat/coming-soon/matches">BACK TO HISTORY</Link></div></KombatPageShell>;
 if(!match)return <KombatPageShell active="matches" title="MATCH"><div className="kombat-match-detail-empty"><b>{error||"MATCH NOT FOUND"}</b><p>This result may have been removed or is not published.</p><Link href="/kombat/coming-soon/matches">BACK TO HISTORY</Link></div></KombatPageShell>;
 const compareHref=f1&&f2?"/kombat/characters/compare?a="+f1.slug+"&b="+f2.slug:"/kombat/characters";
 return <KombatPageShell active="matches" title="MATCH">
  <div className="kombat-match-detail">
   <section className="kombat-md-hero">
    <div className="kombat-md-meta"><span className={isCasual?"casual":""}>{final?"FINAL":isCasual?"CASUAL":"RANKED"}</span><span>{first(match.format,match.match_format,match.series_format,"BEST OF 3")==="bo3"?"BEST OF 3":String(first(match.format,match.match_format,match.series_format,"BEST OF 3")).replaceAll("_"," ").toUpperCase()}</span><time>{dateOf(match)?dateLabel(dateOf(match)): "DATE NOT RECORDED"}</time></div>
    <div className="kombat-md-versus">
     <div className="kombat-md-contender"><div className="kombat-md-tile">{f1?<FighterTile slug={f1.slug} name={f1.name} imageSrc={f1.image_src} size="portrait"/>:<b>??</b>}</div><strong>{p1?.username||"PLAYER ONE"}</strong><small>{f1?.name||"FIGHTER NOT SET"}{winnerId===match.player_one_id?" · WINNER":""}</small></div>
     <div className="kombat-md-score"><strong>{s1??"—"}–{s2??"—"}</strong><small>SERIES</small></div>
     <div className="kombat-md-contender"><div className="kombat-md-tile blue">{f2?<FighterTile slug={f2.slug} name={f2.name} imageSrc={f2.image_src} size="portrait"/>:<b>??</b>}</div><strong>{p2?.username||"PLAYER TWO"}</strong><small>{f2?.name||"FIGHTER NOT SET"}{winnerId===match.player_two_id?" · WINNER":""}</small></div>
    </div>
   </section>
   <section className="kombat-md-panel"><div className="kombat-md-kicker">GAME BY GAME</div><h2>HOW IT WENT</h2>
    {games.length?games.map((g:any,i:number)=>{const winId=first(g.winner_id,g.won_by);const wonOne=winId===match.player_one_id;const winName=first(g.winner_name,wonOne?p1?.username:winId===match.player_two_id?p2?.username:null,"Winner not recorded");const gf=wonOne?f1:winId===match.player_two_id?f2:null;return <div className="kombat-md-game" key={g.id||i}><small>GAME {g.game_number||g.game||i+1}</small><span className="kombat-md-game-tile">{gf?<FighterTile slug={gf.slug} name={gf.name} imageSrc={gf.image_src} size="compare"/>:"?"}</span><strong>{winName} won</strong><b>{first(g.player_one_score,g.score_one,g.score,"—")} – {first(g.player_two_score,g.score_two,"—")}</b></div>}):<p className="kombat-md-muted">Game-by-game scores were not saved for this match.</p>}
    <p className="kombat-md-note">Round scores are optional and entered by the admin.</p>
   </section>
   <section className="kombat-md-panel"><div className="kombat-md-kicker">RATING CHANGE</div>
    {isCasual?<p className="kombat-md-muted">Casual matches do not change player Elo.</p>:e1!==null||e2!==null?<div className="kombat-md-rating">{[[p1?.username||"PLAYER ONE",e1,before1,after1],[p2?.username||"PLAYER TWO",e2,before2,after2]].map(([n,v,b,a]:any,i)=><div key={i}><strong>{n}</strong><b className={Number(v)>=0?"up":"down"}>{v===null?"—":signed(Number(v))}</b><small>{b!==null&&a!==null?Number(b).toLocaleString()+" → "+Number(a).toLocaleString():"Rating snapshots unavailable"}</small></div>)}</div>:<p className="kombat-md-muted">Rating changes have not been attached to this match record.</p>}
    <p className="kombat-md-note">Elo is calculated when the admin publishes a ranked match.</p>
   </section>
   <section className="kombat-md-panel"><div className="kombat-md-kicker">WHAT THIS MATCH CHANGED</div>
    {pot!==null&&<div className="kombat-md-impact"><span className="gold">♛</span><p>Added <b>{fmtMoney(Number(pot))}</b> to the Kombat pot</p></div>}
    {rank1!==null&&<div className="kombat-md-impact"><span className="red">▥</span><p>{p1?.username||"Player one"} finished at <b>#{rank1}</b> on the weekly leaderboard</p></div>}
    {streak!==null&&<div className="kombat-md-impact"><span className="red">▥</span><p>Winner's weekly streak: <b>{streak}</b></p></div>}
    {f1&&f2&&<div className="kombat-md-impact"><span>◎</span><p>{f1.name} vs {f2.name} <Link href={compareHref}>Compare →</Link></p></div>}
    {pot===null&&rank1===null&&streak===null&&<p className="kombat-md-muted">Pot and leaderboard impact details are not available in this match record.</p>}
   </section>
   <section className="kombat-md-panel kombat-md-rivalry"><div className="kombat-md-kicker">RIVALRY</div><h2>{(p1?.username||"PLAYER ONE")+" VS "+(p2?.username||"PLAYER TWO")}</h2><strong>{rivalry===null?"—":rivalry+" MATCH"+(rivalry===1?"":"ES")+" RECORDED"}</strong><small>Head-to-head count from recorded Kombat matches</small></section>
   <section className="kombat-md-panel"><div className="kombat-md-kicker">RECORD</div><p className="kombat-md-record">{first(match.recorded_by_name,match.admin_name,"Recorded and published by an admin")} · {dateOf(match)?dateLabel(dateOf(match)):"time unavailable"}</p><p className="kombat-md-record">Match ID {idLabel} · {edited(match)?"Edited by admin":"Never edited"}</p>{edited(match)&&match.edited_at&&<p className="kombat-md-record">Last corrected {dateLabel(match.edited_at)}</p>}</section>
   <div className="kombat-md-actions"><button onClick={share}>SHARE MATCH</button><Link href="/kombat/coming-soon/matches">BACK TO HISTORY</Link></div>
  </div>
 </KombatPageShell>;
}
