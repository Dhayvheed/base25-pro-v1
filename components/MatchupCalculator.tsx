"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Player = { id:string; username:string; player_code:string; elo_rating:number };
type MatchupPlayer = Player & { matches:number };

function expected(a:number,b:number){return 1/(1+Math.pow(10,(b-a)/400));}
function ratingDelta(a:number,b:number,k:number,won:boolean){return Math.round(k*((won?1:0)-expected(a,b)));}

export default function MatchupCalculator(){
 const [players,setPlayers]=useState<MatchupPlayer[]>([]);
 const [a,setA]=useState(""); const [b,setB]=useState("");
 const [format,setFormat]=useState<"One Rack"|"Best of 3">("One Rack");
 const [expanded,setExpanded]=useState(false); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 useEffect(()=>{let live=true;(async()=>{if(!supabase){setLoading(false);return;}
  const {data:p,error:pe}=await supabase.from("players").select("id,username,player_code,elo_rating").eq("account_status","active").order("username");
  if(pe){if(live)setError(pe.message);setLoading(false);return;}
  const {data:m,error:me}=await supabase.from("matches").select("player_one_id,player_two_id");
  if(me){if(live)setError(me.message);setLoading(false);return;}
  const list=((p||[]) as Player[]).map(x=>({...x,matches:(m||[]).filter((r:any)=>r.player_one_id===x.id||r.player_two_id===x.id).length}));
  if(live){setPlayers(list);setLoading(false);}
 })();return()=>{live=false}},[]);
 const one=players.find(p=>p.id===a),two=players.find(p=>p.id===b);
 const k=one&&two&&one.matches>=10&&two.matches>=10?24:40;
 const result=useMemo(()=>{if(!one||!two)return null;const ea=expected(one.elo_rating,two.elo_rating);return {ea,eb:1-ea,aWin:ratingDelta(one.elo_rating,two.elo_rating,k,true),aLoss:ratingDelta(one.elo_rating,two.elo_rating,k,false),bWin:ratingDelta(two.elo_rating,one.elo_rating,k,true),bLoss:ratingDelta(two.elo_rating,one.elo_rating,k,false)}},[one,two,k]);
 return <section className="matchup-card">
  <div className="matchup-head"><div><div className="matchup-kicker">PREDICTION TOOL</div><h2>Matchup Calculator</h2><p>Compare two players using their live BASE25 ratings.</p></div><button type="button" onClick={()=>setExpanded(v=>!v)}>{expanded?"Close calculator":"Calculate matchup →"}</button></div>
  {expanded&&<div className="matchup-body">
   <div className="matchup-fields"><label>Player 1<select value={a} onChange={e=>setA(e.target.value)}><option value="">Select player</option>{players.map(p=><option key={p.id} value={p.id}>{p.username} · {p.player_code}</option>)}</select></label><label>Player 2<select value={b} onChange={e=>setB(e.target.value)}><option value="">Select player</option>{players.filter(p=>p.id!==a).map(p=><option key={p.id} value={p.id}>{p.username} · {p.player_code}</option>)}</select></label></div>
   <div className="matchup-format"><span>Match format</span><div><button className={format==="One Rack"?"active":""} onClick={()=>setFormat("One Rack")}>One Rack</button><button className={format==="Best of 3"?"active":""} onClick={()=>setFormat("Best of 3")}>Best of 3</button></div></div>
   {loading?<p>Loading registered players…</p>:error?<p className="matchup-error">{error}</p>:result&&one&&two?<div className="matchup-results">
    <div className="matchup-probs"><div><small>{one.username}</small><strong>{(result.ea*100).toFixed(1)}%</strong><span>Win probability</span></div><div><small>{two.username}</small><strong>{(result.eb*100).toFixed(1)}%</strong><span>Win probability</span></div></div>
    <div className="matchup-rating-grid"><div><b>{one.elo_rating}</b><small>{one.username} · Current ELO</small><p>Win: <strong>+{result.aWin}</strong> / Loss: <strong>{result.aLoss}</strong></p><p>After win: {one.elo_rating+result.aWin}</p></div><div><b>{two.elo_rating}</b><small>{two.username} · Current ELO</small><p>Win: <strong>+{result.bWin}</strong> / Loss: <strong>{result.bLoss}</strong></p><p>After win: {two.elo_rating+result.bWin}</p></div></div>
    <p className="matchup-note">K-factor used: {k}. BASE25 applies K=24 only when both players have at least 10 prior matches; otherwise K=40. Estimates show the core win/loss ELO change and exclude rack-margin bonuses, which depend on the recorded rack results. {format} does not change the rating formula. This is a simulation only—no match or rating is saved.</p>
   </div>:<p className="matchup-hint">Choose two different registered players to see their matchup.</p>}
  </div>}
  <style jsx>{`.matchup-card{margin:28px 0;padding:22px;border:1px solid #39483a;border-radius:17px;background:radial-gradient(ellipse at 90% 0%,#25351c,#111813 55%)}.matchup-head{display:flex;align-items:center;justify-content:space-between;gap:16px}.matchup-kicker{font:700 9px 'DM Mono';letter-spacing:.15em;color:#c5f36a}.matchup-head h2{margin:6px 0;font-size:22px}.matchup-head p,.matchup-hint{margin:0;color:#aab6aa;font-size:12px}.matchup-head>button{padding:12px 15px;border-radius:9px;background:#c5f36a;color:#111;font-weight:800;font-size:11px}.matchup-body{margin-top:20px;padding-top:18px;border-top:1px solid #354337}.matchup-fields,.matchup-probs,.matchup-rating-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.matchup-fields label{display:grid;gap:7px;color:#aab6aa;font-size:11px}.matchup-fields select{width:100%;padding:12px;border:1px solid #3b493e;border-radius:8px;background:#090e0b;color:white}.matchup-format{display:flex;align-items:center;justify-content:space-between;margin:16px 0;color:#aab6aa;font-size:11px}.matchup-format div{display:flex;gap:6px}.matchup-format button{padding:8px 12px;border:1px solid #445343;border-radius:8px;background:#0b100d;color:#d9e2d7}.matchup-format button.active{background:#c5f36a;color:#111;border-color:#c5f36a}.matchup-probs>div,.matchup-rating-grid>div{padding:15px;border:1px solid #364437;border-radius:11px;background:#0d140f}.matchup-probs small,.matchup-probs span,.matchup-rating-grid small{display:block;color:#aab6aa;font-size:10px}.matchup-probs strong{display:block;margin:8px 0;color:#d2f56e;font:800 29px 'DM Mono'}.matchup-rating-grid{margin-top:10px}.matchup-rating-grid b{font:800 23px 'DM Mono';color:#e7f2df}.matchup-rating-grid p{margin:10px 0 0;color:#aab6aa;font-size:11px}.matchup-rating-grid p strong{color:#d2f56e}.matchup-note{margin:13px 0 0;color:#94a194;font-size:10px;line-height:1.65}.matchup-error{color:#ff9292}@media(max-width:600px){.matchup-card{padding:16px}.matchup-head{align-items:flex-start;flex-direction:column}.matchup-fields,.matchup-probs,.matchup-rating-grid{grid-template-columns:1fr}}`}</style>
 </section>;
}
