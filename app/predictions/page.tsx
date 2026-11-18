"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import MatchupCalculator from "@/components/MatchupCalculator";
import { supabase } from "@/lib/supabase";

type Option={id:string;label:string;sort_order:number;player_id:string|null};
type Question={id:string;week_start:string;template_key:string|null;title:string;description:string|null;category:string;status:string;opens_at:string;locks_at:string;points_reward:number;points_ladder?:{day_index:number;minute_of_day:number;points:number;label?:string}[]|null;correct_option_id:string|null;options:Option[]};
type Profile={user_id:string;prediction_id:string;nickname:string;points:number};
type Entry={id:string;question_id:string;option_id:string;is_correct:boolean|null;points_awarded:number;points_at_lock:number|null;submitted_at:string};
type Leader={prediction_id:string;nickname:string;points:number};
const DAY=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const LADDERS:Record<string,{day_index:number;minute_of_day:number;points:number;label:string}[]> = {
 saturday_champion:[{day_index:6,minute_of_day:0,points:200,label:"Sat"}],
 weekly_leaderboard:[{day_index:0,minute_of_day:0,points:100,label:"Sun"},{day_index:1,minute_of_day:0,points:90,label:"Mon"},{day_index:2,minute_of_day:0,points:80,label:"Tue"},{day_index:3,minute_of_day:0,points:70,label:"Wed"},{day_index:4,minute_of_day:0,points:60,label:"Thu"},{day_index:5,minute_of_day:0,points:5,label:"Fri"}],
 top5_qualifier:[{day_index:0,minute_of_day:0,points:100,label:"Sun"},{day_index:1,minute_of_day:0,points:90,label:"Mon"},{day_index:2,minute_of_day:0,points:80,label:"Tue"},{day_index:3,minute_of_day:0,points:70,label:"Wed"},{day_index:4,minute_of_day:0,points:60,label:"Thu"},{day_index:5,minute_of_day:0,points:5,label:"Fri"}],
 most_wins:[{day_index:1,minute_of_day:0,points:100,label:"Mon"},{day_index:2,minute_of_day:0,points:90,label:"Tue"},{day_index:3,minute_of_day:0,points:80,label:"Wed"},{day_index:4,minute_of_day:0,points:70,label:"Thu"},{day_index:5,minute_of_day:0,points:5,label:"Fri"}],
 elo_improvement:[{day_index:2,minute_of_day:0,points:100,label:"Tue"},{day_index:3,minute_of_day:0,points:80,label:"Wed"},{day_index:4,minute_of_day:0,points:60,label:"Thu"},{day_index:5,minute_of_day:0,points:5,label:"Fri"}]
};
const TITLES:Record<string,string>={saturday_champion:"Who will win Saturday's final?",weekly_leaderboard:"Who will finish #1 on the weekly leaderboard?",top5_qualifier:"Which player will qualify for the Top 5?",most_wins:"Which player will record the most wins this week?",elo_improvement:"Which player will achieve the biggest ELO improvement?"};
function QuestionIcon({type}:{type:string}){const common={width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round" as const,strokeLinejoin:"round" as const};switch(type){case "saturday_champion":return <svg {...common}><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4M17 6h3v2a4 4 0 0 1-4 4"/></svg>;case "weekly_leaderboard":return <svg {...common}><path d="m3 8 5 5 4-8 4 8 5-5-2 12H5L3 8Z"/></svg>;case "top5_qualifier":return <svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M9.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>;case "most_wins":return <svg {...common}><path d="M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>;default:return <svg {...common}><path d="M3 17 9 11l4 4 8-9"/><path d="M15 6h6v6"/></svg>;}}
function weekStart(){const p=new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const v=Object.fromEntries(p.map(x=>[x.type,x.value]));const d=new Date(Date.UTC(+v.year,+v.month-1,+v.day));d.setUTCDate(d.getUTCDate()-((d.getUTCDay()+1)%7));return d.toISOString().slice(0,10);}
function lagosParts(date=new Date()){const p=new Intl.DateTimeFormat("en-GB",{timeZone:"Africa/Lagos",weekday:"short",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(date);return Object.fromEntries(p.map(x=>[x.type,x.value]));}
function currentStep(key:string,ladder:any[],now=new Date()){const p=lagosParts(now);const day=DAY.indexOf(p.weekday);const mins=Number(p.hour)*60+Number(p.minute);let step=ladder[0];for(const s of ladder){if(s.day_index<day||(s.day_index===day&&s.minute_of_day<=mins))step=s;}return step;}
function timeLeft(v:string){const n=new Date(v).getTime()-Date.now();if(n<=0)return "Closed";const d=Math.floor(n/86400000),h=Math.floor(n%86400000/3600000),m=Math.floor(n%3600000/60000);return d?d+"d "+h+"h":h?h+"h "+m+"m":m+"m";}
function qKey(q:Question){return q.template_key||q.id;}
function normalize(v:any):Question{return {...v,options:Array.isArray(v.options)?v.options:[]};}

export default function PredictionsPage(){
 const [userId,setUserId]=useState<string|null>(null),[profile,setProfile]=useState<Profile|null>(null);
 const [questions,setQuestions]=useState<Question[]>([]),[entries,setEntries]=useState<Entry[]>([]),[leaders,setLeaders]=useState<Leader[]>([]);
 const [players,setPlayers]=useState<{id:string;username:string;player_code:string}[]>([]);
 const [linked,setLinked]=useState(false),[admin,setAdmin]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null),[search,setSearch]=useState(""),[selected,setSelected]=useState<Record<string,string>>({});
 const [message,setMessage]=useState(""),[error,setError]=useState(""),[nickname,setNickname]=useState(""),[redeem,setRedeem]=useState("1000");
 const [adminOpen,setAdminOpen]=useState(false),[settle,setSettle]=useState<Record<string,string>>({}),[newTitle,setNewTitle]=useState(""),[newOptions,setNewOptions]=useState("");
 const [clock,setClock]=useState(new Date());
 const load=useCallback(async()=>{
  if(!supabase){setLoading(false);return;}
  setLoading(true);setError("");
  const [{data:{session}},{data:q,error:qe}]=await Promise.all([
   supabase.auth.getSession(),
   supabase.from("prediction_questions").select("id,week_start,template_key,title,description,category,status,opens_at,locks_at,points_reward,points_ladder,correct_option_id,options:prediction_options!prediction_options_question_id_fkey(id,label,sort_order,player_id)").eq("week_start",weekStart()).not("status","in","(draft,voided)").order("opens_at",{ascending:true})
  ]);
  if(qe)setError(qe.message);
  const qs=((q||[]) as any[]).map(normalize);setQuestions(qs);
  const uid=session?.user?.id||null;setUserId(uid);
  if(uid){
   const [{data:staff},{data:pr,error:profileError},{data:myEntries,error:entryError},{data:rankings}]=await Promise.all([
    supabase.rpc("is_prediction_admin"),
    supabase.rpc("ensure_prediction_profile",{p_nickname:null}),
    supabase.from("prediction_entries").select("id,question_id,option_id,is_correct,points_awarded,points_at_lock,submitted_at").eq("user_id",uid),
    supabase.from("prediction_profiles").select("prediction_id,nickname,points").order("points",{ascending:false}).limit(50)
   ]);
   setAdmin(staff===true);
   if(profileError){setLinked(false);setProfile(null);if(!profileError.message?.includes("assigned, registered BASE25 players only"))setError(profileError.message);}
   else{const row=(Array.isArray(pr)?pr[0]:pr) as Profile|null;setProfile(row);setLinked(!!row);if(row)setNickname(row.nickname);}
   if(entryError)setError(entryError.message);setEntries((myEntries||[]) as Entry[]);setLeaders((rankings||[]) as Leader[]);
  }else{setProfile(null);setLinked(false);setEntries([]);setLeaders([]);setAdmin(false);}
  const {data:pl}=await supabase.from("players").select("id,username,player_code").eq("account_status","active").order("username");
  setPlayers((pl||[]) as any[]);
  setLoading(false);
 },[]);
 useEffect(()=>{void load();if(!supabase)return;const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>{window.setTimeout(()=>void load(),0);});const timer=window.setInterval(()=>setClock(new Date()),30000);return()=>{subscription.unsubscribe();window.clearInterval(timer);};},[load]);
 const entryByQuestion=useMemo(()=>Object.fromEntries(entries.map(e=>[e.question_id,e])),[entries]);
 const totalPicks=entries.filter(e=>questions.some(q=>q.id===e.question_id)).length;
 const weekPoints=entries.filter(e=>questions.some(q=>q.id===e.question_id)).reduce((s,e)=>s+(e.points_awarded||0),0);
 async function submit(q:Question){if(!supabase||!selected[q.id])return;const ladder=q.points_ladder?.length?q.points_ladder:LADDERS[qKey(q)]||[{day_index:0,minute_of_day:0,points:q.points_reward,label:"Now"}];const step=currentStep(qKey(q),ladder,clock);setBusy(true);setError("");setMessage("");const {error:e}=await supabase.rpc("submit_prediction_with_points",{p_question_id:q.id,p_option_id:selected[q.id],p_expected_points:step.points});if(e){setError(e.message.includes("POINTS_CHANGED:")?"The points changed while you were choosing. Please review the new value and lock your pick again.":e.message);}else{setMessage("Your prediction is locked in for "+step.points+" points.");setExpanded(null);setSearch("");await load();}setBusy(false);}
 async function saveNickname(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);const {data,error:e2}=await supabase.rpc("ensure_prediction_profile",{p_nickname:nickname.trim()});if(e2)setError(e2.message);else{setProfile((Array.isArray(data)?data[0]:data) as Profile);setMessage("Nickname saved.");}setBusy(false);}
 async function redeemPoints(e:FormEvent){e.preventDefault();if(!supabase||!profile)return;const n=Number(redeem);if(!Number.isInteger(n)||n<1000||n%1000!==0||n>profile.points){setError("Redeem in blocks of 1,000 points, up to your available balance.");return;}setBusy(true);const {data,error:e2}=await supabase.rpc("redeem_prediction_points",{p_points:n});if(e2)setError(e2.message);else{setMessage(n.toLocaleString()+" points redeemed for ₦"+(n/2).toLocaleString()+" game credit.");await load();}setBusy(false);}
 async function createQuestion(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);const opts=newOptions.split("\n").map(s=>s.trim()).filter(Boolean);const {error:e2}=await supabase.rpc("admin_create_prediction_question",{p_title:newTitle.trim(),p_description:"",p_category:"Weekly",p_locks_at:new Date(Date.now()+86400000).toISOString(),p_points_reward:50,p_options:opts});if(e2)setError(e2.message);else{setMessage("Question added.");setNewTitle("");setNewOptions("");await load();}setBusy(false);}
 async function settleQuestion(q:Question){if(!supabase||!settle[q.id])return;setBusy(true);const {data,error:e2}=await supabase.rpc("admin_settle_prediction_question",{p_question_id:q.id,p_correct_option_id:settle[q.id]});if(e2)setError(e2.message);else{setMessage("Result published. "+data+" correct picks.");await load();}setBusy(false);}
 const ordered=useMemo(()=>{const order=["saturday_champion","weekly_leaderboard","top5_qualifier","most_wins","elo_improvement"];return [...questions].sort((a,b)=>{const ai=order.indexOf(qKey(a)),bi=order.indexOf(qKey(b));return (ai<0?99:ai)-(bi<0?99:bi);});},[questions]);
 const pointsFor=(q:Question)=>{const l=q.points_ladder?.length?q.points_ladder:LADDERS[qKey(q)]||[{day_index:0,minute_of_day:0,points:q.points_reward,label:"Now"}];return currentStep(qKey(q),l,clock).points;};
 return <main className="shell redesign-shell"><SiteNavigation/><div className="pr-page">
  <header className="pr-header"><div className="pr-brand"><span className="pr-brand-mark">8</span><b>BASE25 <em>PRO</em></b></div><div className="pr-header-right"><span className="pr-bell">♧</span><span className="pr-user">{profile?.nickname?.slice(0,1).toUpperCase()||"?"}</span></div></header>
  {!loading&&!userId&&<div className="pr-notice">Sign in with your BASE25 account to make predictions. Everyone can view this week's questions.</div>}
  {!loading&&userId&&!linked&&<div className="pr-notice">Your account isn't linked to a player yet. Ask BASE25 staff to link the email on your login to your player profile, then sign in again.</div>}
  <section className="pr-hero"><div className="pr-eyebrow">WEEKLY PREDICTIONS</div><h1>Earn points. <strong>1,000 points = ₦500 free game</strong></h1><p>Five calls a week, worth up to 600 points (₦300). Pick early, because points fall every day a question stays open.</p><div className="pr-chips"><span>Free to play</span><span>Points for correct calls</span></div></section>
  {linked&&profile&&<section className="pr-profile"><div><small>YOUR PREDICTION ID</small><b>{profile.prediction_id}</b></div><div><small>POINTS BALANCE</small><strong>{profile.points.toLocaleString()}</strong></div><form onSubmit={saveNickname}><input aria-label="Prediction nickname" value={nickname} onChange={e=>setNickname(e.target.value)} minLength={2} maxLength={24}/><button disabled={busy}>Save</button></form></section>}
  <section className="pr-stats"><div><b>{totalPicks} of 5</b><span>Picks made</span></div><div><b>{weekPoints}</b><span>Points scored</span></div></section>
  <MatchupCalculator/>
  <section className="pr-section"><div className="pr-section-heading"><div className="pr-eyebrow">THIS WEEK</div><h2>{new Intl.DateTimeFormat("en-NG",{timeZone:"Africa/Lagos",weekday:"long"}).format(clock)}'s questions</h2></div>
   <div className="pr-question-list">{ordered.map((q)=>{const key=qKey(q);const ladder=q.points_ladder?.length?q.points_ladder:LADDERS[key]||[{day_index:0,minute_of_day:0,points:q.points_reward,label:"Now"}];const now=clock;const open=q.status==="open"&&new Date(q.opens_at)<=now&&new Date(q.locks_at)>now;const closed=q.status==="locked"||new Date(q.locks_at)<=now;const scheduled=new Date(q.opens_at)>now;const entry=entryByQuestion[q.id];const chosen=q.options.find(o=>o.id===entry?.option_id);const step=currentStep(key,ladder,now);const showPick=expanded===q.id;const past=ladder.filter(s=>s.day_index<Number(lagosParts(now).weekday==="Sun"?0:DAY.indexOf(lagosParts(now).weekday))||(s.day_index===DAY.indexOf(lagosParts(now).weekday)&&s.minute_of_day<=Number(lagosParts(now).hour)*60+Number(lagosParts(now).minute)));return <article className={"pr-question "+(key==="saturday_champion"?"pr-saturday-question":"")} key={q.id}><div className="pr-question-top"><div className={"pr-icon "+(key==="saturday_champion"?"pr-icon-gold":"")}><QuestionIcon type={key}/></div><div className="pr-question-title"><h3>{TITLES[key]||q.title}</h3>{key!=="saturday_champion"&&q.description&&<p>{q.description}</p>}</div>{key==="saturday_champion"?<span className="pr-lock-icon" aria-label="Locked"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg></span>:<span className="pr-points">{open?pointsFor(q):q.points_reward} pts</span>}</div>
    {key==="saturday_champion"?<div className="pr-saturday-info"><b>Not open yet · worth up to 200 pts</b><p>Opens Saturday 12:00am, once the Top 5 snapshot is taken. Closes 12:00pm.</p></div>:<div className="pr-ladder">{ladder.map((s,i)=>{const active=s.day_index===DAY.indexOf(lagosParts(now).weekday)&&s.minute_of_day<=Number(lagosParts(now).hour)*60+Number(lagosParts(now).minute);const elapsed= s.day_index<DAY.indexOf(lagosParts(now).weekday)||active;return <div className={"pr-step "+(active?"active ":"")+(elapsed&&!active?"past":"")} key={i}><b>{s.points}</b><small>{s.label||DAY[s.day_index]}</small></div>;})}</div>}
    {key!=="saturday_champion"&&<div className="pr-question-footer"><div><b className={open?"is-open":""}>{scheduled?"Not open yet":open?"Open":q.status==="settled"?"Resolved":closed?"Closed":"Waiting for data"}</b><small>{scheduled?"Opens "+new Date(q.opens_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos",weekday:"short",hour:"numeric",minute:"2-digit"}):open?"Closes "+new Date(q.locks_at).toLocaleString("en-NG",{timeZone:"Africa/Lagos",hour:"numeric",minute:"2-digit"}):q.status==="settled"?"Final result published":closed?"Result pending":"Waiting for required match data"}</small></div>
    {q.status==="settled"?<span className="pr-closed-pick">{entry?(entry.is_correct?"Correct · +"+entry.points_awarded+" pts":"Not quite"): "No pick"}</span>:open&&linked?<button className="pr-choose" onClick={()=>{setExpanded(showPick?null:q.id);setSearch("");setSelected(s=>({...s,[q.id]:entry?.option_id||""}));}}>{entry?"Change":"Choose"} <b>›</b></button>:open&&!linked?<Link className="pr-choose" href="/login?next=/predictions">Link account ›</Link>:entry?<span className="pr-closed-pick">Your pick · locked at {entry.points_at_lock??q.points_reward} pts</span>:null}
    </div>}
    {entry&&open&&<div className="pr-current-pick">Your pick · locked at {entry.points_at_lock??q.points_reward} pts <span>Changing your pick uses today's points</span></div>}
    {showPick&&open&&linked&&<div className="pr-picker"><input placeholder="Search players..." value={search} onChange={e=>setSearch(e.target.value)}/><div className="pr-player-options">{q.options.filter(o=>o.label.toLowerCase().includes(search.toLowerCase())).map(o=><button key={o.id} className={selected[q.id]===o.id?"selected":""} onClick={()=>setSelected(s=>({...s,[q.id]:o.id}))}>{o.label}</button>)}</div><div className="pr-picker-actions"><span>Lock in for {pointsFor(q)} pts</span><button disabled={!selected[q.id]||busy} onClick={()=>submit(q)}>Lock in for {pointsFor(q)} pts</button><button className="secondary" onClick={()=>setExpanded(null)}>Cancel</button></div></div>}
    {q.status==="settled"&&<div className="pr-result"><span>✓ Correct answer</span><b>{q.options.find(o=>o.id===q.correct_option_id)?.label||"Results coming soon"}</b></div>}
   </article>;})}</div>
  </section>
  <section className="pr-how"><h3>How points work</h3><p>Earlier picks earn more points. Your points are fixed on the day you pick. Changing a pick uses that day's points. Friday picks are worth 5 points. Predictions are free. No deposits, stakes or cash betting.</p></section>
  <section className="pr-ranking" id="prediction-rankings"><div className="pr-ranking-heading"><div><small>COMMUNITY RACE</small><h2>Prediction rankings</h2></div><span>Live</span></div>{leaders.length?leaders.map((l,i)=><div className="pr-leader" key={l.prediction_id}><b>{i+1}</b><span className="pr-avatar">{l.nickname.slice(0,1).toUpperCase()}</span><span className="pr-leader-name"><strong>{l.nickname}{profile?.prediction_id===l.prediction_id&&<em>You</em>}</strong><small>{l.prediction_id}</small></span><b>{l.points} pts</b></div>):<p>More players appear here as predictions are scored.</p>}</section>
  {linked&&profile&&<section className="pr-redeem"><div><small>YOUR POINTS, YOUR GAMES</small><h2>Redeem points for games</h2><p>Points carry forward across weeks. Redeemed points are deducted; the rest stays in your balance.</p><b>1,000 points = ₦500 game credit</b></div><form onSubmit={redeemPoints}><label>Points to redeem<input type="number" min="1000" step="1000" max={profile.points} value={redeem} onChange={e=>setRedeem(e.target.value)}/></label><span>You receive ₦{(Number(redeem||0)/2).toLocaleString()} game credit</span><button disabled={busy||profile.points<1000||Number(redeem)>profile.points}>Redeem</button></form></section>}
  {userId&&admin&&<section className="pr-admin"><button className="pr-admin-toggle" onClick={()=>setAdminOpen(!adminOpen)}>⚙ Owner controls · Manage questions <span>{adminOpen?"−":"›"}</span></button>{adminOpen&&<div className="pr-admin-body"><p>Questions repeat automatically every week. Changes to templates should apply from next week unless you choose otherwise.</p><div className="pr-admin-questions">{ordered.map(q=><div key={q.id}><b>{q.title}</b><span>{q.status}</span>{q.status!=="settled"&&new Date(q.locks_at)<=new Date()&&<div className="pr-admin-settle"><select value={settle[q.id]||""} onChange={e=>setSettle(s=>({...s,[q.id]:e.target.value}))}><option value="">Choose correct answer</option>{q.options.map(o=><option key={o.id} value={o.id}>{o.label}</option>)}</select><button disabled={!settle[q.id]||busy} onClick={()=>settleQuestion(q)}>Publish result</button></div>}</div>)}</div><form onSubmit={createQuestion}><h3>Add question</h3><input value={newTitle} onChange={e=>setNewTitle(e.target.value)} placeholder="Question text" required/><textarea value={newOptions} onChange={e=>setNewOptions(e.target.value)} placeholder="Player options, one per line" required/><button disabled={busy}>Add question</button></form></div>}</section>}
  {loading&&<p className="pr-muted">Loading predictions…</p>}
  {error&&<p className="pr-error">{error}</p>}{message&&<div className="pr-toast"><span>✓</span>{message}<button onClick={()=>setMessage("")}>×</button></div>}
  <footer className="pr-footer">Predictions are free. No deposits, stakes or cash betting. Points are game credit only and cannot be withdrawn as cash.</footer>
 </div>
 <style jsx>{`
.pr-page{width:min(100%,470px);margin:0 auto 110px;padding:0 14px 35px;color:#f3f7f2}.pr-header{height:62px;display:flex;align-items:center;justify-content:space-between}.pr-brand{display:flex;align-items:center;gap:9px;font-size:18px;font-style:italic}.pr-brand-mark{width:31px;height:31px;border:2px solid #d0f56c;border-radius:50%;display:grid;place-items:center;font:800 12px monospace}.pr-brand em{background:#c8f45f;color:#10150d;border-radius:6px;padding:3px 5px;font-style:normal}.pr-header-right{display:flex;align-items:center;gap:14px}.pr-bell{font-size:19px}.pr-user,.pr-avatar{width:31px;height:31px;border:2px solid #c8f45f;border-radius:50%;display:grid;place-items:center;color:#d3f56b;font-weight:800}.pr-notice{padding:12px;margin:8px 0 13px;border:1px solid #697d3f;border-radius:10px;color:#d8e5c6;background:#182318;font-size:11px;line-height:1.5}.pr-hero{padding:22px 18px 20px;border:1px solid #254b36;border-radius:17px;background:radial-gradient(ellipse at 95% 5%,#0d512f 0%,#10291d 42%,#101713 100%)}.pr-eyebrow,.pr-redeem small{font:800 9px 'DM Mono',monospace;letter-spacing:.19em;color:#c8f45f}.pr-hero h1{font-size:25px;line-height:1.13;margin:9px 0}.pr-hero h1 strong{color:#f0c83f}.pr-hero p{font-size:12px;color:#bdc8bf;line-height:1.6;margin:9px 0 14px}.pr-chips{display:flex;gap:7px;flex-wrap:wrap}.pr-chips span{padding:6px 10px;border:1px solid #36513e;border-radius:30px;color:#c9f46a;font-size:10px}.pr-chips span+span{color:#d5ddd5}.pr-profile{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px;margin-top:11px;border:1px solid #263a2d;border-radius:12px;background:#0e1511}.pr-profile>div{display:grid;gap:4px}.pr-profile small{font-size:8px;letter-spacing:.12em;color:#9ca99f}.pr-profile b{font-size:11px}.pr-profile strong{font:800 20px monospace;color:#c9f46a}.pr-profile form{display:flex;gap:4px}.pr-profile input{width:80px;min-width:0;background:#0b100d;border:1px solid #2c3d31;border-radius:6px;color:white;padding:7px;font-size:10px}.pr-profile button{background:#c8f45f;color:#111;border-radius:6px;padding:6px 8px;font-size:10px;font-weight:800}.pr-stats{display:grid;grid-template-columns:1fr 1fr;margin-top:11px;padding:14px;border:1px solid #27362e;border-radius:12px;background:#101713;text-align:center}.pr-stats>div+div{border-left:1px solid #344037}.pr-stats b,.pr-stats span{display:block}.pr-stats b{font:800 22px monospace}.pr-stats span{font-size:10px;color:#aeb9b0;margin-top:3px}.pr-section{margin-top:23px}.pr-section-heading h2{font-size:20px;margin:5px 0 12px}.pr-question-list{display:grid;gap:9px}.pr-question{padding:13px;border:1px solid #1e3026;border-radius:16px;background:#101713}.pr-question-top{display:grid;grid-template-columns:39px 1fr auto;gap:10px;align-items:start}.pr-icon{width:36px;height:36px;border-radius:10px;background:#14261b;color:#c8f45f;display:grid;place-items:center;font-size:18px}.pr-question-title h3{font-size:13px;line-height:1.32;margin:3px 0 0}.pr-question-title p{font-size:9px;color:#91a096;margin:5px 0 0}.pr-points{padding:5px 7px;border:1px solid #477044;border-radius:8px;color:#c8f45f;font:700 10px monospace;white-space:nowrap}.pr-ladder{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:5px;margin:11px 0;padding-bottom:10px;border-bottom:1px solid #26342c}.pr-step{min-width:0;display:grid;place-items:center;gap:3px;padding:8px 2px;border:1px solid #26342c;border-radius:9px;background:#0d1410;color:#c7d0c8}.pr-step b{font:700 12px monospace}.pr-step small{font-size:8px}.pr-step.active{background:#c8f45f;border-color:#c8f45f;color:#11180c}.pr-step.past:not(.active){opacity:.45;text-decoration:line-through}.pr-question-footer{display:flex;align-items:center;justify-content:space-between;gap:8px}.pr-question-footer>div{display:grid;gap:3px}.pr-question-footer>div b{font-size:10px;color:#d5dcd5}.pr-question-footer>div b.is-open{color:#c8f45f}.pr-question-footer small{font-size:9px;color:#91a096}.pr-choose{padding:10px 13px;border-radius:10px;background:#c8f45f;color:#10160c;font-size:11px;font-weight:850;white-space:nowrap}.pr-choose b{font-size:16px;margin-left:8px}.pr-closed-pick{font-size:10px;color:#b7c3b8;text-align:right}.pr-current-pick{margin-top:10px;padding-top:9px;border-top:1px solid #25342a;color:#d3f56b;font-size:10px}.pr-current-pick span{display:block;color:#9ba89e;margin-top:4px}.pr-picker{margin-top:12px;padding-top:12px;border-top:1px solid #28372e}.pr-picker>input{width:100%;padding:11px;border:1px solid #344638;border-radius:8px;background:#0a100c;color:white;font-size:11px}.pr-player-options{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:9px 0}.pr-player-options button{padding:9px;border:1px solid #2d3d32;border-radius:8px;background:#141d17;color:#dce5dc;text-align:left;font-size:10px}.pr-player-options button.selected{border-color:#c8f45f;background:#25351b;color:#d5f56b}.pr-picker-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.pr-picker-actions span{flex:1;color:#c8f45f;font-size:10px}.pr-picker-actions button{padding:9px 11px;border-radius:8px;background:#c8f45f;color:#111;font-size:10px;font-weight:800}.pr-picker-actions button.secondary{background:transparent;border:1px solid #405042;color:#d2ddd3}.pr-result{display:flex;justify-content:space-between;gap:8px;margin-top:11px;padding:10px;border-radius:9px;background:#14251a;font-size:10px}.pr-result span{color:#c8f45f}.pr-how{margin-top:12px;padding:14px;border:1px solid #25362c;border-radius:13px;background:#101713}.pr-how h3{font-size:12px;margin:0 0 8px}.pr-how p{font-size:10px;line-height:1.75;color:#bac4bb;margin:0}.pr-ranking{margin-top:22px}.pr-ranking-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.pr-ranking-heading small{font:800 8px monospace;letter-spacing:.17em;color:#99a69c}.pr-ranking-heading h2{font-size:19px;margin:4px 0 0}.pr-ranking-heading>span{border:1px solid #49623d;color:#c8f45f;border-radius:20px;padding:4px 10px;font-size:9px}.pr-leader{display:flex;align-items:center;gap:9px;padding:11px 10px;margin-top:7px;border:1px solid #25352b;border-radius:12px;background:#101713}.pr-leader>b:first-child{width:17px;color:#c8f45f;font-size:12px}.pr-leader-name{flex:1;min-width:0;display:grid;gap:3px}.pr-leader-name strong{font-size:11px}.pr-leader-name em{margin-left:7px;padding:2px 5px;border:1px solid #638b40;border-radius:9px;color:#c8f45f;font-size:8px;font-style:normal}.pr-leader-name small{font-size:8px;color:#8f9b92}.pr-leader>b:last-child{font-size:10px;white-space:nowrap}.pr-ranking>p{padding:13px;color:#94a197;font-size:10px}.pr-redeem{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px;padding:15px;border:1px solid #344c35;border-radius:13px;background:linear-gradient(120deg,#16261a,#0e1511)}.pr-redeem h2{font-size:16px;margin:6px 0}.pr-redeem p{font-size:10px;line-height:1.5;color:#aab7ad}.pr-redeem>div>b{display:inline-block;margin-top:5px;color:#c8f45f;font-size:9px}.pr-redeem form{display:grid;align-content:center;gap:7px}.pr-redeem label{display:grid;gap:5px;color:#aab7ad;font-size:9px}.pr-redeem input{width:100%;padding:9px;border:1px solid #344638;border-radius:7px;background:#0a100c;color:white}.pr-redeem form>span{font-size:9px;color:#c8f45f}.pr-redeem form button,.pr-admin-body form button{padding:10px;border-radius:8px;background:#c8f45f;color:#111;font-size:10px;font-weight:850}.pr-admin{margin-top:20px}.pr-admin-toggle{width:100%;display:flex;justify-content:space-between;padding:13px;border:1px solid #293c30;border-radius:10px;background:#0c120e;color:#d1dbd2;text-align:left;font-size:11px}.pr-admin-body{padding:12px;margin-top:8px;border:1px solid #2b3d30;border-radius:12px;background:#101713}.pr-admin-body>p{font-size:9px;line-height:1.5;color:#96a298}.pr-admin-questions>div{padding:10px 0;border-bottom:1px solid #29362d}.pr-admin-questions>div>b{display:block;font-size:10px}.pr-admin-questions>div>span{font-size:9px;color:#a3b09f}.pr-admin-settle{display:flex;gap:6px;margin-top:8px}.pr-admin-settle select,.pr-admin-body form input,.pr-admin-body form textarea{flex:1;min-width:0;padding:8px;border:1px solid #344638;border-radius:7px;background:#0a100c;color:white;font-size:9px}.pr-admin-settle button{padding:8px;border-radius:7px;background:#c8f45f;color:#111;font-size:9px}.pr-admin-body form{display:grid;gap:7px;margin-top:14px}.pr-admin-body form h3{font-size:12px}.pr-admin-body form textarea{min-height:55px}.pr-error{padding:10px;color:#ff9b92;font-size:10px}.pr-muted{color:#9ba89e;font-size:10px;padding:12px}.pr-toast{position:fixed;z-index:99;bottom:20px;left:50%;transform:translateX(-50%);width:min(440px,calc(100% - 24px));padding:13px;border:1px solid #8eb94c;border-radius:10px;background:#1b2a1c;color:#efffdd;font-size:11px;box-shadow:0 10px 30px #0009}.pr-toast span{color:#c8f45f;margin-right:8px}.pr-toast button{float:right;background:none;color:white;font-size:17px}.pr-footer{margin:20px 0;color:#7f8b81;font-size:9px;line-height:1.5}
/* Screenshot-specific card corrections */
.pr-question{background:#101512;border-color:#1F2A24;border-radius:19px;padding:15px}
.pr-question-top{grid-template-columns:48px minmax(0,1fr) auto;align-items:start;gap:12px}
.pr-icon{width:48px;height:48px;border-radius:13px;background:#12221A;color:#C8F169}
.pr-icon svg{width:26px;height:26px}
.pr-icon-gold{background:#19180E;color:#E8C547}
.pr-question-title h3{font-size:16px;line-height:1.32;font-weight:650}
.pr-lock-icon{width:30px;height:30px;display:grid;place-items:center;color:#89958E}
.pr-lock-icon svg{width:25px;height:25px;fill:none;stroke:currentColor;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.pr-saturday-question{padding:20px 15px 18px}
.pr-saturday-question .pr-question-top{grid-template-columns:48px minmax(0,1fr) 28px;align-items:start}
.pr-saturday-question .pr-question-title h3{white-space:normal}
.pr-saturday-info{margin-top:20px;padding-top:18px;border-top:1px solid #1F2A24}
.pr-saturday-info b{display:block;color:#89958E;font-size:14px;font-weight:500;line-height:1.5}
.pr-saturday-info p{margin:3px 0 0;color:#B4BEB8;font-size:14px;line-height:1.55}
.pr-question:not(.pr-saturday-question) .pr-question-top{grid-template-columns:48px minmax(0,1fr) auto}
.pr-question:not(.pr-saturday-question) .pr-points{font-size:14px;padding:5px 10px;border-radius:11px}
.pr-ladder{margin-top:14px}
.pr-step{padding:8px 2px}
.pr-step b{font-size:16px}
.pr-step small{font-size:11px}
.pr-question-footer{padding-top:13px;border-top:1px solid #1F2A24}
.pr-question-footer>div b{font-size:13px}
.pr-question-footer small{font-size:12px}
.pr-choose{min-width:125px;min-height:48px;font-size:15px}
@media(max-width:390px){.pr-question-top{grid-template-columns:44px minmax(0,1fr) auto;gap:9px}.pr-icon{width:44px;height:44px}.pr-saturday-question .pr-question-top{grid-template-columns:44px minmax(0,1fr) 26px}}

/* Reference-matched Predictions UI */
.pr-page{width:min(100%,430px);margin:0 auto 110px;padding:0 20px 35px;color:#F4F5F2}
.pr-header{height:58px;padding:0 0 4px}
.pr-brand{gap:10px;font-family:Inter,system-ui,sans-serif;font-size:19px;letter-spacing:-.5px;font-weight:800}
.pr-brand-mark{width:38px;height:38px;border:2px solid #C8F169;background:#111;border-radius:50%;font-size:11px}
.pr-brand em{background:#C8F169;color:#0A0E0C;border-radius:6px;padding:2px 6px}
.pr-header-right{gap:14px}
.pr-bell{font-size:22px;color:#F4F5F2}
.pr-user{width:34px;height:34px;font-size:14px}
.pr-notice{border-radius:14px;background:#12201A;border-color:#24402F;font-size:12px}
.pr-hero{margin-top:12px;padding:16px;border:1px solid #24402F;border-radius:20px;background:#12201A;box-shadow:none}
.pr-eyebrow,.pr-redeem small{font-family:'DM Mono','JetBrains Mono',monospace;font-size:11px;letter-spacing:2px;color:#C8F169}
.pr-hero h1{font-size:24px;line-height:1.15;letter-spacing:-.6px;margin:6px 0 0;font-weight:800}
.pr-hero h1 strong{color:#E8C547}
.pr-hero p{font-size:14px;line-height:1.5;color:#C9CFCB;margin:8px 0 12px}
.pr-chips{gap:8px}
.pr-chips span{font-size:12px;padding:4px 10px;border-color:#2F6B45;color:#C8F169}
.pr-chips span+span{border-color:#2B3A31;color:#D5DDD8}
.pr-profile{padding:9px 10px;margin-top:10px;gap:7px;border-radius:12px;background:#101512;border-color:#1F2A24;flex-wrap:wrap}
.pr-profile>div{gap:3px}
.pr-profile small{font-size:8px;letter-spacing:.1em}
.pr-profile b{font-size:10px}
.pr-profile strong{font-size:17px}
.pr-profile form{margin-left:auto}
.pr-profile input{width:74px}
.pr-stats{margin-top:10px;padding:14px 0;border:1px solid #1F2A24;border-radius:16px;background:#101512}
.pr-stats b{font-size:24px}
.pr-stats span{font-size:12px;color:#B4BEB8}
.pr-stats>div+div{border-left-color:#24402F}
.pr-section{margin-top:0}
.pr-section-heading{padding:24px 0 0}
.pr-section-heading .pr-eyebrow{color:#9AA69F}
.pr-section-heading h2{font-size:22px;letter-spacing:-.5px;margin:4px 0 0}
.pr-question-list{gap:10px;margin-top:10px}
.pr-question{padding:14px;border:1px solid #1F2A24;border-radius:18px;background:#101512}
.pr-question-top{grid-template-columns:40px minmax(0,1fr) auto;gap:12px}
.pr-icon{width:40px;height:40px;border-radius:10px;background:#12201A;color:#C8F169;font-size:20px}
.pr-question-title h3{font-size:16px;line-height:1.3;margin:0;font-weight:600}
.pr-question-title p{font-size:12px;color:#9AA69F;line-height:1.4}
.pr-points{padding:4px 10px;border:1px solid #2F6B45;border-radius:10px;color:#C8F169;font:700 14px Inter,system-ui,sans-serif}
.pr-ladder{gap:6px;margin:12px 0 0;padding:0 0 12px;border-bottom:1px solid #1F2A24}
.pr-step{padding:5px 0;border:1px solid #2B3A31;border-radius:10px;background:transparent;color:#9AA69F;font-size:11px}
.pr-step b{font:700 15px Inter,system-ui,sans-serif;color:#F4F5F2}
.pr-step small{font-size:11px}
.pr-step.active{background:#C8F169;border-color:#C8F169;color:#0A0E0C}
.pr-step.active b{color:#0A0E0C}
.pr-step.past:not(.active){opacity:.4;text-decoration:none}
.pr-step.past:not(.active) b{text-decoration:line-through}
.pr-question-footer{margin-top:12px;gap:10px}
.pr-question-footer>div{gap:2px}
.pr-question-footer>div b{font-size:12px}
.pr-question-footer small{font-size:12px;color:#9AA69F}
.pr-choose{min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:0 18px;border-radius:12px;background:#C8F169;color:#0A0E0C;font-size:15px;font-weight:700}
.pr-choose b{font-size:18px;margin-left:6px}
.pr-closed-pick{font-size:12px;color:#C9CFCB}
.pr-current-pick{margin-top:12px;padding-top:12px;border-top:1px solid #1F2A24;color:#C9CFCB;font-size:12px}
.pr-current-pick span{display:inline;color:#9AA69F;margin:0 0 0 4px}
.pr-picker{border-color:#1F2A24}
.pr-picker>input{padding:12px;border-radius:10px;font-size:13px}
.pr-player-options button{padding:11px;border-radius:10px;font-size:12px}
.pr-picker-actions button{padding:11px 14px;border-radius:10px;font-size:12px}
.pr-how{margin-top:12px;padding:15px;border:1px solid #1F2A24;border-radius:16px;background:#101512}
.pr-how h3{font-size:14px}
.pr-how p{font-size:12px;line-height:1.6;color:#B4BEB8}
.pr-ranking{margin-top:24px}
.pr-ranking-heading{margin-bottom:12px}
.pr-ranking-heading small{font-size:10px;letter-spacing:2px;color:#9AA69F}
.pr-ranking-heading h2{font-size:22px;letter-spacing:-.5px}
.pr-ranking-heading>span{border-color:#2F6B45;color:#C8F169;font-size:11px}
.pr-leader{padding:12px;margin-top:8px;border:1px solid #1F2A24;border-radius:14px;background:#101512}
.pr-leader-name strong{font-size:12px}
.pr-leader-name small{font-size:9px}
.pr-leader>b:last-child{font-size:12px}
.pr-redeem{border-radius:16px;background:#12201A;border-color:#2F6B45}
.pr-redeem h2{font-size:18px}
.pr-redeem p{font-size:11px}
.pr-admin-toggle{padding:15px;border-color:#1F2A24;border-radius:12px;background:#101512;font-size:12px}
.pr-footer{font-size:10px;color:#9AA69F}

@media(max-width:390px){.pr-page{padding-left:10px;padding-right:10px}.pr-hero h1{font-size:22px}.pr-question{padding:11px}.pr-question-top{grid-template-columns:34px 1fr auto;gap:7px}.pr-icon{width:32px;height:32px}.pr-points{font-size:9px;padding:5px}.pr-step b{font-size:10px}.pr-step small{font-size:7px}.pr-redeem{grid-template-columns:1fr}}
`}</style></main>;
}
