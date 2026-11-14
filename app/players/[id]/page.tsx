"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Rack={id:string;match_id:string;rack_number:number;winner_id:string;loser_id:string;loser_balls_remaining:number;black_ball_finish:boolean};
export default function PlayerProfile(){
 const {id}=useParams<{id:string}>();
 const [player,setPlayer]=useState<any>(null),[matches,setMatches]=useState<any[]>([]),[racksByMatch,setRacksByMatch]=useState<Record<string,Rack[]>>({});
 const [rank,setRank]=useState(0),[loading,setLoading]=useState(true),[range,setRange]=useState("10"),[activePoint,setActivePoint]=useState<number|null>(null);
 const [currentWeek,setCurrentWeek]=useState<any>(null),[currentWeekRank,setCurrentWeekRank]=useState(0),[weeklyHistory,setWeeklyHistory]=useState<any[]>([]),[championHistory,setChampionHistory]=useState<any[]>([]);
 useEffect(()=>{async function load(){
  if(!supabase){setLoading(false);return;}
  const [{data:profile},{data:games,error:gamesError},{data:board},{data:weekBoard},{data:archiveRows},{data:champions}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").eq("id",id).single(),
   supabase.from("matches").select("*,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)").or(`player_one_id.eq.${id},player_two_id.eq.${id}`).order("played_at",{ascending:false}),
   supabase.from("player_public_leaderboard").select("id,elo_rating").order("elo_rating",{ascending:false}),
   supabase.rpc("get_period_leaderboard",{p_period:"this_week"}),
   supabase.from("weekly_leaderboard_archive_entries").select("rank,weekly_elo,matches_played,wins,losses,win_percentage,archive:weekly_leaderboard_archives(week_start,week_end)").eq("player_id",id).order("rank",{ascending:true}),
   supabase.from("weekly_champions").select("id,week_start,week_end").eq("player_id",id).order("week_start",{ascending:false})
  ]);
  setPlayer(profile);setCurrentWeek((weekBoard||[]).find((p:any)=>p.id===id)||null);setCurrentWeekRank((weekBoard||[]).findIndex((p:any)=>p.id===id)+1);setWeeklyHistory(archiveRows||[]);setChampionHistory(champions||[]);if(gamesError)console.error("Could not load player matches:",gamesError);
  const rows=games||[];setMatches(rows);setRank((board||[]).findIndex((p:any)=>p.id===id)+1);
  if(rows.length){const {data:rackRows,error:rackError}=await supabase.from("match_racks").select("id,match_id,rack_number,winner_id,loser_id,loser_balls_remaining,black_ball_finish").in("match_id",rows.map((m:any)=>m.id)).order("rack_number",{ascending:true});
   if(rackError)console.error("Could not load rack details:",rackError);
   const grouped:Record<string,Rack[]>={};(rackRows||[]).forEach((rack:Rack)=>{if(!grouped[rack.match_id])grouped[rack.match_id]=[];grouped[rack.match_id].push(rack)});setRacksByMatch(grouped);
  }
  setLoading(false);
 }load();},[id]);
 const progression=useMemo(()=>{
  const ordered=[...matches].reverse();
  const values=ordered.map((m:any)=>m.player_one_id===id?Number(m.player_one_elo_after):Number(m.player_two_elo_after)).filter(Number.isFinite);
  const selected=range==="all"?values:values.slice(-Number(range));
  if(!selected.length)return [Number(player?.elo_rating??1000),Number(player?.elo_rating??1000)];
  return selected;
 },[matches,id,range,player,]);
 const min=Math.min(950,...progression)-25,max=Math.max(1050,...progression)+25,span=max-min||100;
 const points=progression.map((v,i)=>({x:42+(i/(Math.max(1,progression.length-1)))*910,y:170-((v-min)/span)*145}));
 const line=points.map((p,i)=>(i?"L":"M")+p.x+" "+p.y).join(" ");
 const area=line+" L "+points[points.length-1].x+" 178 L "+points[0].x+" 178 Z";
 if(loading)return <main className="shell">Loading player...</main>;
 if(!player)return <main className="shell redesign-shell"><Link href="/">← Leaderboard</Link><h1>Player not found</h1></main>;
 const elo=Number(player.elo_rating)||1000;
 const shareProfile=async()=>{const text=`BASE25 PRO PLAYER CARD\\n@${player.username} · ${player.player_code}\\nELO: ${elo.toLocaleString()}\\nCareer record: ${player.wins??0}W / ${player.losses??0}L\\nWin rate: ${player.win_percentage??0}%`;if(navigator.share)await navigator.share({title:"BASE25 PRO Player Profile",text,url:location.href});else await navigator.clipboard.writeText(text);};

 return <main className="shell redesign-shell player-profile-page">
  <SiteNavigation />
  <section className="player-profile-hero">
   <div className="player-identity"><div className="profile-avatar">{player.photo_url?<img src={player.photo_url} alt=""/>:player.username?.[0]?.toUpperCase()}</div><div className="profile-name"><small>{player.player_code}</small><h1>@{player.username}</h1><span className="player-tag">PLAYER</span></div><button type="button" className="profile-share-button" onClick={shareProfile}>↗ SHARE PLAYER CARD</button></div>
   <div className="profile-pool-art" aria-hidden="true"><div className="profile-art-light"></div><i className="profile-cue-ball"></i><i className="profile-ball pball1"></i><i className="profile-ball pball2"></i><i className="profile-ball pball3"></i><i className="profile-ball pball4"></i><i className="profile-cue-stick"></i></div>
  </section>
  <section className="elo-rank-panel"><div className="current-elo"><small>CURRENT ELO</small><strong>{elo.toLocaleString()}</strong></div><div className="rank-display"><span className="laurel">❧</span><div><small>RANK</small><strong>#{rank>0?rank:"—"}</strong></div><span className="laurel mirror">❧</span></div></section>
  <section className="profile-stat-grid">
   <div><span className="profile-stat-icon">▱</span><small>MATCHES</small><strong>{player.matches_played??0}</strong></div>
   <div><span className="profile-stat-icon">♜</span><small>WINS / LOSSES</small><strong>{player.wins??0} / {player.losses??0}</strong></div>
   <div><span className="profile-stat-icon">◎</span><small>WIN RATE</small><strong>{player.win_percentage??0}%</strong></div>
   <div><span className="profile-stat-icon">↗</span><small>HIGHEST ELO</small><strong>{Number(player.highest_elo??elo).toLocaleString()}</strong></div>
  </section>

  <section className="admin-card player-career-panel">
   <div className="eyebrow">CURRENT WEEK</div><h2>Weekly performance<span>.</span></h2>
   <div className="profile-stat-grid">
    <div><small>WEEKLY POSITION</small><strong>#{currentWeekRank||"—"}</strong></div>
    <div><small>WEEKLY ELO</small><strong>{Number(currentWeek?.elo_rating??1000).toLocaleString()}</strong></div>
    <div><small>WEEKLY MATCHES</small><strong>{currentWeek?.matches_played??0}</strong></div>
    <div><small>WEEKLY W / L</small><strong>{currentWeek?currentWeek.wins+" / "+currentWeek.losses:"0 / 0"}</strong></div>
   </div>
   <div className="eyebrow">CAREER RECORD · ALL TIME</div>
   <div className="profile-stat-grid">
    <div><small>CAREER ELO</small><strong>{elo.toLocaleString()}</strong></div>
    <div><small>CAREER MATCHES</small><strong>{player.matches_played??0}</strong></div>
    <div><small>CAREER W / L</small><strong>{player.wins??0} / {player.losses??0}</strong></div>
    <div><small>PEAK ELO</small><strong>{Number(player.highest_elo??elo).toLocaleString()}</strong></div>
   </div>
  </section>
  <section className="admin-card player-career-panel">
   <div className="profile-achievement-strip"><div><span>♛</span><b>{championHistory.length}</b><small>CHAMPION TITLES</small></div><div><span>✦</span><b>{weeklyHistory.filter((r:any)=>r.rank===1).length}</b><small>WEEKLY WINS</small></div><div><span>⌑</span><b>{weeklyHistory.filter((r:any)=>r.rank<=5).length}</b><small>TOP 5 FINISHES</small></div><div><span>↗</span><b>{Number(player.highest_elo??elo).toLocaleString()}</b><small>PEAK ELO</small></div></div><div className="eyebrow">COMPETITION RECORD</div><h2>Achievements<span>.</span></h2>
   <div className="profile-stat-grid">
    <div><small>WEEKLY TOP 5</small><strong>{weeklyHistory.filter((r:any)=>r.rank<=5).length}</strong></div>
    <div><small>WEEKLY LEADER</small><strong>{weeklyHistory.filter((r:any)=>r.rank===1).length}</strong></div>
    <div><small>SATURDAY CHAMPION</small><strong>{championHistory.length}</strong></div>
    <div><small>BEST WEEKLY RANK</small><strong>{weeklyHistory.length?"#"+Math.min(...weeklyHistory.map((r:any)=>r.rank)):"—"}</strong></div>
   </div>
   <div className="eyebrow">WEEKLY RANKING HISTORY</div>
   {weeklyHistory.length===0?<p className="muted">No archived competition weeks yet. Your history will appear here as weekly archives are created.</p>:<div className="match-list">{weeklyHistory.map((r:any,i:number)=><div className="match" key={i}><b>Week of {new Date(r.archive.week_start+"T00:00:00").toLocaleDateString()}</b><span>Rank #{r.rank} · {r.weekly_elo} ELO · {r.matches_played} matches · {r.wins}W / {r.losses}L</span></div>)}</div>}
   <div className="eyebrow">SATURDAY FINAL TITLES</div>
   {championHistory.length===0?<p className="muted">No Saturday Champion titles recorded yet.</p>:championHistory.map((r:any)=><div className="match" key={r.id}><b>Saturday Champion</b><span>Week of {new Date(r.week_start+"T00:00:00").toLocaleDateString()}</span></div>)}
  </section>
  <section className="elo-chart-card">
   <div className="elo-chart-heading"><h2>ELO PROGRESSION <span title="Shows your rating after each recorded match">ⓘ</span></h2><select value={range} onChange={e=>setRange(e.target.value)}><option value="10">Last 10 matches</option><option value="5">Last 5 matches</option><option value="all">All matches</option></select></div>
   <div className="elo-chart"><div className="chart-labels"><span>{Math.ceil(max).toLocaleString()}</span><span>{Math.round((max+min)/2).toLocaleString()}</span><span>{elo.toLocaleString()}</span><span>{Math.floor(min).toLocaleString()}</span></div><svg viewBox="0 0 1000 190" preserveAspectRatio="none" role="img" aria-label="Tap a point to reveal its ELO value"><defs><linearGradient id="eloFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b9f52d" stopOpacity=".38"/><stop offset="100%" stopColor="#b9f52d" stopOpacity="0"/></linearGradient></defs>{[25,72,119,166].map(y=><line key={y} x1="30" x2="980" y1={y} y2={y} stroke="#27302a" strokeWidth="1"/>)}<path d={area} fill="url(#eloFill)"/><path d={line} fill="none" stroke="#b9f52d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>{points.map((p,i)=><g key={i} role="button" tabIndex={0} aria-label={`Match ${i+1}: ELO ${progression[i].toLocaleString()}`} style={{cursor:"pointer",touchAction:"manipulation"}} onClick={()=>setActivePoint(activePoint===i?null:i)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActivePoint(activePoint===i?null:i)}}}><circle cx={p.x} cy={p.y} r="24" fill="transparent"/><circle cx={p.x} cy={p.y} r={activePoint===i?10:7} fill="#b9f52d" stroke={activePoint===i?"#f3ffd2":"#b9f52d"} strokeWidth={activePoint===i?3:1} pointerEvents="none"/></g>)}</svg></div>
   {activePoint!==null&&<div className="elo-value-reveal"><span>{matches.length===0?"Current rating":`Match ${activePoint+1}`}</span><strong>{progression[activePoint].toLocaleString()} ELO</strong><button type="button" onClick={()=>setActivePoint(null)} aria-label="Close ELO value">×</button></div>}
  </section>
  <section className="profile-match-section"><div className="eyebrow">MATCH RECORD</div><h2>All matches<span>.</span></h2>
   {matches.length===0?<div className="matches-empty"><div className="ball-rack">○<br/>○ ○<br/>○ ○ ○</div><b>No matches yet</b><p>Matches will appear here once they are recorded.</p></div>:
    <div className="match-list profile-match-list">{matches.map(match=>{
     const isOne=match.player_one_id===id,opponent=isOne?match.two:match.one,didWin=match.winner_id===id,racks=racksByMatch[match.id]||[];
     const after=Number(isOne?match.player_one_elo_after:match.player_two_elo_after),before=Number(isOne?match.player_one_elo_before:match.player_two_elo_before),net=after-before;
     const bonus=racks.reduce((n,r)=>r.winner_id===id&&!r.black_ball_finish?n+Math.min(r.loser_balls_remaining,7):n,0),adjustment=net-bonus;
     const fmt=(n:number)=>(n>0?"+":"")+n;
     return <article className="match match-detail profile-match" key={match.id}><div className="match-summary"><div><b className={didWin?"win-text":"loss-text"}>{didWin?"WIN":"LOSS"}</b><small>vs @{opponent?.username} · {opponent?.player_code}</small></div><strong>{match.player_one_score} — {match.player_two_score}</strong><div className="right"><b>{after.toLocaleString()} ELO</b><small className={adjustment>=0?"elo-positive":"elo-negative"}>Match: {fmt(adjustment)}</small><small className="elo-positive">Rack bonus: {fmt(bonus)}</small><small className={net>=0?"elo-positive":"elo-negative"}>Net change: {fmt(net)}</small></div><time>{new Date(match.played_at).toLocaleDateString()}</time></div>{racks.length>0&&<div className="rack-breakdown"><div className="eyebrow">RACK-BY-RACK RESULT</div>{racks.map(r=><div className="rack-line" key={r.id}><b>Rack {r.rack_number}</b><span className={r.winner_id===id?"win-text":"loss-text"}>{r.winner_id===id?"You won":"You lost"}</span><span>{r.loser_id!==id?"Opponent":"You"} left <strong>{r.loser_balls_remaining}</strong> balls</span></div>)}</div>}</article>;
    })}</div>}
  </section>
 </main>;
}
