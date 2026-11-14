"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Champion = { id:string; week_start:string; week_end:string; player_id:string; players?:{username:string;player_code:string;photo_url:string|null}|null };

export default function HallOfFamePage(){
 const [champions,setChampions]=useState<Champion[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Hall of Fame is temporarily unavailable.");setLoading(false);return;}
  const {data,error}=await supabase.from("weekly_champions").select("id,week_start,week_end,player_id,players(username,player_code,photo_url)").order("week_start",{ascending:false}).limit(100);
  if(!active)return;
  if(error)setError(error.message);
  setChampions((data||[]) as unknown as Champion[]);
  setLoading(false);
 }load();return()=>{active=false;};},[]);
 return <main className="shell redesign-shell">
  <SiteNavigation />
  <section className="section redesign-section">
   <div className="eyebrow">BASE25 PRO / LEGACY</div><h1>Hall of Fame<span>.</span></h1>
   <p className="muted">Every Saturday Final Champion earns a permanent place in BASE25 history.</p>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="muted">Loading champions...</p>:champions.length===0?<div className="admin-card"><h2>The first champion is waiting.</h2><p className="muted">Saturday Final winners will appear here after they are recorded.</p></div>:<>
    <div className="eyebrow" style={{marginTop:28}}>LATEST CHAMPION</div>
    <div className="admin-card hall-of-fame-feature">
     <div className="eyebrow">CHAMPION #{String(champions.length).padStart(3,"0")}</div>
     <div className="leader-player"><span className="avatar">{champions[0].players?.photo_url?<img src={champions[0].players.photo_url} alt=""/>:champions[0].players?.username?.[0]||"?"}</span><span><b>{champions[0].players?.username||"Champion"}</b><small>{champions[0].players?.player_code||""}</small></span></div>
     <h2>Saturday Champion</h2><p className="muted">{new Date(champions[0].week_start+"T00:00:00").toLocaleDateString()} – {new Date(champions[0].week_end+"T00:00:00").toLocaleDateString()}</p>
    </div>
    <div className="eyebrow" style={{marginTop:38}}>CHAMPIONSHIP HISTORY · NEWEST FIRST</div>
    <div className="leaderboard-card hall-of-fame-history">{champions.map((ch,index)=><div className="leader-row" key={ch.id}><span className="leader-rank">#{String(champions.length-index).padStart(3,"0")}</span><span className="leader-player"><span className="avatar">{ch.players?.photo_url?<img src={ch.players.photo_url} alt=""/>:ch.players?.username?.[0]||"?"}</span><span><b>{ch.players?.username||"Champion"}</b><small>{ch.players?.player_code||"BASE25"} · {new Date(ch.week_start+"T00:00:00").toLocaleDateString()} – {new Date(ch.week_end+"T00:00:00").toLocaleDateString()}</small></span></span><strong className="leader-rating">{index===0?"LATEST":"CHAMPION"}</strong></div>)}</div>
   </>}
  </section>
 </main>;
}
