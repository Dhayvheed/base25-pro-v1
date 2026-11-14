"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Archive = { id:string; week_start:string; week_end:string; snapshot_at:string; entries?: Entry[] };
type Entry = { player_id:string; rank:number; username:string; player_code:string|null; photo_url:string|null; weekly_elo:number; matches_played:number; wins:number; losses:number; win_percentage:number };
export default function WeeklyArchivePage(){
 const [archives,setArchives]=useState<Archive[]>([]);
 const [selected,setSelected]=useState<string>("");
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Archive is temporarily unavailable.");setLoading(false);return;}
  const {data,error}=await supabase.from("weekly_leaderboard_archives").select("id,week_start,week_end,snapshot_at").order("week_start",{ascending:false});
  if(!active)return;
  if(error)setError(error.message);
  setArchives((data||[]) as Archive[]);
  if(data?.length)setSelected(data[0].id);
  setLoading(false);
 }load();return()=>{active=false;};},[]);
 useEffect(()=>{let active=true;async function loadEntries(){
  if(!supabase||!selected)return;
  const {data,error}=await supabase.from("weekly_leaderboard_archive_entries").select("player_id,rank,username,player_code,photo_url,weekly_elo,matches_played,wins,losses,win_percentage").eq("archive_id",selected).order("rank",{ascending:true});
  if(!active)return;
  if(error){setError(error.message);return;}
  setArchives(current=>current.map(a=>a.id===selected?{...a,entries:(data||[]) as Entry[]}:a));
 }loadEntries();return()=>{active=false;};},[selected]);
 const current=archives.find(a=>a.id===selected);
 return <main className="shell redesign-shell">
  <SiteNavigation />
  <section className="section redesign-section">
   <div className="eyebrow">BASE25 PRO / COMPETITION RECORDS</div><h1>Weekly Archive<span>.</span></h1>
   <p className="muted">Every completed week, preserved exactly as the standings looked when the Saturday Champion was recorded.</p>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="muted">Loading archived weeks...</p>:archives.length===0?<div className="admin-card"><h2>No archived weeks yet.</h2><p className="muted">The first archive is created automatically when the owner records that week's Saturday Champion.</p></div>:<>
    <label className="form" style={{maxWidth:420,margin:"24px 0"}}>Choose a week<select value={selected} onChange={e=>setSelected(e.target.value)}>{archives.map(a=><option key={a.id} value={a.id}>{new Date(a.week_start+"T00:00:00").toLocaleDateString()} – {new Date(a.week_end+"T00:00:00").toLocaleDateString()}</option>)}</select></label>
    {current&&<><div className="admin-card"><div className="eyebrow">FROZEN STANDINGS</div><h2>{new Date(current.week_start+"T00:00:00").toLocaleDateString()} – {new Date(current.week_end+"T00:00:00").toLocaleDateString()}</h2><p className="muted">Snapshot saved {new Date(current.snapshot_at).toLocaleString()}. These results do not change when new matches are played.</p></div>
     <div className="leaderboard-card"><div className="leaderboard-columns full-leaderboard-columns"><span>#</span><span>PLAYER</span><span>RECORD</span><span>WEEKLY ELO</span></div>{(current.entries||[]).map(p=><Link className={"leader-row full-leaderboard-row "+(p.rank===1?"leader-first":"")} href={"/players/"+p.player_id} key={p.player_id}><span className={"leader-rank rank-"+p.rank}>{p.rank===1?<b className="crown">♛</b>:null}{p.rank}</span><span className="leader-player"><span className="avatar">{p.photo_url?<img src={p.photo_url} alt=""/>:p.username?.[0]||"?"}</span><span><b>{p.username}</b><small>{p.player_code||"BASE25 Player"}{p.rank<=5?" · TOP 5 QUALIFIER":""}</small></span></span><strong className="leader-win-rate">{p.wins}W / {p.losses}L</strong><strong className="leader-rating">{p.weekly_elo.toLocaleString()}</strong></Link>)}</div>
    </>}
   </>}
  </section>
 </main>;
}
