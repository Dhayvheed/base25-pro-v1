"use client";

import { useEffect, useMemo, useState } from "react";
import WeeklyLeaderboardRows, { getBoardmanSlayerPlayerIds } from "@/components/WeeklyLeaderboardRows";
import { getBoardmanBonusData } from "@/lib/boardman-bonus";
import { calculatePeriodLeaderboard, type PeriodPlayer, type PeriodMatch, type PeriodRack } from "@/lib/leaderboard-period";
import { supabase } from "@/lib/supabase";

type FilterKey = "this_week" | "last_week" | "last_2_weeks" | "last_3_weeks" | "last_4_weeks" | "last_month" | "last_2_months" | "all_time" | "custom";
type Row = PeriodPlayer & { elo_rating: number; wins: number; losses: number; matches_played: number; win_percentage: number; boardmanBonusPoints?: number; hasBoardmanSlayerBadge?: boolean };

const options: {key: FilterKey; label: string}[] = [
  {key:"this_week",label:"This Week"},{key:"last_week",label:"Last Week"},
  {key:"last_2_weeks",label:"Last 2 Weeks"},{key:"last_3_weeks",label:"Last 3 Weeks"},
  {key:"last_4_weeks",label:"Last 4 Weeks"},{key:"last_month",label:"Last Month"},
  {key:"last_2_months",label:"Last 2 Months"},{key:"all_time",label:"All Time"},
];

function lagosDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA",{timeZone:"Africa/Lagos",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
  const val=(k:string)=>parts.find(p=>p.type===k)?.value||"";
  return new Date(Number(val("year")),Number(val("month"))-1,Number(val("day")));
}
function isoDay(d:Date){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-");}
function weekStart(d:Date){const x=new Date(d);x.setDate(x.getDate()-((x.getDay()+1)%7));return x;}
function boundaries(key:FilterKey, now:Date, customStart:string, customEnd:string){
  const today=lagosDate(now), current=weekStart(today);
  if(key==="all_time")return {start:null as Date|null,end:null as Date|null};
  if(key==="custom"){
    const start=new Date((customStart||isoDay(today))+"T00:00:00");
    const end=new Date((customEnd||customStart||isoDay(today))+"T00:00:00");end.setDate(end.getDate()+1);
    return {start,end};
  }
  if(key==="this_week")return {start:current,end:new Date(current.getTime()+7*86400000)};
  if(key==="last_week"){const end=current;const start=new Date(end);start.setDate(start.getDate()-7);return {start,end};}
  if(key==="last_2_weeks"||key==="last_3_weeks"||key==="last_4_weeks"){
    const weeks=Number(key.split("_")[1]);const start=new Date(current);start.setDate(start.getDate()-(weeks-1)*7);
    return {start,end:new Date(current.getTime()+7*86400000)};
  }
  const monthStart=new Date(today.getFullYear(),today.getMonth(),1);
  const months=key==="last_month"?1:2;
  const end=monthStart;const start=new Date(monthStart.getFullYear(),monthStart.getMonth()-months,1);
  return {start,end};
}
function dayLabel(d:Date){return d.toLocaleDateString("en-NG",{day:"numeric",month:"short",year:"numeric"});}
function rangeLabel(start:Date|null,end:Date|null,key:FilterKey){
  if(key==="all_time")return "All Time";
  if(!start||!end)return "Select dates";
  const last=new Date(end);last.setDate(last.getDate()-1);
  return start.getTime()+86400000===end.getTime()?dayLabel(start):dayLabel(start)+" – "+dayLabel(last);
}

export default function LeaderboardPeriodFilter({initialPlayers}:{initialPlayers:Row[]}){
  const [filter,setFilter]=useState<FilterKey>("this_week");
  const [open,setOpen]=useState(false);
  const [customStart,setCustomStart]=useState(isoDay(lagosDate()));
  const [customEnd,setCustomEnd]=useState(isoDay(lagosDate()));
  const [rows,setRows]=useState<Row[]>(initialPlayers);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");\n  const [showAll,setShowAll]=useState(false);
  const [now]=useState(()=>new Date());
  const range=useMemo(()=>boundaries(filter,now,customStart,customEnd),[filter,now,customStart,customEnd]);
  const label=rangeLabel(range.start,range.end,filter);

  useEffect(()=>{
    let alive=true;
    async function load(){
      if(!supabase)return;
      if(filter==="this_week"){setRows(initialPlayers);return;}
      setBusy(true);setMessage("");
      try{
        const [playersResult,matchesResult]=await Promise.all([
          supabase.from("players").select("id,player_code,username,photo_url,designation,created_at,elo_rating"),
          (async()=>{
            let q=supabase.from("matches").select("id,played_at,created_at,player_one_id,player_two_id,winner_id");
            if(range.start)q=q.gte("played_at",range.start.toISOString());
            if(range.end)q=q.lt("played_at",range.end.toISOString());
            return q.order("played_at",{ascending:true}).order("created_at",{ascending:true}).order("id",{ascending:true});
          })()
        ]);
        if(playersResult.error)throw playersResult.error;
        if(matchesResult.error)throw matchesResult.error;
        const matches=(matchesResult.data||[]) as PeriodMatch[];
        const matchIds=matches.map(m=>m.id);
        let racks:PeriodRack[]=[];
        for(let i=0;i<matchIds.length;i+=100){
          const {data,error}=await supabase.from("match_racks").select("match_id,rack_number,winner_id,loser_balls_remaining,black_ball_finish").in("match_id",matchIds.slice(i,i+100));
          if(error)throw error;racks.push(...((data||[]) as PeriodRack[]));
        }
        const players=(playersResult.data||[]) as (PeriodPlayer & {elo_rating:number})[];
        if(filter==="all_time"){
          const stats=new Map<string,{played:number;wins:number}>();
          for(const m of matches){for(const id of [m.player_one_id,m.player_two_id]){const s=stats.get(id)||{played:0,wins:0};s.played++;if(m.winner_id===id)s.wins++;stats.set(id,s);}}
          const result=players.filter(p=>stats.has(p.id)).map(p=>{
            const s=stats.get(p.id)!;return {...p,elo_rating:Number(p.elo_rating||1000),matches_played:s.played,wins:s.wins,losses:s.played-s.wins,win_percentage:s.played?Math.round(1000*s.wins/s.played)/10:0,boardmanBonusPoints:0};
          }).sort((a,b)=>b.elo_rating-a.elo_rating);
          if(alive)setRows(result);
        }else{
          if(!range.start||!range.end)throw new Error("Choose a valid date range.");
          const bonusData=await getBoardmanBonusData(supabase);\n          const result=calculatePeriodLeaderboard(players,matches,racks,range.start.toISOString(),new Set(bonusData.bonusByMatchId.keys()));
          if(alive)setRows(result);
        }
      }catch(e){if(alive)setMessage("Couldn't load this leaderboard period. Please try again.");}
      finally{if(alive)setBusy(false);}
    }
    load();return()=>{alive=false;};
  },[filter,customStart,customEnd,range.start?.getTime(),range.end?.getTime(),initialPlayers]);

  const select=(key:FilterKey)=>{setFilter(key);setShowAll(false);setOpen(false);};\n  const visibleRows=showAll?rows:rows.slice(0,5);
  return <section className="competition-ref-leaderboard" id="weekly-leaderboard">
    <div className="competition-ref-leaderboard-heading">
      <div><h2>{filter==="this_week"?"This week's leaderboard":"Leaderboard"}</h2><small className="period-current-label">{label}</small></div>
      <button type="button" className={"period-filter-trigger"+(open?" active":"")} aria-label="Filter leaderboard" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>
        <span>Filter</span>
      </button>
    </div>
    {open&&<div className="period-filter-backdrop" onClick={()=>setOpen(false)}>
      <div className="period-filter-sheet" role="dialog" aria-modal="true" aria-label="Filter leaderboard" onClick={e=>e.stopPropagation()}>
        <div className="period-sheet-grabber"/>
        <div className="period-sheet-heading"><div><strong>Leaderboard filters</strong><small>Choose a period or exact dates</small></div><button type="button" aria-label="Close filters" onClick={()=>setOpen(false)}>×</button></div>
        <div className="period-options">{options.map(o=><button type="button" key={o.key} className={filter===o.key?"selected":""} onClick={()=>select(o.key)}>{o.label}{filter===o.key&&<span>✓</span>}</button>)}</div>
        <div className="period-calendar">
          <strong>Custom date range</strong>
          <label>From<input type="date" value={customStart} max={customEnd||undefined} onChange={e=>setCustomStart(e.target.value)}/></label>
          <label>To<input type="date" value={customEnd} min={customStart||undefined} onChange={e=>setCustomEnd(e.target.value)}/></label>
          <button type="button" className="period-apply" onClick={()=>select("custom")}>Apply dates</button>
        </div>
      </div>
    </div>}
    <div className="competition-ref-table-head" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 48px 46px",alignItems:"center",gap:10,padding:"4px 10px 8px 80px",color:"#9aa69f",font:"10px 'JetBrains Mono',monospace",letterSpacing:"1.5px"}}>
      <span>PLAYER</span><span style={{textAlign:"right"}}>RECORD</span><span style={{textAlign:"right"}}>RATING</span>
    </div>
    {busy?<p className="competition-ref-empty">Loading {label} standings…</p>:message?<p className="competition-ref-empty">{message}</p>:rows.length===0?<p className="competition-ref-empty">No matches recorded in this period.</p>:<div className="competition-ref-rows"><WeeklyLeaderboardRows players={visibleRows.map(p=>({...p,hasBoardmanSlayerBadge:false,boardmanBonusPoints:p.boardmanBonusPoints||0}))} variant="competition"/></div>}\n    {rows.length>5&&!busy&&!message&&<button type="button" className="period-show-all" onClick={()=>setShowAll(v=>!v)}>{showAll?"Show less":"View full leaderboard"} <span>{showAll?"↑":"→"}</span></button> }
    <style jsx>{`
      .competition-ref-leaderboard-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .competition-ref-leaderboard-heading h2{margin:0}
      .period-current-label{display:block;margin-top:4px;color:#9aa69f;font-size:11px}
      .period-show-all{width:calc(100% - 8px);min-height:58px;display:flex;align-items:center;justify-content:center;gap:12px;margin:18px 4px 0;border:0;border-radius:15px;background:#c8f169;color:#0a0e0c;font-size:17px;font-weight:900;cursor:pointer}\n      .period-filter-trigger{display:flex;align-items:center;gap:7px;padding:9px 12px;border:1px solid #35483a;border-radius:12px;background:#17221b;color:#c8f169;font-size:12px;font-weight:800;cursor:pointer}
      .period-filter-trigger.active{background:#c8f169;color:#0a0e0c}
      .period-filter-backdrop{position:fixed;inset:0;z-index:1000;display:flex;align-items:flex-end;justify-content:center;background:#000a}
      .period-filter-sheet{width:min(100%,560px);max-height:86dvh;overflow:auto;padding:12px 18px calc(24px + env(safe-area-inset-bottom));border:1px solid #304438;border-bottom:0;border-radius:24px 24px 0 0;background:#101813;color:#f4f5f2;box-shadow:0 -16px 50px #0008}
      .period-sheet-grabber{width:42px;height:4px;margin:0 auto 18px;border-radius:9px;background:#536258}
      .period-sheet-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
      .period-sheet-heading div{display:grid;gap:4px}.period-sheet-heading strong{font-size:18px}.period-sheet-heading small{color:#9aa69f;font-size:12px}
      .period-sheet-heading button{width:34px;height:34px;border:1px solid #344438;border-radius:50%;background:#1b271f;color:#fff;font-size:23px}
      .period-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
      .period-options button{display:flex;justify-content:space-between;align-items:center;min-height:45px;padding:0 12px;border:1px solid #29392e;border-radius:12px;background:#151f19;color:#dce4dd;font-size:13px;font-weight:650;text-align:left}
      .period-options button.selected{border-color:#c8f169;background:#24351e;color:#c8f169}
      .period-calendar{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:19px;padding-top:16px;border-top:1px solid #29392e}
      .period-calendar>strong{grid-column:1/-1;font-size:14px}
      .period-calendar label{display:grid;gap:7px;color:#9eaaa1;font-size:11px}
      .period-calendar input{width:100%;box-sizing:border-box;padding:11px 8px;border:1px solid #344438;border-radius:10px;background:#18231c;color:#fff;color-scheme:dark;font-size:13px}
      .period-apply{grid-column:1/-1;min-height:46px;border:0;border-radius:12px;background:#c8f169;color:#0a0e0c;font-weight:900}
      @media(min-width:700px){.period-filter-backdrop{align-items:center;padding:20px}.period-filter-sheet{border:1px solid #304438;border-radius:22px}.period-filter-trigger{padding:10px 14px}}
    `}</style>
  </section>;
}
