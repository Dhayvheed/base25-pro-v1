"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {supabase} from "@/lib/supabase";
type Rating={player_id:string;weekly_rating:number;all_time_elo:number;ranked_wins:number;ranked_losses:number};
type Player={id:string;username:string;photo_url:string|null};
export default function KombatLeaderboardPage(){
 const [period,setPeriod]=useState<"weekly"|"all-time">("weekly");
 const [ratings,setRatings]=useState<Rating[]>([]);
 const [players,setPlayers]=useState<Map<string,Player>>(new Map());
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase){setLoading(false);return}
  const {data,error}=await supabase.from("kombat_ratings").select("player_id,weekly_rating,all_time_elo,ranked_wins,ranked_losses").order(period==="weekly"?"weekly_rating":"all_time_elo",{ascending:false});
  if(!active)return;const rows=error?[]:(data||[]) as Rating[];setRatings(rows);
  const ids=rows.map(x=>x.player_id);if(ids.length){const p=await supabase.from("players").select("id,username,photo_url").in("id",ids);if(active)setPlayers(new Map(((p.data||[]) as Player[]).map(x=>[x.id,x])))}else setPlayers(new Map());
  setLoading(false);
 }setLoading(true);load();return()=>{active=false}},[period]);
 return <KombatPageShell active="leaderboard"><section className="kb-hero"><div className="kb-eyebrow">MORTAL KOMBAT 11 · BASE25 PRO</div><h1>THE FIGHTERS’<br/>LEADERBOARD</h1><p>Rankings are built from published Kombat records. No match, no rank.</p></section>
 <div className="kb-tabs"><button className={period==="weekly"?"active":""} onClick={()=>setPeriod("weekly")}>WEEKLY</button><button className={period==="all-time"?"active":""} onClick={()=>setPeriod("all-time")}>ALL-TIME</button></div>
 <section className="kb-panel"><h2>{period==="weekly"?"WEEKLY RANKINGS":"ALL-TIME RANKINGS"}</h2>
 {loading?<div className="kb-empty">Loading official Kombat records…</div>:ratings.length===0?<div className="kb-empty"><strong>THE BOARD IS STILL EMPTY.</strong>No published Kombat matches have been recorded yet. The first fight will create the first ranking.</div>:
 <div style={{overflowX:"auto"}}><table className="kb-table"><thead><tr><th>RANK</th><th>FIGHTER</th><th>W / L</th><th>MATCHES</th><th>RATING</th></tr></thead><tbody>{ratings.map((r,i)=>{const p=players.get(r.player_id);return <tr key={r.player_id}><td className="kb-rank">#{i+1}</td><td><Link className="kb-player" href={"/kombat/players/"+r.player_id}><span className="kb-avatar">{p?.photo_url?<img src={p.photo_url} alt=""/>:(p?.username||"?").slice(0,1).toUpperCase()}</span><b>{p?.username||"Fighter"}</b></Link></td><td>{r.ranked_wins} / {r.ranked_losses}</td><td>{r.ranked_wins+r.ranked_losses}</td><td className="kb-rank">{(period==="weekly"?r.weekly_rating:r.all_time_elo).toLocaleString("en-NG")}</td></tr>})}</tbody></table></div>}</section>
 </KombatPageShell>;
}
