"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Player={id:string;username:string;player_code:string;elo_rating:number};
type MatchupPlayer=Player&{matches:number};
const expected=(a:number,b:number)=>1/(1+Math.pow(10,(b-a)/400));
const delta=(a:number,b:number,k:number)=>Math.round(k*(1-expected(a,b)));

export default function MatchupCalculator(){
 const [players,setPlayers]=useState<MatchupPlayer[]>([]);
 const [a,setA]=useState("");const [b,setB]=useState("");
 const [format,setFormat]=useState<"One rack"|"Best of 3">("One rack");
 const [open,setOpen]=useState(false);const [calculated,setCalculated]=useState(false);
 const [loading,setLoading]=useState(true);const [error,setError]=useState("");
 useEffect(()=>{let active=true;(async()=>{if(!supabase){setLoading(false);return;}const client=supabase;const {data:p,error:pe}=await client.from("players").select("id,username,player_code,elo_rating").order("username");if(pe){if(active)setError(pe.message);setLoading(false);return;}const {data:m,error:me}=await client.from("matches").select("player_one_id,player_two_id");if(me){if(active)setError(me.message);setLoading(false);return;}const list=((p||[]) as Player[]).map(x=>({...x,matches:(m||[]).filter((r:any)=>r.player_one_id===x.id||r.player_two_id===x.id).length}));if(active){setPlayers(list);setLoading(false);}})();return()=>{active=false}},[]);
 const one=players.find(p=>p.id===a),two=players.find(p=>p.id===b);
 const k=one&&two&&one.matches>=10&&two.matches>=10?24:40;
 const result=useMemo(()=>{if(!one||!two)return null;const pa=expected(one.elo_rating,two.elo_rating),pb=1-pa;return {pa,pb,aWin:delta(one.elo_rating,two.elo_rating,k),bWin:delta(two.elo_rating,one.elo_rating,k)}},[one,two,k]);
 const chooseA=(v:string)=>{setA(v);setCalculated(false);if(v===b)setB("");};
 const chooseB=(v:string)=>{setB(v);setCalculated(false);};
 return <section className="mc-wrap">
  <button className="mc-launch-card" onClick={()=>setOpen(v=>!v)} aria-expanded={open}><span className="mc-launch-icon"><svg viewBox="0 0 24 24"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/></svg></span><span className="mc-launch-copy"><strong>Matchup calculator</strong><small>Check your odds against any player</small></span><span className="mc-launch-chevron">›</span></button>
  {open&&<div className="mc-panel">
   <div className="mc-panel-head"><div><h3>Matchup calculator</h3><p>See the odds before you play</p></div><button onClick={()=>setOpen(false)} aria-label="Close calculator">×</button></div>
   <div className="mc-step">1. Choose two players</div>
   {loading?<p className="mc-hint">Loading registered players…</p>:error?<p className="mc-error">{error}</p>:<div className="mc-players">
    <div className="mc-player"><div className="mc-avatar">{one?.username?.[0]?.toUpperCase()||"A"}</div><b>{one?.username||"Choose player"}</b><small>{one?one.elo_rating.toLocaleString()+" rating":"Select a registered player"}</small><select aria-label="Choose first player" value={a} onChange={e=>chooseA(e.target.value)}><option value="">Change</option>{players.map(p=><option key={p.id} value={p.id}>{p.username} · {p.elo_rating}</option>)}</select></div>
    <span className="mc-vs">VS</span>
    <div className="mc-player"><div className="mc-avatar">{two?.username?.[0]?.toUpperCase()||"B"}</div><b>{two?.username||"Choose player"}</b><small>{two?two.elo_rating.toLocaleString()+" rating":"Select a registered player"}</small><select aria-label="Choose second player" value={b} onChange={e=>chooseB(e.target.value)}><option value="">Change</option>{players.filter(p=>p.id!==a).map(p=><option key={p.id} value={p.id}>{p.username} · {p.elo_rating}</option>)}</select></div>
   </div>}
   <div className="mc-step">2. Format</div><div className="mc-formats"><button className={format==="One rack"?"selected":""} onClick={()=>setFormat("One rack")}>One rack</button><button className={format==="Best of 3"?"selected":""} onClick={()=>setFormat("Best of 3")}>Best of 3</button></div>
   <button className="mc-calculate" disabled={!one||!two||loading} onClick={()=>setCalculated(true)}>▦ &nbsp; Calculate</button>
   {calculated&&result&&one&&two&&<div className="mc-result">
    <div className="mc-divider"/>
    <div className="mc-result-label">Win chance</div><div className="mc-prob-head"><div><b>{one.username}</b><strong>{Math.round(result.pa*100)}%</strong></div><div><b>{two.username}</b><strong>{Math.round(result.pb*100)}%</strong></div></div>
    <div className="mc-bar"><i style={{width:(result.pa*100)+"%"}}/></div><p className="mc-fav">{result.pa>=result.pb?one.username:two.username} is the slight favourite.</p>
    <div className="mc-result-label mc-stake-title">Rating points at stake</div><div className="mc-stakes"><div><small>If {one.username} wins</small><b>+{result.aWin} points</b><em>{two.username} −{result.aWin}</em></div><div><small>If {two.username} wins</small><b>+{result.bWin} points</b><em>{one.username} −{result.bWin}</em></div></div>
    <p className="mc-foot">Based on current ratings. Beating a higher-rated player earns more points, so upsets pay more.</p>
    <p className="mc-disclaimer">Estimate uses BASE25's current K-factor ({k}). Actual match ratings also include rack-margin bonuses, so the final change may differ. This calculator does not save a match or change ratings.</p>
   </div>}
  </div>}
  <style jsx>{`
.mc-wrap{margin:20px 0 0;padding:0;border:0;border-radius:0;background:transparent;color:#F4F5F2}
.mc-launch-card{width:100%;display:flex;align-items:center;gap:14px;padding:16px 20px;border:1.5px solid #267044;border-radius:28px;background:#101512;color:#F4F5F2;text-align:left;min-height:112px}
.mc-launch-icon{width:74px;height:74px;flex:0 0 74px;display:grid;place-items:center;border-radius:22px;background:#12221A;color:#C8F169}
.mc-launch-icon svg{width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.mc-launch-copy{min-width:0;flex:1;display:grid;gap:4px}
.mc-launch-copy strong{font-size:21px;line-height:1.2;font-weight:750}
.mc-launch-copy small{font-size:16px;line-height:1.35;color:#B4BEB8}
.mc-launch-chevron{font-size:36px;line-height:1;color:#C8F169;font-weight:300}
.mc-top{display:none}
@media(max-width:480px){.mc-launch-card{min-height:104px;padding:14px 16px;gap:12px;border-radius:27px}.mc-launch-icon{width:64px;height:64px;flex-basis:64px;border-radius:20px}.mc-launch-copy strong{font-size:19px}.mc-launch-copy small{font-size:14px}}

.mc-top{display:none}.mc-eyebrow{font:700 9px 'JetBrains Mono',monospace;letter-spacing:.16em;color:#c6f45f}.mc-top h2{margin:5px 0;font-size:19px}.mc-top p,.mc-panel-head p{margin:0;color:#9eaea3;font-size:12px}.mc-launch{padding:10px 13px;border:1px solid #536d48;border-radius:9px;color:#d3f76a;background:#111a14;font-size:11px;font-weight:750}.mc-panel{max-width:470px;margin:18px auto 0;padding:18px;border:1px solid #263c30;border-radius:13px;background:#080e0b}.mc-panel-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}.mc-panel-head h3{margin:0 0 5px;font-size:16px}.mc-panel-head button{width:28px;height:28px;border:1px solid #304237;border-radius:8px;background:#111914;color:#dce7dc;font-size:20px}.mc-step{margin:16px 0 9px;color:#a9b5ac;font-size:11px}.mc-players{display:grid;grid-template-columns:1fr 22px 1fr;gap:8px;align-items:center}.mc-player{min-width:0;display:flex;flex-direction:column;align-items:center;padding:13px 7px 10px;border:1px solid #263c30;border-radius:13px;background:#101713}.mc-avatar{display:grid;place-items:center;width:43px;height:43px;border:2px solid #c5f25e;border-radius:50%;color:#c5f25e;font-weight:800;font-size:17px;margin-bottom:8px}.mc-player b{font-size:12px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mc-player small{margin:3px 0 7px;color:#9eaaa1;font-size:10px}.mc-player select{max-width:100%;border:0;background:transparent;color:#c7f46b;font-size:10px;text-align:center}.mc-player option{background:#101713;color:white}.mc-vs{text-align:center;color:#8b9a8f;font-size:10px}.mc-formats{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:12px;background:#111914}.mc-formats button{padding:11px 5px;border-radius:9px;background:transparent;color:#c0c9c1;font-size:11px;font-weight:700}.mc-formats button.selected{background:#c7f36a;color:#10150d}.mc-calculate{width:100%;margin-top:16px;padding:14px;border-radius:11px;background:#c7f36a;color:#10150d;font-weight:850}.mc-calculate:disabled{opacity:.4}.mc-result{margin-top:20px}.mc-divider{height:1px;background:#1d2a22;margin-bottom:17px}.mc-result-label{color:#98a79c;font-size:10px}.mc-prob-head{display:flex;justify-content:space-between;margin:7px 0 10px}.mc-prob-head>div{display:flex;flex-direction:column;gap:4px}.mc-prob-head>div:last-child{text-align:right}.mc-prob-head b{font-size:12px}.mc-prob-head strong{font:800 28px 'JetBrains Mono',monospace;color:#c7f36a}.mc-bar{height:12px;overflow:hidden;border-radius:20px;background:#27372d}.mc-bar i{display:block;height:100%;background:#c7f36a;border-radius:20px}.mc-fav{margin:7px 0 18px;color:#8e9d92;font-size:10px}.mc-stake-title{margin-bottom:9px}.mc-stakes{display:grid;grid-template-columns:1fr 1fr;gap:8px}.mc-stakes>div{padding:12px;border:1px solid #24362b;border-radius:12px;background:#101713}.mc-stakes small,.mc-stakes b,.mc-stakes em{display:block}.mc-stakes small{color:#98a79c;font-size:10px}.mc-stakes b{margin:8px 0;color:#c7f36a;font:800 17px 'JetBrains Mono',monospace}.mc-stakes em{color:#e78d82;font-size:11px;font-style:normal}.mc-foot,.mc-disclaimer{margin:10px 0 0;color:#98a79c;font-size:10px;line-height:1.6}.mc-disclaimer{color:#738078}.mc-hint,.mc-error{color:#aab6aa;font-size:12px}.mc-error{color:#ff9999}@media(max-width:480px){.mc-panel{padding:14px}.mc-stakes b{font-size:14px}}
`}</style>
 </section>;
}
