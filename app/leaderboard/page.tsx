"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Player = { id:string; player_code:string; username:string; photo_url:string|null; elo_rating:number; highest_elo?:number; matches_played:number; wins:number; losses:number; win_percentage:number };
type Champion = { id:string; week_start:string; week_end:string; player_id:string; players?:{username:string;player_code:string;photo_url:string|null}|null };
type Period = "this_week"|"last_week"|"last_month"|"all_time";
export default function LeaderboardPage(){
 const [players,setPlayers]=useState<Player[]>([]),[search,setSearch]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [period,setPeriod]=useState<Period>("this_week");
 const [champions,setChampions]=useState<Champion[]>([]);
 useEffect(()=>{let active=true;async function load(){if(!supabase){setError("Leaderboard is temporarily unavailable.");setLoading(false);return;}setLoading(true);setError("");
 const leaderboardRequest=period==="all_time"
 ? supabase.from("player_public_leaderboard").select("id,player_code,username,photo_url,elo_rating,highest_elo,matches_played,wins,losses,win_percentage").order("elo_rating",{ascending:false})
 : supabase.rpc("get_period_leaderboard",{p_period:period});
 const [{data,error},{data:hall,error:hallError}]=await Promise.all([leaderboardRequest,supabase.from("weekly_champions").select("id,week_start,week_end,player_id,players(username,player_code,photo_url)").order("week_start",{ascending:false}).limit(100)]);
 if(!active)return;if(error)setError(error.message);if(hallError)setError(hallError.message);
 setPlayers((data||[]) as Player[]);setChampions((hall||[]) as unknown as Champion[]);setLoading(false);}load();return()=>{active=false;};},[period]);
 const filtered=players.filter(p=>(p.username+" "+p.player_code).toLowerCase().includes(search.toLowerCase()));
 const isWeekly=period==="this_week";
 
 return <main className="shell redesign-shell"><SiteNavigation /><section className="section redesign-section"><div className="eyebrow">BASE25 PRO / PLAYER RANKINGS</div><h1>Leaderboard<span>.</span></h1><p className="muted">Weekly points reset every Monday. Career ratings, match history and player records remain permanent.</p>
 <div className="two-fields" style={{maxWidth:680,margin:"22px 0",display:"flex",flexWrap:"wrap",gap:8}}>{(["this_week","last_week","last_month","all_time"] as Period[]).map(value=><button key={value} type="button" className={period===value?"":"secondary"} onClick={()=>setPeriod(value)}>{value==="this_week"?"This Week":value==="last_week"?"Last Week":value==="last_month"?"Last Month":"All Time"}</button>)}</div>
 {isWeekly&&players.length>0&&<div className="admin-card" style={{marginBottom:18}}><div className="eyebrow">WEEKLY LEADER</div><h2>{players[0].username}</h2><p className="muted">Currently leading the weekly standings. The top five qualify for the Saturday final.</p></div>}
 <section className="section redesign-section hall-of-fame-section"><div className="eyebrow">HALL OF FAME</div><h2>Saturday Final Champions<span>.</span></h2><p className="muted">The latest Saturday Champion earns the spotlight. Explore the full championship history.</p>{champions.length===0?<p className="muted">No Saturday final champions recorded yet.</p>:<Link href="/hall-of-fame" className="leaderboard-card hall-of-fame-card hall-of-fame-latest"><span className="leader-rank">♛</span><span className="leader-player"><span className="avatar">{champions[0].players?.photo_url?<img src={champions[0].players.photo_url} alt=""/>:champions[0].players?.username?.[0]||"?"}</span><span><b>{champions[0].players?.username||"Champion"}</b><small>{new Date(champions[0].week_start+"T00:00:00").toLocaleDateString()} – {new Date(champions[0].week_end+"T00:00:00").toLocaleDateString()}</small></span></span><strong className="leader-rating">LATEST CHAMPION</strong><span className="hall-of-fame-toggle">VIEW HALL OF FAME →</span></Link>}</section>

 <label className="redesign-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a player..."/></label>{error&&<p className="notice">{error}</p>}{loading?<p className="muted">Loading rankings...</p>:<div className="leaderboard-card"><div className="leaderboard-columns full-leaderboard-columns"><span>#</span><span>PLAYER</span><span>{period==="all_time"?"WIN RATE":"RECORD"}</span><span>RATING</span></div>{filtered.map(p=>{const rank=players.findIndex(x=>x.id===p.id)+1;return <Link className={`leader-row full-leaderboard-row ${rank===1?"leader-first":""}`} href={`/players/${p.id}`} key={p.id}><span className={`leader-rank rank-${rank}`}>{rank<=3?<b className="crown">♛</b>:null}{rank}</span><span className="leader-player"><span className="avatar">{p.photo_url?<img src={p.photo_url} alt=""/>:p.username[0]}</span><span><b>{p.username}</b><small>{p.player_code}{isWeekly&&rank<=5?" · SATURDAY FINAL QUALIFIER":""}{period==="all_time"&&p.highest_elo? " · Peak "+p.highest_elo:""}</small></span></span><strong className="leader-win-rate">{period==="all_time"?Number(p.win_percentage||0).toFixed(1)+"%":p.wins+"W / "+p.losses+"L"}</strong><strong className="leader-rating">{p.elo_rating.toLocaleString()}</strong></Link>})}{filtered.length===0&&<p className="muted">No players found.</p>}</div>}

 </section></main>;
}
