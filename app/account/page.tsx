"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

type Rack={id:string;match_id:string;rack_number:number;winner_id:string;loser_id:string;loser_balls_remaining:number;black_ball_finish:boolean};
export default function PlayerProfile(){
 const [id,setId]=useState("");
 const [player,setPlayer]=useState<any>(null),[matches,setMatches]=useState<any[]>([]),[racksByMatch,setRacksByMatch]=useState<Record<string,Rack[]>>({});
 const [rank,setRank]=useState(0),[loading,setLoading]=useState(true),[range,setRange]=useState("10"),[activePoint,setActivePoint]=useState<number|null>(null);
 const [currentWeek,setCurrentWeek]=useState<any>(null),[currentWeekRank,setCurrentWeekRank]=useState(0),[weeklyHistory,setWeeklyHistory]=useState<any[]>([]),[championHistory,setChampionHistory]=useState<any[]>([]),[totalEarnings,setTotalEarnings]=useState(0);
 const [searchVisible,setSearchVisible]=useState(true),[cashoutNotice,setCashoutNotice]=useState(false),[profileEditNotice,setProfileEditNotice]=useState(false),[wagerEarnings,setWagerEarnings]=useState(0);
 useEffect(()=>{let active=true;async function load(){
  if(!supabase){setLoading(false);return;}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){window.location.replace("/login");return;}
  const {data:mine,error:mineError}=await supabase.rpc("get_my_base25_player_profile");
  const own=Array.isArray(mine)?mine[0]:mine;
  if(mineError||!own?.id){setLoading(false);return;}
  const playerId=own.id as string;
  setId(playerId);
  const [{data:profile},{data:games,error:gamesError},{data:board},{data:weekBoard},{data:archiveRows},{data:champions},{data:wagerTotal}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("*").eq("id",playerId).single(),
   supabase.from("matches").select("*,one:players!matches_player_one_id_fkey(username,player_code),two:players!matches_player_two_id_fkey(username,player_code)").or(`player_one_id.eq.${playerId},player_two_id.eq.${playerId}`).order("played_at",{ascending:false}),
   supabase.from("player_public_leaderboard").select("id,elo_rating").order("elo_rating",{ascending:false}),
   supabase.rpc("get_period_leaderboard",{p_period:"this_week"}),
   supabase.from("weekly_leaderboard_archive_entries").select("rank,weekly_elo,matches_played,wins,losses,win_percentage,archive:weekly_leaderboard_archives(week_start,week_end)").eq("player_id",playerId).order("rank",{ascending:true}),
   supabase.from("weekly_champions").select("id,week_start,week_end,prize_amount,payout_confirmed_at").eq("player_id",playerId).order("week_start",{ascending:false}),
   supabase.rpc("get_player_wager_winnings",{p_player_id:playerId})
  ]);
  if(!active)return;
  setWagerEarnings(Number(wagerTotal||0));setPlayer(profile);setCurrentWeek((weekBoard||[]).find((p:any)=>p.id===playerId)||null);setCurrentWeekRank((weekBoard||[]).findIndex((p:any)=>p.id===playerId)+1);setWeeklyHistory(archiveRows||[]);setChampionHistory(champions||[]);setTotalEarnings((champions||[]).reduce((sum:any,row:any)=>sum+Number(row.prize_amount||0),0));if(gamesError)console.error("Could not load player matches:",gamesError);
  const rows=games||[];setMatches(rows);setRank((board||[]).findIndex((p:any)=>p.id===playerId)+1);
  if(rows.length){const {data:rackRows,error:rackError}=await supabase.from("match_racks").select("id,match_id,rack_number,winner_id,loser_id,loser_balls_remaining,black_ball_finish").in("match_id",rows.map((m:any)=>m.id)).order("rack_number",{ascending:true});
   if(rackError)console.error("Could not load rack details:",rackError);
   const grouped:Record<string,Rack[]>={};(rackRows||[]).forEach((rack:Rack)=>{if(!grouped[rack.match_id])grouped[rack.match_id]=[];grouped[rack.match_id].push(rack)});setRacksByMatch(grouped);
  }
  setLoading(false);
 }load();return()=>{active=false;};},[]);
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
 const readyToCollect=championHistory.filter((w:any)=>!w.payout_confirmed_at).reduce((sum:number,w:any)=>sum+Number(w.prize_amount||0),0);
 const paidEarnings=championHistory.filter((w:any)=>w.payout_confirmed_at).reduce((sum:number,w:any)=>sum+Number(w.prize_amount||0),0);
 const shareProfile=async()=>{const text=`BASE25 PRO PLAYER CARD\\n@${player.username} · ${player.player_code}\\nELO: ${elo.toLocaleString()}\\nCareer record: ${player.wins??0}W / ${player.losses??0}L`;if(navigator.share)await navigator.share({title:"BASE25 PRO Player Profile",text,url:location.origin+`/players/${player.id}`});else if(navigator.clipboard)await navigator.clipboard.writeText(text+"\\n"+location.origin+`/players/${player.id}`);};
 return <main className="shell redesign-shell player-profile-page"><SiteNavigation/>
 <section className="private-profile">
  <header className="private-topbar">
   <Link href="/" aria-label="Back">←</Link><h1>My profile</h1><button type="button" aria-label="Profile settings" onClick={()=>setCashoutNotice((v)=>!v)}>☷</button>
  </header>
  <div className="private-view-switch" role="group" aria-label="Profile view"><span className="active">My view</span><Link href={"/players/"+id+"?view=public"}>Preview as public</Link></div>
      <section className="private-identity-card">
    <div className="private-identity-main"><div className="private-avatar-wrap"><div className="private-avatar">{player.photo_url?<img src={player.photo_url} alt={player.username}/>:player.username?.[0]?.toUpperCase()}</div><button className="private-avatar-edit" type="button" onClick={()=>setProfileEditNotice(v=>!v)} aria-label="Edit profile photo">✎</button></div>
     <div className="private-identity-copy"><h2>{player.username}<b>✓</b></h2><div><small>{player.player_code}</small><em>COMPETITIVE</em></div><p>{player.bio ? "“"+player.bio+"”" : "“Play smart. Clear tables.”"}</p></div>
    </div>
    <div className="private-identity-actions"><button type="button" onClick={()=>setProfileEditNotice(v=>!v)}>Edit profile</button><button onClick={shareProfile}>Share</button></div>
    {profileEditNotice&&<p className="private-inline-notice">Profile photo, bio and display-detail editing is not connected yet. No profile changes have been made.</p>}
   </section>
   <section className="private-prediction-card">
   <div className="private-card-top"><small>NEXT UP · THIS WEEK</small><span>BASE25 PRO</span></div>
   <h3>Prediction questions are open</h3><p>Make your picks before the first rack.</p>
   <Link href="/predictions">Make predictions</Link>
  </section>

  <section className="private-rating-grid">
   <div className="private-rating-card"><small>ALL-TIME RATING</small><strong>{elo.toLocaleString()}</strong><span>Peak {Number(player.highest_elo??elo).toLocaleString()}</span><p>Career rating. Never resets.</p></div>
   <div className="private-rating-card weekly"><small>WEEKLY RATING</small><strong>{Number(currentWeek?.elo_rating??elo).toLocaleString()}</strong><span><b>#{currentWeekRank||"—"}</b> this week</span><p>Resets every Saturday.</p></div>
  </section>

  <section className="private-earnings-card">
   <div className="private-card-top"><small>ALL-TIME TOURNAMENT EARNINGS</small><span>Public</span></div>
   <strong>₦{totalEarnings.toLocaleString("en-NG")}</strong><p>{championHistory.length} championship win{championHistory.length===1?"":"s"}</p>
   <div className="private-cashout-box"><div><small>READY TO COLLECT AT THE BASE</small><b>₦{readyToCollect.toLocaleString("en-NG")}</b></div><span>Show ID<br/>{player.player_code}</span></div>
   <button className="private-cashout-button" disabled={readyToCollect<=0} onClick={()=>setCashoutNotice(true)}>{readyToCollect>0?"Request cashout at base":"Nothing to collect yet"}</button>
   <small className="private-cashout-help">Paid in person by an admin. No bank details needed.</small>
   {cashoutNotice&&<div className="private-inline-notice">Please show your player ID to the BASE25 admin at the venue to collect confirmed winnings. <button onClick={()=>setCashoutNotice(false)}>×</button></div>}
  </section>

  <section className="private-wager-card">
   <div className="private-card-top"><small>WAGER EARNINGS</small><span>Public</span></div>
   <strong>{wagerEarnings>0?"+":""}₦{wagerEarnings.toLocaleString("en-NG")}</strong><p>Confirmed player-versus-player wager winnings.</p>
   <div className="private-wager-stats"><div><b>—</b><span>Won</span></div><div><b>—</b><span>Lost</span></div><div><b>—</b><span>Wager record</span></div></div><small className="private-cashout-help">Detailed wager totals are not available in the current data.</small>
   <div className="private-wager-foot">Money lost is private by default. <button onClick={()=>setShowLosses(v=>!v)}>{showLosses?"Public":"Keep private"}</button></div>
  </section>

  <section className="private-section">
   <small>PRIVACY</small><h2>Who sees what</h2><p>Always public: ratings, rank, tournament earnings, confirmed wager winnings, achievements, rating chart and match history.</p>
   <div className="private-setting-row"><div><b>Appear in player search</b><span>Others can find you by name or ID</span></div><button className={searchVisible?"toggle on":"toggle"} onClick={()=>setSearchVisible(v=>!v)} aria-pressed={searchVisible}><i/></button></div>
   <div className="private-setting-row"><div><b>Show money lost</b><span>Private by default. Turn on only if you want losses public.</span></div><button className={showLosses?"toggle on":"toggle"} onClick={()=>setShowLosses(v=>!v)} aria-pressed={showLosses}><i/></button></div>
  </section>

  <section className="private-section private-account-section">
   <small>ACCOUNT</small><h2>Only visible to you</h2>
   <Link href="/account/phone"><div><b>Phone</b><span>Manage your contact details</span></div><i>›</i></Link>
   <Link href="/account/cashouts"><div><b>Cashout history</b><span>Collected at the base</span></div><i>›</i></Link>
   <Link href="/matches"><div><b>Match history & disputes</b><span>{matches.length} matches</span></div><i>›</i></Link>
   <Link href="/notifications"><div><b>Notifications</b><span>Match results, predictions, payouts</span></div><i>›</i></Link>
  </section>

  <div className="private-stat-row"><div><b>{player.wins??0}</b><span>Wins</span></div><div><b>{player.losses??0}</b><span>Losses</span></div><div><b>{Number(player.win_percentage??0).toFixed(1)}%</b><span>Win rate</span></div><div><b>{player.matches_played??matches.length}</b><span>Matches</span></div></div>
 </section>
 <style jsx>{`
 .pro-profile{width:100%;max-width:920px;margin:22px auto 110px;min-width:0}
 .profile-hero{position:relative;overflow:hidden;min-height:245px;padding:20px 24px 22px;border:1px solid #415b31;border-radius:18px;background:radial-gradient(ellipse at 65% 0%,#536b2c 0%,#1b321d 30%,transparent 62%),radial-gradient(ellipse at 20% 45%,#132c20,#07100b 70%);box-shadow:inset 0 0 50px #a9e83b0b}
 .profile-hero:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#050a0790 0%,transparent 42%,#050a07c9 100%);pointer-events:none}
 .profile-hero-top,.profile-hero-bottom{position:relative;z-index:1}.profile-hero-top{display:flex;justify-content:space-between;align-items:center;gap:12px}.profile-kicker,.pro-section-head small{font:700 10px monospace;letter-spacing:.18em;color:#c5f36a}.profile-hero-top button{border:1px solid #a5d832;background:#09110bd9;color:#f2f6e9;border-radius:30px;padding:11px 17px;font-size:12px;font-weight:700;white-space:nowrap}
 .profile-hero-bottom{display:grid;grid-template-columns:170px minmax(0,1fr) 155px;align-items:center;gap:18px;margin-top:28px}
 .pro-avatar{width:154px;height:154px;border-radius:50%;border:5px solid #b9f52d;background:#172719;display:grid;place-items:center;overflow:hidden;color:#d5f36a;font-size:48px;font-weight:900;box-shadow:0 0 25px #b9f52d66;flex:none}.pro-avatar img{width:100%;height:100%;object-fit:cover}
 .pro-identity-copy{min-width:0}.profile-code-line{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.profile-code-line small{font:11px monospace;color:#c4d0bd}.profile-code-line b{font:700 10px monospace;color:#c5f36a;padding:6px 10px;border:1px solid #4c7425;border-radius:20px;background:#101c0f}.pro-identity-copy h1{font-size:clamp(30px,5vw,46px);line-height:1.08;letter-spacing:-.04em;margin:12px 0 8px;overflow-wrap:anywhere}.verified-mark{display:inline-grid;place-items:center;width:23px;height:23px;margin-left:8px;border-radius:50%;background:#b9f52d;color:#091006;font-size:15px;vertical-align:middle}.pro-identity-copy p{font-size:15px;color:#e1e9dd;margin:0}
 .pro-rank-badge{height:125px;border-left:1px solid #66745c;display:grid;align-content:center;justify-items:center;color:#e8cb36}.pro-rank-badge span{font-size:39px;line-height:1}.pro-rank-badge b{font:900 43px monospace}.pro-rank-badge small{font:700 10px monospace;letter-spacing:.12em;color:#e0e8d9}
 .pro-elo-card{display:grid;grid-template-columns:1fr 1.1fr .8fr;align-items:center;gap:16px;padding:18px 24px;border:1px solid #8ebd36;border-radius:17px;background:linear-gradient(105deg,#14251a,#09120d 70%);margin:16px 0}.career-elo{display:grid;gap:5px}.career-elo small,.pro-week-rank small{font:700 10px monospace;letter-spacing:.1em;color:#d0d9c9}.career-elo strong{font:900 clamp(38px,7vw,54px) monospace;color:#c5f36a;letter-spacing:-.06em;line-height:1}.career-elo span,.pro-week-rank span{font:11px monospace;color:#aab7a4}.elo-spark{height:78px;min-width:0}.elo-spark svg{width:100%;height:100%;overflow:visible}.pro-week-rank{border-left:1px solid #526149;padding-left:20px;display:grid;gap:5px}.pro-week-rank b{font:900 34px monospace;color:#f2d447}
 .pro-earnings-card{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:16px 0;padding:18px 22px;border:1px solid #a88739;border-radius:15px;background:radial-gradient(ellipse at 85% 50%,#526a231c,transparent 45%),linear-gradient(110deg,#191b12,#0b120d);box-shadow:inset 0 0 28px #d7ae3510}.pro-earnings-card>div:first-child{display:grid;gap:6px}.pro-earnings-card small{font:700 10px monospace;letter-spacing:.12em;color:#e6c15d}.pro-earnings-card strong{font:900 clamp(27px,5vw,38px) monospace;color:#c5f36a}.pro-earnings-card span{font-size:11px;color:#aab7a4}.pro-earnings-history{display:grid;gap:6px;min-width:150px}.pro-earnings-history div{display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid #ffffff12;font:10px monospace;color:#aab7a4}.pro-earnings-history b{color:#c5f36a;white-space:nowrap}.pro-stat-row{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid #294b37;border-radius:15px;background:#0b1711;padding:13px 5px}.pro-stat-row>div{display:grid;justify-items:center;gap:5px;border-right:1px solid #344537}.pro-stat-row>div:last-child{border:0}.pro-stat-row small{font:700 9px monospace;color:#d1d9ce;letter-spacing:.06em}.pro-stat-row b{font:800 26px monospace;color:#f3f5ef}
 .pro-section{margin-top:20px;padding:19px;border:1px solid #35513b;border-radius:17px;background:linear-gradient(145deg,#0e1a12,#09110c);min-width:0}.pro-section-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;gap:12px}.pro-section-head h2{font-size:23px;line-height:1.15;margin:6px 0 0;letter-spacing:-.02em}.pro-section-head>a,.section-arrow{font:700 10px monospace;color:#c5f36a;white-space:nowrap}.pro-section-head select{max-width:155px;background:#0b140e;color:#f2f6ed;border:1px solid #52644b;border-radius:9px;padding:10px 12px;font-size:12px}
 .pro-achievements{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.achievement{position:relative;min-height:142px;display:grid;align-content:center;justify-items:center;gap:6px;padding:12px 5px;border:1px solid #42543d;border-radius:14px;background:linear-gradient(145deg,#1b291b,#0c150f);text-align:center}.achievement:before{content:"";position:absolute;inset:5px;border:1px solid #ffffff0b;border-radius:10px;pointer-events:none}.achievement i{font-style:normal;font-size:31px;color:#e9c83d;text-shadow:0 0 15px #e9c83d55}.achievement b{font:900 21px monospace;color:#c5f36a}.achievement span{font-size:11px;line-height:1.35;color:#c1cbbd}.achievement.silver i{color:#bfc7ce}.achievement.green i,.achievement.green b{color:#b9f52d}
 .pro-chart{position:relative;padding-left:50px;height:220px}.pro-chart svg{width:100%;height:100%;overflow:visible}.pro-chart .chart-labels{position:absolute;left:0;top:0;bottom:0;display:flex;flex-direction:column;justify-content:space-between;font:10px monospace;color:#aab7a4}.pro-chart-value{font:11px monospace;color:#aeb9ac;padding:9px}.pro-chart-value b{color:#c5f36a}.pro-chart-value button{float:right;background:transparent;border:0;color:white}
 .pro-recent{display:grid;min-width:0}.pro-recent>a,.pro-recent>div{display:grid;grid-template-columns:36px minmax(0,1fr) 90px 100px 58px;align-items:center;gap:10px;padding:12px 3px;border-bottom:1px solid #293b2e;color:#f1f4ed;min-width:0}.pro-recent>a:last-child,.pro-recent>div:last-child{border:0}.pro-recent>a>span{display:flex;align-items:baseline;gap:5px;flex-wrap:wrap;font-size:14px;min-width:0}.pro-recent small{font:9px monospace;color:#9eaa9b}.pro-recent>a>strong{font-size:14px;text-align:center;white-space:nowrap}.pro-recent em{font:800 13px monospace;font-style:normal;white-space:nowrap}.pro-recent>a>.match-age{text-align:right}.pro-win{color:#9cf35b}.pro-loss{color:#ff7770}.pro-recent>a>b,.pro-medal{display:grid;place-items:center;width:34px;height:28px;border-radius:30px;background:#286d1c;color:#c7ff73;font:900 13px monospace;box-shadow:0 0 12px #64f52a66}.pro-recent>a>b.pro-loss{background:#70251e;color:#ff9387;box-shadow:0 0 12px #f43b2d55}.pro-recent>div>span{display:grid;gap:4px;font-size:12px}.pro-recent>div>em{font:11px monospace;color:#c5f36a;font-style:normal}.weekly-finishes>div{grid-template-columns:38px minmax(0,1fr) auto}
 @media(max-width:650px){.pro-profile{margin:15px auto 100px}.profile-hero{padding:15px 14px 18px;min-height:0;border-radius:15px}.profile-hero-top button{padding:9px 12px;font-size:10px}.profile-kicker{font-size:9px}.profile-hero-bottom{grid-template-columns:92px minmax(0,1fr) 75px;gap:10px;margin-top:30px}.pro-avatar{width:88px;height:88px;border-width:4px;font-size:32px}.profile-code-line{gap:5px}.profile-code-line small{font-size:8px}.profile-code-line b{font-size:7px;padding:5px 7px}.pro-identity-copy h1{font-size:25px;margin:8px 0 5px}.verified-mark{width:17px;height:17px;font-size:11px;margin-left:4px}.pro-identity-copy p{font-size:10px}.pro-rank-badge{height:88px}.pro-rank-badge span{font-size:25px}.pro-rank-badge b{font-size:25px}.pro-rank-badge small{font-size:7px;letter-spacing:.05em}.pro-elo-card{grid-template-columns:minmax(0,1fr) .7fr;gap:8px;padding:15px}.elo-spark{display:none}.career-elo strong{font-size:39px}.career-elo small,.pro-week-rank small{font-size:8px}.pro-week-rank{padding-left:12px}.pro-week-rank b{font-size:27px}.pro-week-rank span{font-size:9px}.pro-earnings-card{padding:14px}.pro-earnings-card small{font-size:8px}.pro-earnings-history{min-width:112px}.pro-earnings-history div{font-size:8px}.pro-stat-row{padding:12px 2px}.pro-stat-row small{font-size:7px;letter-spacing:0}.pro-stat-row b{font-size:20px}.pro-section{padding:13px;border-radius:14px;margin-top:15px}.pro-section-head{align-items:center;margin-bottom:12px}.pro-section-head h2{font-size:20px}.pro-section-head small{font-size:8px}.section-arrow{display:none}.pro-achievements{gap:6px}.achievement{min-height:112px;padding:9px 3px;border-radius:11px}.achievement i{font-size:24px}.achievement b{font-size:17px}.achievement span{font-size:9px}.pro-section-head select{font-size:10px;padding:8px 7px;max-width:132px}.pro-chart{height:180px;padding-left:42px}.pro-chart .chart-labels{font-size:8px}.pro-recent>a{grid-template-columns:29px minmax(0,1fr) 65px 74px;gap:6px;padding:11px 0}.pro-recent>a>b{width:27px;height:24px;font-size:11px}.pro-recent>a>span{font-size:11px;gap:3px}.pro-recent>a>strong{font-size:11px}.pro-recent em{font-size:10px}.pro-recent>a>.match-age{display:none}.weekly-finishes>div{grid-template-columns:32px minmax(0,1fr) auto}.pro-recent>div>span{font-size:10px}}
 @media(max-width:370px){.profile-hero-bottom{grid-template-columns:76px minmax(0,1fr) 62px;gap:7px}.pro-avatar{width:74px;height:74px}.pro-identity-copy h1{font-size:22px}.profile-code-line b{font-size:6px}.pro-rank-badge b{font-size:22px}.pro-stat-row small{font-size:6px}.pro-stat-row b{font-size:17px}.pro-recent>a{grid-template-columns:26px minmax(0,1fr) 58px 67px;gap:4px}.pro-recent>a>span{font-size:10px}}

 .private-profile{width:100%;max-width:430px;margin:8px auto 100px;color:#f2f5ef}
 .private-topbar{height:42px;display:grid;grid-template-columns:50px 1fr 50px;align-items:center;margin-bottom:12px}
 .private-topbar>a,.private-topbar>button{width:42px;height:42px;border:1px solid #24392c;border-radius:13px;background:#09130d;color:#f2f5ef;display:grid;place-items:center;text-decoration:none;font-size:23px}
 .private-topbar>button{justify-self:end;color:#c5f36a}.private-topbar h1{text-align:center;font-size:19px;margin:0}
 .private-preview-note{margin:0 0 12px;padding:10px;border:1px solid #3a573b;border-radius:10px;font-size:11px;color:#b5c2b3}.private-preview-note a{color:#c5f36a}
 .private-identity-card{padding:18px 16px;border:1px solid #31533b;border-radius:22px;background:radial-gradient(ellipse at 85% 0%,#115332 0%,#0c2b1d 35%,#09120d 80%)}
 .private-identity-main{display:flex;align-items:center;gap:14px}
 .private-avatar{position:relative;flex:none;width:104px;height:104px;border:4px solid #c5f36a;border-radius:50%;background:#101a12;display:grid;place-items:center;color:#c5f36a;font-size:36px;font-weight:900}
 .private-avatar img{width:100%;height:100%;object-fit:cover;border-radius:50%}.private-avatar span{position:absolute;right:-3px;bottom:0;width:31px;height:31px;border:2px solid #0c1a11;border-radius:50%;background:#c5f36a;color:#10170e;display:grid;place-items:center;font-size:14px}
 .private-identity-copy{min-width:0}.private-identity-copy h2{font-size:28px;line-height:1;margin:0 0 10px;white-space:nowrap}.private-identity-copy h2 b{display:inline-grid;place-items:center;margin-left:7px;width:19px;height:19px;border-radius:50%;background:#c5f36a;color:#10170e;font-size:12px}
 .private-identity-copy>div{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.private-identity-copy small{font:11px monospace;color:#b3c0b4}.private-identity-copy em{font:700 9px monospace;font-style:normal;letter-spacing:.1em;color:#c5f36a;border:1px solid #476a38;border-radius:20px;padding:5px 8px}
 .private-identity-copy p{margin:10px 0 0;font-size:12px;color:#d5ded4}
 .private-identity-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:17px}.private-identity-actions a,.private-identity-actions button{height:54px;border:1px solid #c5f36a;border-radius:14px;background:#c5f36a;color:#11180e;display:grid;place-items:center;text-decoration:none;font-size:14px;font-weight:800}.private-identity-actions button{background:#0b150e;color:#c5f36a}
 .private-prediction-card{margin-top:13px;padding:16px;border:1px solid #35563c;border-radius:20px;background:#0d1a12}
 .private-card-top{display:flex;align-items:center;justify-content:space-between;gap:8px}.private-card-top>small,.private-section>small{font:700 9px monospace;letter-spacing:.17em;color:#c5f36a}.private-card-top>span{font:9px monospace;color:#c5f36a;border:1px solid #365b3b;border-radius:20px;padding:5px 8px}
 .private-prediction-card h3{font-size:17px;margin:13px 0 4px}.private-prediction-card p{margin:0 0 13px;color:#aab7a4;font-size:12px}.private-prediction-card>a{height:52px;border-radius:13px;background:#c5f36a;color:#11180e;text-decoration:none;display:grid;place-items:center;font-size:14px;font-weight:850}
 .private-rating-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:13px 0}
 .private-rating-card{min-width:0;padding:16px 13px;border:1px solid #89ae3d;border-radius:19px;background:linear-gradient(145deg,#17291a,#0b140e);display:flex;flex-direction:column;align-items:flex-start}
 .private-rating-card.weekly{border-color:#26382d;background:#0d1510}.private-rating-card small{font:700 9px monospace;letter-spacing:.15em;color:#c5f36a}.private-rating-card.weekly small{color:#89968c}
 .private-rating-card strong{font:900 39px monospace;letter-spacing:-.07em;color:#c5f36a;line-height:1.15;margin:5px 0}.private-rating-card.weekly strong{color:#f0f2ed}
 .private-rating-card span{font-size:12px;color:#c2ccc0}.private-rating-card.weekly span b{color:#c5f36a}.private-rating-card p{font-size:11px;line-height:1.35;color:#8f9b90;margin:5px 0 0}
 .private-earnings-card{margin:13px 0;padding:16px;border:1px solid #715b2b;border-radius:19px;background:linear-gradient(145deg,#211d0d,#10140d)}
 .private-earnings-card>.private-card-top>small{color:#e8c75b}.private-earnings-card>.private-card-top>span{color:#d2d8ca;border-color:#4c4b31}
 .private-earnings-card>strong{display:block;margin:9px 0 2px;font:900 37px monospace;letter-spacing:-.06em;color:#f0d34d}.private-earnings-card>p{margin:0;color:#aeb6a8;font-size:12px}
 .private-cashout-box{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding:13px;border:1px dashed #66552c;border-radius:14px;background:#15170e}
 .private-cashout-box>div{display:grid;gap:7px}.private-cashout-box small{font:700 9px monospace;letter-spacing:.15em;color:#e2c65a}.private-cashout-box b{font:900 25px monospace;color:#f0d34d}.private-cashout-box>span{text-align:right;font:10px monospace;color:#aeb6a8;line-height:1.6}
 .private-cashout-button{width:100%;height:52px;margin-top:12px;border:1px solid #b69a45;border-radius:13px;background:transparent;color:#e9cb5a;font-size:13px;font-weight:800}
 .private-cashout-help{display:block;margin-top:9px;color:#8f998b;font-size:10px}
 .private-inline-notice{position:relative;margin-top:10px;padding:10px 32px 10px 10px;border-radius:9px;background:#172318;color:#bdcbb8;font-size:11px;line-height:1.5}.private-inline-notice button{position:absolute;right:7px;top:5px;border:0;background:none;color:#c5f36a;font-size:18px}
 .private-wager-card{margin:13px 0;padding:16px;border:1px solid #315b3e;border-radius:19px;background:linear-gradient(145deg,#10291a,#0b150f)}
 .private-wager-card .private-card-top>small{color:#c5f36a}.private-wager-card .private-card-top>span{color:#d2d8ca;border-color:#31543b}
 .private-wager-card>strong{display:block;margin:12px 0 4px;color:#c5f36a;font-size:20px}.private-wager-card>p{margin:0;color:#aab7a4;font-size:11px}
 .private-wager-stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:14px}.private-wager-stats>div{display:grid;justify-items:center;gap:4px;border-right:1px solid #2d4433}.private-wager-stats>div:last-child{border:0}.private-wager-stats b{font:800 17px monospace;color:#d0f77b}.private-wager-stats span{font-size:10px;color:#9eaa9b}
 .private-wager-foot{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid #ffffff16;color:#9eaa9b;font-size:10px}.private-wager-foot button{border:1px solid #47633d;border-radius:20px;background:#0b150e;color:#c5f36a;padding:6px 9px;font-size:10px}
 .private-section{margin-top:13px;padding:16px;border:1px solid #252f29;border-radius:19px;background:#0d1510}.private-section>small{color:#929f94}.private-section h2{font-size:21px;margin:7px 0 10px}.private-section>p{margin:0 0 12px;color:#aab5aa;font-size:11px;line-height:1.5}
 .private-setting-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid #25332a}.private-setting-row>div{display:grid;gap:4px}.private-setting-row b{font-size:13px}.private-setting-row span{font-size:10px;color:#8e9b90}
 .toggle{width:48px;height:27px;flex:none;border:0;border-radius:20px;background:#39443b;padding:3px;display:flex;justify-content:flex-start}.toggle i{width:21px;height:21px;border-radius:50%;background:#e3e8df;transition:transform .15s}.toggle.on{background:#c5f36a;justify-content:flex-end}.toggle.on i{background:#13200f}
 .private-account-section>a{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 0;border-top:1px solid #25332a;text-decoration:none;color:#f0f4ed}.private-account-section>a>div{display:grid;gap:4px}.private-account-section>a b{font-size:13px}.private-account-section>a span{font-size:10px;color:#8e9b90}.private-account-section>a>i{font-size:23px;color:#8e9b90;font-style:normal}
 .private-stat-row{display:grid;grid-template-columns:repeat(4,1fr);margin-top:13px;padding:14px 3px;border:1px solid #252f29;border-radius:18px;background:#0d1510}.private-stat-row>div{display:grid;justify-items:center;gap:5px;border-right:1px solid #2c3a30}.private-stat-row>div:last-child{border:0}.private-stat-row b{font:900 25px monospace;color:#c5f36a}.private-stat-row span{font-size:11px;color:#9ba79c}
 @media(max-width:480px){.private-profile{margin:6px auto 90px}.private-identity-card{padding:17px 14px}.private-avatar{width:100px;height:100px}.private-identity-copy h2{font-size:26px}.private-rating-card{padding:14px 11px}.private-rating-card strong{font-size:35px}.private-earnings-card>strong{font-size:34px}.private-stat-row b{font-size:22px}}
 `}</style></main>;
}
