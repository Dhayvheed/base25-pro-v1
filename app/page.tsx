"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Player = { id:string; player_code:string; username:string; photo_url:string|null; elo_rating:number; matches_played:number; wins:number; losses:number; win_percentage:number };
type Match = { id:string; played_at:string; player_one_score:number; player_two_score:number; one?:{username:string;player_code:string}|null; two?:{username:string;player_code:string}|null };
type Champion = { id:string; week_start:string; week_end:string; player_id:string; prize_amount?:number|null; players?:{username:string;player_code:string;photo_url:string|null}|null };
type KingsPot = { week_start:string; pot_amount:number; contributor_count:number };

function Avatar({player}:{player:{username:string;photo_url?:string|null}}){
 return <span className="home-v2-avatar">{player.photo_url?<img src={player.photo_url} alt="" />:player.username?.[0]?.toUpperCase()||"?"}</span>;
}
function money(value:number){return "₦"+Number(value||0).toLocaleString("en-NG");}

export default function Home(){
 const [players,setPlayers]=useState<Player[]>([]),[weeklyPlayers,setWeeklyPlayers]=useState<Player[]>([]),[matches,setMatches]=useState<Match[]>([]);
 const [champion,setChampion]=useState<Champion|null>(null),[kingsPot,setKingsPot]=useState<KingsPot|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [showAllWeekly,setShowAllWeekly]=useState(false);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Supabase environment variables are not configured.");setLoading(false);return;}
  const [{data:p,error:pe},{data:w,error:we},{data:m,error:me},{data:c,error:ce},{data:pot,error:potError}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").order("elo_rating",{ascending:false}),
   supabase.rpc("get_period_leaderboard",{p_period:"this_week"}),
   supabase.from("matches").select("id,played_at,player_one_score,player_two_score,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)").order("played_at",{ascending:false}).limit(3),
   supabase.from("weekly_champions").select("id,week_start,week_end,player_id,prize_amount,players(username,player_code,photo_url)").order("week_start",{ascending:false}).limit(1),
   supabase.rpc("get_current_kings_pot")
  ]);
  if(!active)return;
  if(pe||we||me||ce||potError)setError(pe?.message||we?.message||me?.message||ce?.message||potError?.message||"Unable to load records.");
  setPlayers((p||[]) as Player[]);setWeeklyPlayers((w||[]) as Player[]);setMatches((m||[]) as unknown as Match[]);setChampion(((c||[]) as unknown as Champion[])[0]||null);setKingsPot(((pot||[]) as KingsPot[])[0]||null);setLoading(false);
 }load();const refresh=setInterval(load,15000);return()=>{active=false;clearInterval(refresh);};},[]);
 const totalMatches=Math.round(players.reduce((n,p)=>n+p.matches_played,0)/2);
 const totalWins=players.reduce((n,p)=>n+p.wins,0);
 const visiblePlayers=showAllWeekly?weeklyPlayers:weeklyPlayers.slice(0,5);
 return <main className="shell redesign-shell home-v2">
  <SiteNavigation />
  <div className="home-v2-glow" aria-hidden="true"/>
  <section className="home-v2-hero">
   <div className="home-v2-hero-copy">
    <div className="home-v2-eyebrow">THE OFFICIAL BILLIARDS COMPETITION</div>
    <h1>Every match<br/><span>counts.</span></h1>
    <p>Your game. Your ranking. Your crown.</p>
    <div className="home-v2-actions">
     <Link className="home-v2-primary" href="/leaderboard"><span className="home-v2-action-icon" aria-hidden="true">▥</span>View Leaderboard</Link>
     <Link className="home-v2-secondary" href="/competition"><span className="home-v2-action-icon" aria-hidden="true">♜</span>Competition</Link>
    </div>
   </div>
   <div className="home-v2-ball-art" aria-hidden="true">
    <div className="home-v2-cue"/>
    <div className="home-v2-eight"><span>8</span></div>
   </div>
  </section>
  <section className="home-v2-pot" aria-label="King's Pot">
   <div className="home-v2-pot-title"><span>♛</span> THE KING'S POT</div>
   <div className="home-v2-live"><i/> LIVE POT</div>
   <div className="home-v2-pot-amount">{money(kingsPot?.pot_amount||0)}</div>
   <div className="home-v2-pot-meta">{weeklyPlayers.length} players have joined the leaderboard this week.</div>
   <p>Every player who joins automatically adds <strong>₦200</strong> to the pot.</p>
   <div className="home-v2-pot-winner">Winner takes it all 🏆</div>
  </section>
  <section className="home-v2-stats">
   <div><strong>{players.length}</strong><span>Registered players</span></div>
   <div><strong>{totalMatches}</strong><span>Recorded matches</span></div>
   <div><strong>{totalWins}</strong><span>Total wins</span></div>
  </section>
  <section className="home-v2-weekly">
   <div className="home-v2-section-head">
    <div><div className="home-v2-eyebrow">THIS WEEK'S RACE</div><h2>Saturday Top 5</h2></div>
    <span className="home-v2-live-pill"><i/> LIVE</span>
   </div>
   <p className="home-v2-subtitle">Top five qualify for the Saturday final. Weekly leaderboard runs Saturday to Friday. Points reset every Saturday.</p>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="home-v2-empty">Loading weekly standings...</p>:visiblePlayers.length===0?<p className="home-v2-empty">No weekly rankings yet. Players appear after their first ranked match.</p>:
    <div className="home-v2-table">
     <div className="home-v2-columns"><span>PLAYER</span><span>RECORD</span><span>RATING</span></div>
     {visiblePlayers.map((p,index)=>{const rank=index+1;const rankColors=["#F2C230","#2F5FD0","#D9402F","#7B3FA0","#E8782A"];return <Link className={"home-v2-player-row "+(rank===1?"is-first":"")} href={"/players/"+p.id} key={p.id}>
      <span className={"home-v2-rank rank-"+rank}><span className="home-v2-rank-ball" style={{background:rankColors[index]||"#52634b"}}><i>{rank}</i></span></span>
      <span className="home-v2-player"><Avatar player={p}/><span><strong>{p.username}{rank===1&&<span className="home-v2-player-crown" aria-label="First place">♛</span>}</strong><small>{p.player_code}</small></span></span>
      <strong className="home-v2-record">{p.wins}W / {p.losses}L</strong>
      <strong className="home-v2-rating">{p.elo_rating.toLocaleString("en-NG")}</strong>
     </Link>})}
    </div>}
   <Link className="home-v2-full-link" href="/leaderboard">View full weekly leaderboard <span>→</span></Link>
  </section>
  {champion&&<section className="home-v2-champion">
   <div className="home-v2-champion-sun"><span>{champion.players?.photo_url?<img src={champion.players.photo_url} alt=""/>:champion.players?.username?.[0]?.toUpperCase()||"?"}</span></div>
   <div className="home-v2-champion-copy"><div className="home-v2-eyebrow">LATEST CHAMPION</div><strong>{champion.players?.username||"Saturday Champion"}</strong><Link href="/hall-of-fame">Hall of Fame <span>→</span></Link></div>
   {champion.prize_amount!=null&&<div className="home-v2-champion-prize"><small>PRIZE WON</small><strong>₦{Number(champion.prize_amount).toLocaleString("en-NG")}</strong></div>}
  </section>}
  <section className="home-v2-matches">
   <div className="home-v2-section-head"><div><div className="home-v2-eyebrow">MATCH HISTORY</div><h2>Latest matches</h2></div></div>
   {matches.length===0?<p className="home-v2-empty">Matches will appear here once recorded.</p>:<div className="home-v2-match-list">
    {matches.map((m,i)=>{const date=new Date(m.played_at);const previous=i>0?new Date(matches[i-1].played_at):null;const dateKey=date.toLocaleDateString("en-CA");const previousKey=previous?.toLocaleDateString("en-CA");return <div key={m.id}>
     {dateKey!==previousKey&&<div className="home-v2-match-date">{date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}<span/></div>}
     <div className="home-v2-match-card"><span className="home-v2-match-accent"/><div className="home-v2-match-names"><strong>{m.one?.username||"Player 1"}</strong><span>{m.two?.username||"Player 2"}</span></div><b className="home-v2-match-score">{m.player_one_score} - {m.player_two_score}</b></div>
    </div>})}
   </div>}
   <Link className="home-v2-all-matches" href="/matches">View all matches <span>→</span></Link>
  </section>
  <footer className="home-v2-footer"><strong>BASE25 PRO</strong><span>Built for competition. Powered by performance.</span></footer>
 </main>;
}