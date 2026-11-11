"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = { id:string; player_code:string; username:string; photo_url:string|null; elo_rating:number; matches_played:number; wins:number; losses:number; win_percentage:number };
type Match = { id:string; played_at:string; player_one_score:number; player_two_score:number; one?:{username:string;player_code:string}|null; two?:{username:string;player_code:string}|null };

export default function Home(){
 const [players,setPlayers]=useState<Player[]>([]),[matches,setMatches]=useState<Match[]>([]);
 const [search,setSearch]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{async function load(){
  if(!supabase){setError("Supabase environment variables are not configured.");setLoading(false);return;}
  const [{data:p,error:pe},{data:m,error:me}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").order("elo_rating",{ascending:false}),
   supabase.from("matches").select("id,played_at,player_one_score,player_two_score,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)").order("played_at",{ascending:false}).limit(8)
  ]);
  if(pe||me)setError(pe?.message||me?.message||"Unable to load records.");
  setPlayers((p||[]) as Player[]);setMatches((m||[]) as unknown as Match[]);setLoading(false);
 }load();},[]);
 const filtered=players.filter(p=>(p.username+" "+p.player_code).toLowerCase().includes(search.toLowerCase()));
 const totalMatches=Math.round(players.reduce((n,p)=>n+p.matches_played,0)/2);
 const totalWins=players.reduce((n,p)=>n+p.wins,0);
 const visiblePlayers=filtered.slice(0,10);
 return <main className="shell redesign-shell">
  <header className="topbar redesign-topbar">
   <Link className="brand redesign-brand" href="/"><span className="brand-mark">▰</span> BASE<span>25</span> PRO</Link>
   <nav><a className="nav-active" href="#leaderboard">Leaderboard</a><a href="#matches">Matches</a><Link href="/how-it-works">How it works</Link><Link className="admin-link" href="/admin">♙ Admin</Link></nav>
  </header>
  <section className="redesign-hero">
   <div className="hero-copy"><div className="eyebrow">THE OFFICIAL COMPETITION BOARD</div><h1>Every match<br/><span>counts.</span></h1>
    <p>Track the players. Follow the results.<br/>See who really owns the table.</p>
    <div className="hero-actions"><a className="primary hero-primary" href="#leaderboard">View Leaderboard <span>→</span></a></div>
   </div>
   <div className="hero-art" aria-hidden="true"><div className="art-light"></div><div className="art-sign">BASE<span>25</span><small>PRO</small></div><div className="pool-table"><div className="table-rail"></div><i className="cue-ball"></i><i className="ball ball-one"></i><i className="ball ball-two"></i><i className="ball ball-three"></i><i className="ball ball-four"></i><i className="ball ball-five"></i><i className="cue-stick"></i></div></div>
  </section>
  <section className="redesign-stats">
   <div><span className="stat-icon">♧</span><div><strong>{players.length}</strong><small>Registered Players</small></div></div>
   <div><span className="stat-icon">▱</span><div><strong>{totalMatches}</strong><small>Recorded Matches</small></div></div>
   <div><span className="stat-icon">♜</span><div><strong>{totalWins}</strong><small>Total Wins</small></div></div>
   <div><span className="stat-icon">▥</span><div><strong>1,000</strong><small>Starting Rating</small></div></div>
  </section>
  <section id="leaderboard" className="section redesign-section">
   <div className="redesign-section-head"><div><div className="eyebrow">01 / COMPETITION</div><h2>Leaderboard<span>.</span></h2></div><div className="live-pill">⌁ &nbsp;LIVE RANKINGS</div></div>
   <label className="redesign-search"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a player..."/></label>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="muted">Loading rankings...</p>:filtered.length===0?<div className="empty-state">No players found. Registered players will appear here.</div>:
    <><div className="leaderboard-card"><div className="leaderboard-columns"><span>#</span><span>PLAYER</span><span>WIN RATE</span><span>RATING</span></div>
     {visiblePlayers.map(p=>{const rank=players.findIndex(x=>x.id===p.id)+1;return <Link className={`leader-row ${rank===1?"leader-first":""}`} href={`/players/${p.id}`} key={p.id}>
      <span className={`leader-rank rank-${rank}`}>{rank<=3?<b className="crown">♛</b>:null}{rank}</span>
      <span className="leader-player"><span className="avatar">{p.photo_url?<img src={p.photo_url} alt=""/>:p.username[0]}</span><span><b>{p.username}</b><small>{p.player_code}</small></span></span>
      <strong className="leader-win-rate">{p.win_percentage??0}%</strong><strong className="leader-rating">{p.elo_rating.toLocaleString()}</strong>
     </Link>})}
    </div>
    {filtered.length>10&&<Link className="view-full-leaderboard" href="/leaderboard">View Full Leaderboard <span>→</span></Link>}</>
   }
  </section>
  <section id="matches" className="section redesign-section matches-section">
   <div className="redesign-section-head"><div><div className="eyebrow">02 / MATCH HISTORY</div><h2>Latest matches<span>.</span></h2></div><Link className="view-matches" href="/matches">View all matches <span>→</span></Link></div>
   {matches.length===0?<div className="matches-empty"><div className="ball-rack">○<br/>○ ○<br/>○ ○ ○</div><b>No matches yet</b><p>Matches will appear here once they are recorded.</p></div>:
    <div className="match-list">{matches.map(m=><div className="match" key={m.id}><div><b>{m.one?.username||"Player 1"}</b><small>{m.one?.player_code}</small></div><strong>{m.player_one_score} — {m.player_two_score}</strong><div className="right"><b>{m.two?.username||"Player 2"}</b><small>{m.two?.player_code}</small></div><time>{new Date(m.played_at).toLocaleDateString()}</time></div>)}</div>}
  </section>
  <footer><b>BASE25 PRO</b><span>Built for competition. Powered by performance.</span><Link href="/admin">Admin access ↗</Link></footer>
 </main>;
}