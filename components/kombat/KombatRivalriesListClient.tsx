"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {supabase} from "@/lib/supabase";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {FighterTile} from "@/components/kombat/KombatUI";
import {RIVALRY_DATA_IS_SAMPLE,SAMPLE_FEATURED_RIVALRY,SAMPLE_RIVALRIES,SAMPLE_RIVALRY_TOTAL,RIVALRY_STATUS_CONFIG,type RivalrySample,type RivalryResult} from "@/lib/kombat/rivalries-data";

type Sort="hottest"|"meetings"|"recent"|"one-sided";
type Status="HEATED"|"ONGOING"|"ONE-SIDED";
const sortOptions:Array<{id:Sort;label:string}>=[{id:"hottest",label:"HOTTEST"},{id:"meetings",label:"MOST MEETINGS"},{id:"recent",label:"RECENT"},{id:"one-sided",label:"ONE-SIDED"}];
const count=(r:RivalrySample)=>({left:r.results.filter(x=>x==="L").length,right:r.results.filter(x=>x==="R").length});
const status=(r:RivalrySample):Status=>{const {left,right}=count(r),total=r.results.length;if(Math.abs(left-right)<=RIVALRY_STATUS_CONFIG.heatedMaxWinDifference)return "HEATED";if(Math.max(left,right)/Math.max(1,total)>=RIVALRY_STATUS_CONFIG.oneSidedMinimumShare)return "ONE-SIDED";return "ONGOING"};
const latest=(r:RivalrySample)=>new Date(r.lastDate).getTime();
const dateLabel=(v:string)=>new Date(v).toLocaleDateString("en-GB",{day:"2-digit",month:"short"});
const winnerName=(r:RivalrySample,result:RivalryResult)=>result==="L"?r.leftName:r.rightName;
function streak(r:RivalrySample){const reversed=[...r.results].reverse();let n=0;for(const v of reversed){if(v!==reversed[0])break;n++}return {side:reversed[0],count:n}}
function summary(r:RivalrySample){const {left,right}=count(r),run=streak(r);if(run.count>=3)return winnerName(r,run.side)+" on a W"+run.count+" streak";if(left===right)return "Tied "+left+"-"+right;const lead=left>right?"L":"R",lastThree=r.results.slice(-3),wins=lastThree.filter(x=>x===lead).length;if(r.totalMeetings===3||r.totalMeetings===4)return winnerName(r,lead)+" won "+count(r)[lead==="L"?"left":"right"]+" of "+r.totalMeetings;return winnerName(r,lead)+" won "+wins+" of last 3"}
function Squares({r,featured=false}:{r:RivalrySample;featured?:boolean}){const aria="Last "+r.results.length+" meetings, oldest to newest: "+r.results.map(x=>winnerName(r,x)).join(", ");return <div className={"kombat-rivalry-squares"+(featured?" featured":"")} role="img" aria-label={aria}>{r.results.slice(-7).map((x,i)=><i key={i} className={x==="L"?"left":"right"}/>)}</div>}
function RivalryCard({r,featured=false}:{r:RivalrySample;featured?:boolean}){const s=status(r),c=count(r),leftLeads=c.left>c.right;return <article className={"kombat-rivalry-item"+(featured?" featured":"")}>
 <div className="kombat-rivalry-item-top"><span className={"kombat-rivalry-status "+s.toLowerCase()}>{s}</span><small>{r.totalMeetings} MEETINGS · LAST {dateLabel(r.lastDate).toUpperCase()}</small></div>
 <div className="kombat-rivalry-item-versus">
  <div className="kombat-rivalry-person left-person"><FighterTile slug={r.leftFighterSlug} name={r.leftFighterName} size={featured?"portrait":"compare"}/><b title={r.leftName}>{r.leftName}</b><small>{r.leftFighterName}</small></div>
  <div className="kombat-rivalry-record"><strong><span className={leftLeads?"leader":""}>{c.left}</span><i>–</i><span className={!leftLeads&&c.left!==c.right?"leader":""}>{c.right}</span></strong><small>{featured?"LAST 7 MEETINGS":"HEAD TO HEAD"}</small></div>
  <div className="kombat-rivalry-person right-person"><FighterTile slug={r.rightFighterSlug} name={r.rightFighterName} size={featured?"portrait":"compare"}/><b title={r.rightName}>{r.rightName}</b><small>{r.rightFighterName}</small></div>
 </div>
 <Squares r={r} featured={featured}/>
 {featured?<><p className="kombat-rivalry-last">{r.leftName===winnerName(r,r.results[r.results.length-1])?r.leftName:r.rightName} won the last meeting · {dateLabel(r.lastDate)}</p><div className="kombat-rivalry-feature-actions"><Link href={"/kombat/coming-soon/matches?players="+encodeURIComponent(r.leftPlayerId+","+r.rightPlayerId)}>ALL MEETINGS</Link><Link className="primary" href={"/kombat/coming-soon/rivalry?id="+encodeURIComponent(r.id)}>VIEW RIVALRY</Link></div></>:<p className="kombat-rivalry-summary">{summary(r)}</p>}
 </article>}
export default function KombatRivalriesClient(){
 const router=useRouter();
 const [view,setView]=useState<"all"|"mine">("all"),[sort,setSort]=useState<Sort>("hottest"),[visible,setVisible]=useState(4);
 const [userId,setUserId]=useState<string|null>(null),[authReady,setAuthReady]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{const p=new URLSearchParams(window.location.search);setView(p.get("view")==="mine"?"mine":"all");const s=p.get("sort");if(sortOptions.some(x=>x.id===s))setSort(s as Sort)},[]);
 useEffect(()=>{let alive=true;(async()=>{if(!supabase){if(alive){setAuthReady(true);setLoading(false)}return}try{const {data:{session}}=await supabase.auth.getSession();if(!alive)return;if(!session){setUserId(null);setAuthReady(true);setLoading(false);return}const {data,error:profileError}=await supabase.rpc("get_my_base25_player_profile");if(!alive)return;const profile=Array.isArray(data)?data[0]:data;if(profileError){setError("We couldn't identify your BASE25 player profile. Please retry.");setUserId(null)}else setUserId(profile?.id||null);setAuthReady(true);setLoading(false)}catch{if(alive){setError("We couldn't check your login. Please retry.");setAuthReady(true);setLoading(false)}}})();return()=>{alive=false}},[]);
 const changeUrl=useCallback((nextView:"all"|"mine",nextSort:Sort)=>{const p=new URLSearchParams(window.location.search);if(nextView==="all")p.delete("view");else p.set("view",nextView);if(nextSort==="hottest")p.delete("sort");else p.set("sort",nextSort);const q=p.toString();window.history.replaceState(null,"",window.location.pathname+(q?"?"+q:""))},[]);
 const chooseView=(v:"all"|"mine")=>{setView(v);setVisible(4);changeUrl(v,sort)};
 const chooseSort=(s:Sort)=>{setSort(s);setVisible(4);changeUrl(view,s)};
 const sorted=useMemo(()=>{let list=[...SAMPLE_RIVALRIES];if(view==="mine"){if(!userId)return [];list=list.filter(r=>r.leftPlayerId===userId||r.rightPlayerId===userId)}
  if(sort==="meetings")list.sort((a,b)=>b.totalMeetings-a.totalMeetings||latest(b)-latest(a));
  else if(sort==="recent")list.sort((a,b)=>latest(b)-latest(a));
  else if(sort==="one-sided")list=list.filter(r=>status(r)==="ONE-SIDED").sort((a,b)=>{const ca=count(a),cb=count(b);return Math.max(cb.left,cb.right)/b.results.length-Math.max(ca.left,ca.right)/a.results.length||latest(b)-latest(a)});
  else list.sort((a,b)=>{const order:Record<Status,number>={HEATED:0,ONGOING:1,"ONE-SIDED":2};return order[status(a)]-order[status(b)]||b.totalMeetings-a.totalMeetings||latest(b)-latest(a)});
  return list},[view,userId,sort]);
 const featured=useMemo(()=>view==="all"?SAMPLE_FEATURED_RIVALRY:null,[view]);
 const loginHref="/login?next="+encodeURIComponent("/kombat/rivalries?view=mine");
 const retry=()=>{setLoading(true);setError("");setAuthReady(false);const client=supabase;if(!client){setLoading(false);setAuthReady(true);return}client.auth.getUser().then(async({data})=>{if(!data.user){setUserId(null);setLoading(false);setAuthReady(true);return}const {data:profile,error:e}=await client.rpc("get_my_base25_player_profile");const p=Array.isArray(profile)?profile[0]:profile;if(e)setError("We couldn't identify your BASE25 player profile.");setUserId(p?.id||null);setLoading(false);setAuthReady(true)}).catch(()=>{setError("We couldn't check your login.");setLoading(false);setAuthReady(true)})};
 const sampleAll=view==="all";
 return <KombatPageShell active="rivalries" title="KOMBAT"><div className="kombat-rivalries-page">
  <header className="kombat-rivalries-intro"><small>MORTAL KOMBAT 11 · RECURRING MATCHUPS</small><h1>KOMBAT <em>RIVALRIES</em></h1><p>Players who keep meeting. A rivalry starts after 3 ranked meetings. Casual matches don't count.</p></header>
  <div className="kombat-rivalries-tabs" role="group" aria-label="Rivalry view"><button aria-pressed={view==="all"} className={view==="all"?"active":""} onClick={()=>chooseView("all")}>ALL RIVALRIES</button><button aria-pressed={view==="mine"} className={view==="mine"?"active":""} onClick={()=>chooseView("mine")}>MY RIVALRIES</button></div>
  {view==="mine"&&!userId&&authReady&&!loading?<section className="kombat-rivalry-login"><b>LOG IN TO SEE YOUR RIVALRIES</b><p>Your personal head-to-head battles, records and ongoing rivalries live here.</p><Link href={loginHref}>PLAYER LOGIN</Link></section>:null}
  {view==="mine"&&userId&&authReady&&!loading?<section className="kombat-rivalry-empty"><b>NO RIVALRIES YET</b><p>No rivalries yet. A rivalry starts after 3 ranked meetings with the same player.</p></section>:null}
  <div className="kombat-rivalries-sorts" role="group" aria-label="Sort rivalries">{sortOptions.map(s=><button type="button" aria-pressed={sort===s.id} className={sort===s.id?"active":""} key={s.id} onClick={()=>chooseSort(s.id)}>{s.label}</button>)}</div>
  {loading?<div className="kombat-rivalry-loading"><i/><i/><i/></div>:error?<section className="kombat-rivalry-empty" role="alert"><b>RIVALRIES UNAVAILABLE</b><p>{error}</p><button onClick={retry}>RETRY</button></section>:view==="mine"?null:<>
   {featured&&<section className="kombat-rivalry-feature"><div className="kombat-rivalry-feature-head"><small>RIVALRY OF THE WEEK</small><span className={"kombat-rivalry-status "+status(featured).toLowerCase()}>{status(featured)}</span></div><RivalryCard r={featured} featured/></section>}
   <div className="kombat-rivalries-list-head"><h2>MORE RIVALRIES</h2><small>{SAMPLE_RIVALRY_TOTAL} TOTAL</small></div>
   {sorted.slice(0,visible).map(r=><Link key={r.id} className="kombat-rivalry-link" href={"/kombat/coming-soon/rivalry?id="+encodeURIComponent(r.id)}><RivalryCard r={r}/></Link>)}
   {sorted.length>visible&&<button className="kombat-rivalry-load" onClick={()=>setVisible(v=>v+20)}>LOAD MORE RIVALRIES</button>}
  </>}
  <section className="kombat-rivalry-legend"><small>HOW STATUS WORKS</small><p><b className="heated">HEATED</b> the last 7 meetings are within one win</p><p><b className="ongoing">ONGOING</b> a lead, but not a big one</p><p><b className="one-sided">ONE-SIDED</b> one player won 75% or more</p><div><span><i className="left"/> left player won</span><span><i className="right"/> right player won · oldest to newest</span></div></section>
  {RIVALRY_DATA_IS_SAMPLE&&<p className="kombat-rivalry-sample-note">SAMPLE DATA · TODO: CONNECT TO REAL PUBLISHED RANKED MATCHES</p>}
 </div></KombatPageShell>
}
