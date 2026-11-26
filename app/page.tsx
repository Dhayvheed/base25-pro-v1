"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
import WeeklyLeaderboardRows, { getBoardmanSlayerPlayerIds } from "@/components/WeeklyLeaderboardRows";
import { getBoardmanBonusData } from "@/lib/boardman-bonus";

type Player = { id:string; player_code:string; username:string; photo_url:string|null; elo_rating:number; matches_played:number; wins:number; losses:number; win_percentage:number; designation?: "regular" | "house_ghost" | "boardman"; hasBoardmanSlayerBadge?: boolean };
type Match = { id:string; played_at:string; player_one_id:string; player_two_id:string; player_one_score:number; player_two_score:number; winner_id:string; player_one_elo_before:number|null; player_two_elo_before:number|null; one?:{id:string;username:string;player_code:string;designation?: "regular"|"house_ghost"|"boardman"|null}|null; two?:{id:string;username:string;player_code:string;designation?: "regular"|"house_ghost"|"boardman"|null}|null };
type Champion = { id:string; week_start:string; week_end:string; player_id:string; prize_amount?:number|null; players?:{username:string;player_code:string;photo_url:string|null}|null };
type KingsPot = { week_start:string; pot_amount:number; contributor_count:number };

function Avatar({player}:{player:{username:string;photo_url?:string|null}}){
 return <span className="home-v2-avatar">{player.photo_url?<img src={player.photo_url} alt="" />:player.username?.[0]?.toUpperCase()||"?"}</span>;
}
function money(value:number){return "₦"+Number(value||0).toLocaleString("en-NG");}
function getLagosWeekStartIso(){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const part=(type:string)=>Number(parts.find(p=>p.type===type)?.value||0);
 const todayUtc=Date.UTC(part("year"),part("month")-1,part("day"));
 const weekday=new Date(todayUtc).getUTCDay();
 const daysSinceSaturday=(weekday+1)%7;
 return new Date(todayUtc-daysSinceSaturday*86400000-3600000).toISOString();
}

type HomeAccount = { signedIn:boolean; authReady:boolean; profile:any; accountName:string };
export default function Home(){
 const [account,setAccount]=useState<HomeAccount>({signedIn:false,authReady:false,profile:null,accountName:""});
 const [players,setPlayers]=useState<Player[]>([]),[weeklyPlayers,setWeeklyPlayers]=useState<Player[]>([]),[matches,setMatches]=useState<Match[]>([]);
 const [champion,setChampion]=useState<Champion|null>(null),[kingsPot,setKingsPot]=useState<KingsPot|null>(null),[matchesSinceSaturday,setMatchesSinceSaturday]=useState(0),[bonusByMatch,setBonusByMatch]=useState<Map<string,number>>(new Map());
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const [showAllWeekly,setShowAllWeekly]=useState(false);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setError("Supabase environment variables are not configured.");setLoading(false);return;}
  const [{data:p,error:pe},{data:w,error:we},{data:m,error:me},{data:c,error:ce},{data:pot,error:potError},{count:weeklyMatchCount,error:matchCountError}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").order("elo_rating",{ascending:false}),
   supabase.rpc("get_period_leaderboard_with_designation",{p_period:"this_week"}),
   supabase.from("matches").select("id,played_at,player_one_id,player_two_id,player_one_score,player_two_score,winner_id,player_one_elo_before,player_two_elo_before,one:players!matches_player_one_id_fkey(id,username,player_code,designation),two:players!matches_player_two_id_fkey(id,username,player_code,designation)").order("played_at",{ascending:false}).limit(3),
   supabase.from("weekly_champions").select("id,week_start,week_end,player_id,prize_amount,players(username,player_code,photo_url)").order("week_start",{ascending:false}).limit(1),
   supabase.rpc("get_current_kings_pot"),
   supabase.from("matches").select("id",{count:"exact",head:true}).gte("played_at",getLagosWeekStartIso())
  ]);
  if(!active)return;
  if(pe||we||me||ce||potError||matchCountError)setError(pe?.message||we?.message||me?.message||ce?.message||potError?.message||"Unable to load records.");
  const [slayerIds,bonusData] = await Promise.all([getBoardmanSlayerPlayerIds(supabase),getBoardmanBonusData(supabase)]);
  setBonusByMatch(bonusData.bonusByMatchId);setPlayers((p||[]) as Player[]);setWeeklyPlayers(((w||[]) as Player[]).map(player=>({...player,hasBoardmanSlayerBadge:slayerIds.has(player.id),boardmanBonusPoints:bonusData.bonusByPlayerId.get(player.id)||0})).sort((a,b)=>(Number(b.elo_rating||0)+Number(bonusData.bonusByPlayerId.get(b.id)||0))-(Number(a.elo_rating||0)+Number(bonusData.bonusByPlayerId.get(a.id)||0))));setMatches((m||[]) as unknown as Match[]);setChampion(((c||[]) as unknown as Champion[])[0]||null);setKingsPot(((pot||[]) as KingsPot[])[0]||null);setMatchesSinceSaturday(weeklyMatchCount||0);setLoading(false);
 }load();const refresh=setInterval(load,15000);return()=>{active=false;clearInterval(refresh);};},[]);
 const totalMatches=Math.round(players.reduce((n,p)=>n+p.matches_played,0)/2);
 const totalWins=players.reduce((n,p)=>n+p.wins,0);
 const visiblePlayers=showAllWeekly?weeklyPlayers:weeklyPlayers.slice(0,5);
 return <main className="shell redesign-shell home-v2">
  <style jsx global>{`
   .home-v2-matches .history-card{display:block;padding:18px;border:1px solid #344135;border-radius:13px;background:linear-gradient(110deg,#172018,#0d130e);color:#f4f6f1;text-decoration:none;transition:border-color .2s,transform .2s}
   .home-v2-matches .history-card:hover{border-color:#9bc74d;transform:translateY(-2px)}
   .home-v2-matches .history-duel{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}
   .home-v2-matches .history-duel>div{display:grid;gap:4px;min-width:0}
   .home-v2-matches .history-duel>div:last-child{text-align:right}
   .home-v2-matches .history-duel b{font-size:clamp(15px,3vw,23px);font-weight:900;overflow-wrap:anywhere}
   .home-v2-matches .history-designation{display:inline-block;margin-left:5px;padding:3px 5px;border:1px solid;border-radius:5px;font:900 7px/1.2 monospace;letter-spacing:.03em;vertical-align:middle;white-space:nowrap}
   .home-v2-matches .history-designation.is-boardman{color:#f0c56a;border-color:#8b632d;background:#3b2915}
   .home-v2-matches .history-designation.is-ghost{color:#d6b6ff;border-color:#72519a;background:#291d3a}
   .home-v2-matches .history-duel small{font:9px monospace;color:#98a696}
   .home-v2-matches .history-duel>strong{font:900 clamp(24px,5vw,38px) monospace;color:#c5f36a;white-space:nowrap}
   .home-v2-matches .history-duel>strong i{font-style:normal;color:#879286;margin:0 5px}
   .home-v2-matches .history-prediction{display:grid;grid-template-columns:1fr auto;gap:5px 10px;align-items:center;margin-top:12px;padding:10px 11px;border:1px solid #394a36;border-radius:9px;background:#0a120c}
   .home-v2-matches .history-prediction>span{font:800 8px monospace;letter-spacing:.12em;color:#9eaa9b}
   .home-v2-matches .history-prediction>b{grid-column:1/-1;font:900 13px monospace;color:#eaf1e5}
   .home-v2-matches .history-prediction>b i{font-style:normal;color:#899787;margin:0 4px}
   .home-v2-matches .history-prediction>strong{grid-column:1/-1;font:900 8px monospace;letter-spacing:.07em}
   .home-v2-matches .prediction-correct{color:#c5f36a}
   .home-v2-matches .prediction-upset{color:#ff6158}
   .home-v2-matches .history-bottom{display:flex;justify-content:space-between;align-items:center;margin-top:14px;padding-top:12px;border-top:1px solid #2d382e}
   .home-v2-matches .history-bottom time{font:10px monospace;color:#9eaa9b}
   .home-v2-matches .history-bottom span{font:9px monospace;color:#c5f36a;letter-spacing:.1em}
   .home-v2-matches .boardman-bonus{font:900 9px monospace;color:#f0c36b;letter-spacing:.04em}
   @media(max-width:500px){.home-v2-matches .history-card{padding:13px}.home-v2-matches .history-duel{gap:6px}.home-v2-matches .history-duel b{font-size:15px}.home-v2-matches .history-duel>strong{font-size:25px}.home-v2-matches .history-bottom span{font-size:8px}}
   .home-v2-player-row.is-first{min-height:82px;padding-top:10px;padding-bottom:10px}
   .home-v2-player-row.is-first .home-v2-player-copy{display:flex;min-width:0;flex-direction:column;align-items:flex-start;gap:3px}
   .home-v2-player-row.is-first .home-v2-player small{margin-top:0;line-height:1.25}
   .home-v2-designation-tag.is-boardman-slayer,.competition-designation-tag.is-boardman-slayer{background:#382713!important;border:1px solid #a87932!important;color:#f0c36b!important}
  `}
  </style>
  <SiteNavigation onHomeAccountChange={setAccount} />
  <header className="home-header">
   <Link href="/" className="home-header-brand"><span className="home-header-ball">8</span><span><strong>BASE25 <b>PRO</b></strong><small>The Official Billiards Competition</small></span></Link>
   {account.signedIn ? <div className="home-header-actions"><Link href="/account" className="home-header-bell" aria-label="Notifications">♧</Link><Link href="/account" className="home-header-avatar" aria-label="My profile">{account.profile?.photo_url ? <img src={account.profile.photo_url} alt="" /> : (account.profile?.username || account.accountName || "P").charAt(0).toUpperCase()}</Link></div> : <Link href="/login" className="home-header-login">Log in</Link>}
  </header>
  <div className="home-v2-glow" aria-hidden="true"/>
  <section className="home-v2-hero">
   <div className="home-v2-hero-copy">
    <div className="home-v2-eyebrow">THE OFFICIAL BILLIARDS COMPETITION</div>
    <h1>Every match<br/><span>counts.</span></h1>
    <p>Your game. Your ranking. Your crown.</p>
    <div className="home-v2-actions">
     <Link className="home-v2-primary" href="/competition?leaderboard=full#weekly-leaderboard"><span className="home-v2-action-icon" aria-hidden="true">▥</span>View Leaderboard</Link>
     <Link className="home-v2-secondary" href="/hall-of-fame">Hall of Fame</Link>
    </div>
   </div>
   <div className="home-v2-ball-art" aria-hidden="true">
    <div className="home-v2-cue"/>
    <div className="home-v2-eight"><span>8</span></div>
   </div>
  </section>
  <section className="home-v2-stats">
   <div><strong>{players.length}</strong><span>Registered players</span></div>
   <div><strong>{totalMatches}</strong><span>Recorded matches</span></div>
   <div><strong>₦26,000</strong><span>Paid out</span></div>
  </section>
  <section className="home-v2-pot" aria-label="King's Pot">
   <div className="home-v2-pot-title"><span>♛</span> THE KING'S POT</div>
   <div className="home-v2-live"><i/> LIVE POT</div>
   <div className="home-v2-pot-amount">{money(kingsPot?.pot_amount||0)}</div>
   <div className="home-v2-pot-meta"><strong>+₦100</strong> <span>{matchesSinceSaturday} matches since last Saturday · ₦100 each</span></div>
   <p>Every recorded match adds ₦100. The full pool goes to the Saturday champion, then the pot resets to ₦0.</p>
   <Link href="/how-it-works">How it works <span>→</span></Link>
  </section>
  <section className="home-personal-card">
   {account.signedIn ? <><div className="home-v2-eyebrow">MY STANDING · {account.profile?.player_code || "BASE25 PRO"}</div><div className="home-personal-main"><Avatar player={{username:account.profile?.username||account.accountName,photo_url:account.profile?.photo_url}}/><div><strong>{account.profile?.username||account.accountName||"Player"}</strong><span>{account.profile?.globalRank ? "Global rank #"+account.profile.globalRank : "Unranked"}</span></div></div><div className="home-personal-ratings"><div><strong>{account.profile?.elo_rating ? Number(account.profile.elo_rating).toLocaleString("en-NG") : "—"}</strong><span>ALL-TIME RATING</span></div><div><strong>{account.profile?.weeklyElo ? Number(account.profile.weeklyElo).toLocaleString("en-NG") : "—"}</strong><span>WEEKLY RATING</span></div></div>{!account.profile?.matches_played&&<p>Play your first match to get a rating.</p>}<Link href="/account">View my profile →</Link></> : <><div className="home-v2-eyebrow">PLAYER ACCOUNT</div><h2>Welcome, player</h2><p>Log in to see your rank and rating.</p><Link className="home-personal-login" href="/login">Player login</Link><small>No login yet? Ask the admin at the base.</small></>}
  </section>
  <section className="home-v2-weekly">
   <div className="home-v2-section-head">
    <div><div className="home-v2-eyebrow">THIS WEEK'S RACE</div><h2>Saturday Top 5</h2></div>
    <span className="home-v2-live-pill"><i/> LIVE</span>
   </div>
   <p className="home-v2-subtitle">Top 5 real players qualify for the Saturday final. Boardman and House players rank but can’t qualify for finals or prizes. Points and the pot reset every Saturday.</p>
   {error&&<p className="notice">{error}</p>}
   {loading?<p className="home-v2-empty">Loading weekly standings...</p>:visiblePlayers.length===0?<p className="home-v2-empty">No weekly rankings yet. Players appear after their first ranked match.</p>:
    <div className="home-v2-table">
     <div className="home-v2-columns"><span>PLAYER</span><span>RECORD</span><span>RATING</span></div>
     <WeeklyLeaderboardRows players={visiblePlayers} variant="home" />
    </div>}
   <button type="button" className="home-v2-full-link" onClick={() => setShowAllWeekly((current) => !current)} aria-expanded={showAllWeekly}>{showAllWeekly ? "Show less" : "View full weekly leaderboard"} <span>{showAllWeekly ? "↑" : "↓"}</span></button>
  </section>
  {champion&&<section className="home-v2-champion">
   <div className="home-v2-champion-sun"><span>{champion.players?.photo_url?<img src={champion.players.photo_url} alt=""/>:champion.players?.username?.[0]?.toUpperCase()||"?"}</span></div>
   <div className="home-v2-champion-copy"><div className="home-v2-eyebrow">LATEST CHAMPION</div><strong>{champion.players?.username||"Saturday Champion"}</strong><Link href="/hall-of-fame">Hall of Fame <span>→</span></Link></div>
   {champion.prize_amount!=null&&<div className="home-v2-champion-prize"><small>PRIZE WON</small><strong>₦{Number(champion.prize_amount).toLocaleString("en-NG")}</strong></div>}
  </section>}
  <section className="home-v2-matches">
   <div className="home-v2-section-head"><div><div className="home-v2-eyebrow">MATCH HISTORY</div><h2>Latest matches</h2></div></div>
   {matches.length===0?<p className="home-v2-empty">Matches will appear here once recorded.</p>:<div className="home-v2-match-list">
    {matches.map((m,i)=>{const date=new Date(m.played_at);const previous=i>0?new Date(matches[i-1].played_at):null;const dateKey=date.toLocaleDateString("en-CA");const previousKey=previous?.toLocaleDateString("en-CA");const one=m.one,two=m.two;const p1=m.player_one_elo_before!=null&&m.player_two_elo_before!=null?1/(1+Math.pow(10,(Number(m.player_two_elo_before)-Number(m.player_one_elo_before))/400)):null;const p2=p1===null?null:1-p1;const favourite=p1===null?null:(p1>=.5?one:two);const favouriteWon=favourite?m.winner_id===favourite.id:false;return <div key={m.id}>
     {dateKey!==previousKey&&<div className="home-v2-match-date">{date.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"}).toUpperCase()}<span/></div>}
     <Link href={"/matches/"+m.id} className="history-card"><div className="history-duel"><div><b>{one?.username||"Unknown Player"}{one?.designation==="boardman"&&<span className="history-designation is-boardman">BOARDMAN 💀</span>}{one?.designation==="house_ghost"&&<span className="history-designation is-ghost">HOUSE GHOSTS 👻</span>}</b><small>{one?.player_code||""}</small></div><strong>{m.player_one_score}<i>—</i>{m.player_two_score}</strong><div><b>{two?.username||"Unknown Player"}{two?.designation==="boardman"&&<span className="history-designation is-boardman">BOARDMAN 💀</span>}{two?.designation==="house_ghost"&&<span className="history-designation is-ghost">HOUSE GHOSTS 👻</span>}</b><small>{two?.player_code||""}</small></div></div>{p1!==null&&p2!==null&&<div className="history-prediction"><span>PRE-MATCH ELO ESTIMATE</span><b>{one?.username||"Player 1"} {Math.round(p1*100)}% <i>·</i> {two?.username||"Player 2"} {Math.round(p2*100)}%</b><strong className={favouriteWon?"prediction-correct":"prediction-upset"}>{favouriteWon?"PREDICTION CORRECT":"PREDICTION WRONG"} · {favourite?.username||"Favourite"} {""}</strong></div>}<div className="history-bottom"><time>{date.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"})}</time>{bonusByMatch.get(m.id)===10&&<b className="boardman-bonus">BOARDMAN DEFEAT BONUS +10</b>}<span>OPEN MATCH RECAP ↗</span></div></Link>
    </div>})}
   </div>}
   <Link className="home-v2-all-matches" href="/matches">View all matches <span>→</span></Link>
  </section>
  <footer className="home-v2-footer"><strong>BASE25 PRO</strong><span>Built for competition. Powered by performance.</span></footer>
 </main>;
}