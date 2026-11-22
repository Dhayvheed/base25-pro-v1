"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Player = { id:string; player_code:string; username:string; photo_url:string|null; elo_rating:number; matches_played:number; wins:number; losses:number; win_percentage:number; designation?:string|null };
type Match = { id:string; played_at:string; player_one_score:number; player_two_score:number; one?:{username:string;player_code:string}|null; two?:{username:string;player_code:string}|null };
type Champion = { id:string; week_start:string; week_end:string; player_id:string; prize_amount?:number|null; players?:{username:string;player_code:string;photo_url:string|null}|null };
type KingsPot = { week_start:string; pot_amount:number; contributor_count:number };
type HomeAccount = { signedIn:boolean; authReady:boolean; profile:any; accountName:string };

function money(value:number){ return "₦"+Number(value||0).toLocaleString("en-NG"); }
function Avatar({player,className=""}:{player:{username:string;photo_url?:string|null};className?:string}){
 return <span className={"home-v2-avatar "+className}>{player.photo_url?<img src={player.photo_url} alt=""/>:player.username?.[0]?.toUpperCase()||"?"}</span>;
}
function isHouse(player:Player){ return player.designation==="boardman"||player.designation==="house_ghost"; }

export default function Home(){
 const [account,setAccount]=useState<HomeAccount>({signedIn:false,authReady:false,profile:null,accountName:""});
 const [players,setPlayers]=useState<Player[]>([]),[weeklyPlayers,setWeeklyPlayers]=useState<Player[]>([]),[matches,setMatches]=useState<Match[]>([]);
 const [champion,setChampion]=useState<Champion|null>(null),[kingsPot,setKingsPot]=useState<KingsPot|null>(null);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Competition data is temporarily unavailable.");setLoading(false);return;}
  const [{data:p,error:pe},{data:w,error:we},{data:m,error:me},{data:c,error:ce},{data:pot,error:potError}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").order("elo_rating",{ascending:false}),
   supabase.rpc("get_period_leaderboard",{p_period:"this_week"}),
   supabase.from("matches").select("id,played_at,player_one_score,player_two_score,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)").order("played_at",{ascending:false}).limit(3),
   supabase.from("weekly_champions").select("id,week_start,week_end,player_id,prize_amount,players(username,player_code,photo_url)").order("week_start",{ascending:false}).limit(1),
   supabase.rpc("get_current_kings_pot")
  ]);
  if(!active)return;
  if(pe||we||me||ce||potError)setError(pe?.message||we?.message||me?.message||ce?.message||potError?.message||"Unable to load records.");
  setPlayers((p||[]) as Player[]);
  const designations=new Map(((p||[]) as Player[]).map(player=>[player.id,player.designation||null]));
  setWeeklyPlayers(((w||[]) as Player[]).map(player=>({...player,designation:designations.get(player.id)||null})).sort((a,b)=>Number(b.elo_rating||0)-Number(a.elo_rating||0)));
  setMatches((m||[]) as unknown as Match[]);
  setChampion(((c||[]) as unknown as Champion[])[0]||null);
  const rawPot=pot as KingsPot[]|KingsPot|null;
  setKingsPot((Array.isArray(rawPot)?rawPot[0]:rawPot)||null);
  setLoading(false);
 }load();const refresh=setInterval(load,15000);return()=>{active=false;clearInterval(refresh);};},[]);
 const totalMatches=Math.round(players.reduce((n,p)=>n+Number(p.matches_played||0),0)/2);
 const weeklyMatchCount=Math.round(weeklyPlayers.reduce((n,p)=>n+Number(p.matches_played||0),0)/2);
 const topSeven=weeklyPlayers.slice(0,7);
 const visiblePlayers=topSeven;
 const latestMatchDate=matches[0]?.played_at?new Date(matches[0].played_at):null;
 const paidOutTotal=26000;
 return <main className="shell redesign-shell home-v2">
  <SiteNavigation onHomeAccountChange={setAccount}/>
  <header className="home-header">
   <Link href="/" className="home-header-brand"><span className="home-header-ball">8</span><span><strong>BASE25 <b>PRO</b></strong><small>The Official Billiards Competition</small></span></Link>
   <div className="home-header-actions">
    {account.signedIn?<><Link href="/account" className="home-header-bell" aria-label="Notifications">♧</Link><Link href="/account" className="home-header-avatar" aria-label="My profile">{account.profile?.photo_url?<img src={account.profile.photo_url} alt=""/>:(account.profile?.username||account.accountName||"P").charAt(0).toUpperCase()}</Link></>:<Link href="/login" className="home-header-login">Log in</Link>}
   </div>
  </header>
  <div className="home-v2-glow" aria-hidden="true"/>
  <section className="home-v2-hero">
   <div className="home-v2-hero-copy">
    <h1>Every match <span>counts.</span></h1>
    <p>Your game. Your ranking. Your crown.</p>
    <div className="home-v2-actions"><Link className="home-v2-primary" href="/competition?leaderboard=full#weekly-leaderboard">View Leaderboard</Link><Link className="home-v2-secondary" href="/hall-of-fame">Hall of Fame</Link></div>
   </div>
  </section>
  <section className="home-v2-pot" aria-label="King's Pot">
   <div className="home-v2-pot-title"><span>♛</span> THE KING'S POT</div>
   <div className="home-v2-live"><i/> LIVE POT</div>
   <div className="home-v2-pot-amount">{money(kingsPot?.pot_amount||0)}<strong className="home-v2-pot-chip">+₦100</strong></div>
   <div className="home-v2-pot-meta"><span>{weeklyMatchCount} matches since last Saturday · ₦100 each</span></div>
   <p>Every recorded match adds ₦100. The full pool goes to the Saturday champion, then the pot resets to ₦0.</p>
   <Link href="/how-it-works">How it works <span>→</span></Link>
  </section>
  <section className="home-personal-card">
   {account.signedIn?<>
    <div className="home-v2-eyebrow">MY STANDING · {account.profile?.player_code||"BASE25 PRO"}</div>
    <div className="home-personal-main"><Avatar player={{username:account.profile?.username||account.accountName||"Player",photo_url:account.profile?.photo_url}}/><div><strong>{account.profile?.username||account.accountName||"Player"}</strong><span>{account.profile?.globalRank?"Global rank #"+account.profile.globalRank:"Unranked"}</span></div></div>
    <div className="home-personal-ratings"><div><strong>{account.profile?.elo_rating!=null?Number(account.profile.elo_rating).toLocaleString("en-NG"):"—"}</strong><span>ALL-TIME RATING</span></div><div><strong>{account.profile?.weeklyElo!=null?Number(account.profile.weeklyElo).toLocaleString("en-NG"):"—"}</strong><span>WEEKLY RATING</span></div></div>
    {!account.profile?.matches_played&&<p>Play your first match to get a rating.</p>}
    <Link href="/account">View my profile →</Link>
   </>:<>
    <div className="home-v2-eyebrow">WELCOME, PLAYER</div><h2>Welcome, player</h2><p>Log in to see your rank and rating.</p><Link className="home-personal-login" href="/login">Player login</Link><small>No login yet? Ask the admin at the base.</small>
   </>}
  </section>
  <div className="home-v2-alltime-label">ALL-TIME</div>
  <section className="home-v2-stats">
   <div><strong>{players.length}</strong><span>Players</span></div><div><strong>{totalMatches}</strong><span>Matches</span></div><div><strong>{money(paidOutTotal)}</strong><span>Paid out</span></div>
  </section>
  <section className="home-v2-weekly">
   <div className="home-v2-section-head"><div><div className="home-v2-eyebrow">THIS WEEK'S RACE</div><h2>Saturday Top 5</h2></div><span className="home-v2-live-pill"><i/> LIVE</span></div>
   <p className="home-v2-subtitle">Top 5 real players qualify for the Saturday final. House players rank but can't qualify for finals or prizes. Points and the pot reset every Saturday.</p>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="home-v2-empty">Loading weekly standings…</p>:visiblePlayers.length===0?<p className="home-v2-empty">No weekly rankings yet. Players appear after their first ranked match.</p>:
    <div className="home-v2-table">
     <div className="home-v2-columns"><span>#</span><span>PLAYER</span><span>RECORD</span><span>RATING</span></div>
     {visiblePlayers.map((p,index)=>{
      const house=isHouse(p);
      const qualifyingRank=weeklyPlayers.slice(0,index+1).filter(player=>!isHouse(player)).length;
      const showCut=qualifyingRank===5;
      return <div className="home-v2-row-wrap" key={p.id}>
       <Link className={"home-v2-player-row "+(house?"is-house":"is-real")} href={"/players/"+p.id}>
        <span className={"home-v2-rank "+(house?"house-rank":"real-rank")}>{index+1}</span>
        <span className="home-v2-player"><Avatar player={p} className={house?"house-avatar":""}/><span><strong>{p.username}</strong><small>{p.player_code}{house&&<em className="home-house-tag">HOUSE</em>}</small></span></span>
        <strong className="home-v2-record">{p.wins}W / {p.losses}L</strong><strong className="home-v2-rating">{Number(p.elo_rating||0).toLocaleString("en-NG")}</strong>
       </Link>
       {showCut&&<div className="home-v2-cutline"><span>TOP 5 REAL PLAYERS QUALIFY</span></div>}
      </div>;
     })}
    </div>}
   <Link className="home-v2-full-link" href="/competition?leaderboard=full#weekly-leaderboard">View full weekly leaderboard <span>→</span></Link>
  </section>
  {champion&&<section className="home-v2-champion">
   <div className="home-v2-champion-sun"><span>{champion.players?.photo_url?<img src={champion.players.photo_url} alt=""/>:champion.players?.username?.[0]?.toUpperCase()||"?"}</span></div>
   <div className="home-v2-champion-copy"><div className="home-v2-eyebrow">LATEST CHAMPION</div><strong>{champion.players?.username||"Saturday Champion"}</strong><small>{champion.prize_amount!=null?money(champion.prize_amount)+" prize · ":""}{new Date(champion.week_start).toLocaleDateString("en-GB",{day:"numeric",month:"short"})} – {new Date(champion.week_end).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</small></div>
   <Link href="/hall-of-fame">Hall of Fame →</Link>
  </section>}
  <section className="home-v2-matches">
   <div className="home-v2-section-head"><div><div className="home-v2-eyebrow">MATCH HISTORY</div><h2>Latest matches</h2></div></div>
   {latestMatchDate&&<div className="home-v2-match-date">{latestMatchDate.toLocaleDateString("en-US",{weekday:"short",day:"numeric",month:"short"}).toUpperCase()}</div>}
   {matches.length===0?<p className="home-v2-empty">Matches will appear here once recorded.</p>:<div className="home-v2-match-list">{matches.map(m=>{
    const oneWon=m.player_one_score>=m.player_two_score;
    return <div className="home-v2-match-card" key={m.id}><div className="home-v2-match-names"><strong>{oneWon?(m.one?.username||"Player 1"):(m.two?.username||"Player 2")} <span>beat</span></strong><small>{oneWon?(m.two?.username||"Player 2"):(m.one?.username||"Player 1")}</small></div><b className="home-v2-match-score">{m.player_one_score} - {m.player_two_score}</b></div>;
   })}</div>}
   <Link className="home-v2-all-matches" href="/matches">View all matches →</Link>
  </section>
  <footer className="home-v2-footer"><strong>BASE25 PRO</strong><span>Built for competition. Powered by performance.</span></footer>
  <nav className="home-bottom-nav" aria-label="Bottom navigation"><Link className="active" href="/">⌂<span>Home</span></Link><Link href="/competition">♜<span>Competition</span></Link><Link href="/players">♙<span>Players</span></Link><Link href="/predictions">◎<span>Predictions</span></Link><Link href="/hall-of-fame">♛<span>Hall of Fame</span></Link></nav>
 </main>;
}
