"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {supabase} from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
type E={player_id:string;rank:number;username:string;player_code:string|null;photo_url:string|null;weekly_elo:number;matches_played:number;wins:number;losses:number;win_percentage:number};
type A={id:string;week_start:string;week_end:string;snapshot_at:string;entries?:E[];champion?:any};
const dt=(v:string)=>new Date(v+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"});
const initials=(v:string)=>v.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
export default function WeeklyArchivePage(){
 const [rows,S]=useState<A[]>([]),[id,I]=useState(""),[busy,B]=useState(true),[err,X]=useState("");
 useEffect(()=>{let ok=true;(async()=>{if(!supabase){B(false);return;}const {data,error}=await supabase.from("weekly_leaderboard_archives").select("id,week_start,week_end,snapshot_at").order("week_start",{ascending:false});if(!ok)return;if(error)X(error.message);S((data||[]) as A[]);if(data?.[0])I(data[0].id);B(false);})();return()=>{ok=false}},[]);
 useEffect(()=>{let ok=true;(async()=>{const a=rows.find(x=>x.id===id);if(!supabase||!a)return;const [{data:e,error},{data:c}]=await Promise.all([supabase.from("weekly_leaderboard_archive_entries").select("player_id,rank,username,player_code,photo_url,weekly_elo,matches_played,wins,losses,win_percentage").eq("archive_id",id).order("rank"),supabase.from("weekly_champions").select("player_id,prize_amount,player:players!weekly_champions_player_id_fkey(username,player_code,photo_url)").eq("week_start",a.week_start).maybeSingle()]);if(!ok)return;if(error)X(error.message);S(p=>p.map(x=>x.id===id?{...x,entries:(e||[]) as E[],champion:c}:x));})();return()=>{ok=false}},[id,rows.length]);
 const a=rows.find(x=>x.id===id),list=a?.entries||[],top=list.slice(0,5),podium=top.slice(0,3);
 const stats=useMemo(()=>({players:list.filter(p=>p.matches_played>0).length,matches:Math.round(list.reduce((n,p)=>n+p.matches_played,0)/2),gain:list.length?Math.max(...list.map(p=>p.weekly_elo-1000)):0}),[list]);
 const share=async()=>{if(!a)return;const t="BASE25 PRO WEEKLY SNAPSHOT\n"+dt(a.week_start)+" – "+dt(a.week_end)+"\n"+top.map(p=>"#"+p.rank+" "+p.username+" · "+p.wins+"-"+p.losses+" · "+p.weekly_elo+" ELO").join("\n");if(navigator.share)await navigator.share({title:"BASE25 PRO Snapshot",text:t,url:location.href});else await navigator.clipboard.writeText(t)};
 const weekNo=a?rows.length-rows.findIndex(x=>x.id===a.id):0,champ=a?.champion?.player;
 const podiumOrder=[podium[1],podium[0],podium[2]].filter(Boolean) as E[];
 return <main className="shell redesign-shell"><SiteNavigation/><section className="section redesign-section archive-page">
  <div className="archive-hero"><div className="archive-kicker">COMPETITION ARCHIVE</div><h1>Weekly Snapshots</h1><p>Frozen results, final standings and champions.</p><div className="archive-select"><span>▣</span><select value={id} onChange={e=>I(e.target.value)} aria-label="Select archived week">{rows.map((x,index)=><option key={x.id} value={x.id}>Week {rows.length-index} · {dt(x.week_start)} – {dt(x.week_end)}</option>)}</select><b>⌄</b></div></div>
  {err&&<p className="notice">{err}</p>}
  {busy?<p className="muted">Loading snapshots…</p>:!rows.length?<div className="empty-archive">No completed weekly snapshots yet. A snapshot appears after the weekly freeze.</div>:a&&<>
   <div className="archive-card">
    <div className="archive-card-head"><div><h2>Week {weekNo} final</h2><p>{dt(a.week_start)} – {dt(a.week_end)}</p></div><span className="frozen-pill">♙ &nbsp; FROZEN</span></div>
    <div className="archive-stats"><div><strong>{stats.matches}</strong><span>Matches</span></div><i/><div><strong>{stats.players}</strong><span>Players</span></div><i/><div><strong>+{stats.gain}</strong><span>Top gain</span></div></div>
    <div className="archive-podium">{podiumOrder.map(p=>{const place=p.rank;return <Link key={p.player_id} href={"/players/"+p.player_id} className={"podium-player place-"+place}><div className="podium-crown">{place===1?<svg width="26" height="26" viewBox="0 0 24 24" fill="#E8C547" stroke="#E8C547" strokeWidth="1.5"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z"/></svg>:""}</div><div className="podium-avatar">{initials(p.username)}</div><b className="podium-place">{place}</b><div className="podium-name">{p.username}</div><strong>{p.weekly_elo.toLocaleString()}</strong><small>ELO</small><div className="podium-step">{place}</div></Link>})}</div>
    <div className="archive-champion"><span className="champ-trophy">🏆</span><div><small>SATURDAY CHAMPION</small><b>{champ?.username||"Awaiting official result"}</b>{champ?.player_code&&<span>{champ.player_code}{a.champion.prize_amount?` · ₦${Number(a.champion.prize_amount).toLocaleString("en-NG")} prize`:""}</span>}</div>{champ?.username&&<Link href={"/players/"+a.champion.player_id}>Profile →</Link>}</div>
    <div className="archive-standings-head"><h3>Final top 5</h3><span>W - L · ELO</span></div>
    <div className="archive-top-list">{top.map(p=><Link key={p.player_id} href={"/players/"+p.player_id} className={"top-row "+(p.rank===1?"top-player":"")}><b className="top-rank">{p.rank}</b><span className="top-avatar">{initials(p.username)}</span><span className="top-person"><strong>{p.username}</strong><small>{p.player_code||"BASE25 PLAYER"}</small></span><span className="top-record">{p.wins} – {p.losses}</span><span className="top-rating"><strong>{p.weekly_elo.toLocaleString()}</strong><small>+{p.weekly_elo-1000}</small></span></Link>)}</div>
    <button className="archive-full-button" onClick={share}>↥ &nbsp; Share full snapshot</button>
    <p className="archive-saved">Saved {new Date(a.snapshot_at).toLocaleString("en-NG")} · Historical standings are frozen.</p>
   </div>
   {list.length>5&&<section className="archive-more"><div><small>COMPLETE WEEKLY TABLE</small><h2>All recorded standings</h2></div><div className="archive-table-wrap"><table className="archive-table"><thead><tr><th>#</th><th>PLAYER</th><th>W</th><th>L</th><th>ELO</th></tr></thead><tbody>{list.slice(5).map(p=><tr key={p.player_id}><td>{p.rank}</td><td><Link href={"/players/"+p.player_id} className="archive-player-name"><strong>{p.username}</strong><small>({p.player_code||"—"})</small></Link></td><td>{p.wins}</td><td>{p.losses}</td><td className="archive-elo">{p.weekly_elo.toLocaleString()}</td></tr>)}</tbody></table></div></section>}
  </>}
 </section>
 <style jsx>{`
 .archive-page{width:100%;max-width:430px;margin:0 auto 100px;min-width:0;padding:0 0 20px;color:#F4F5F2}
 .archive-hero{position:relative;overflow:hidden;padding:22px 20px 0;border:0;border-radius:0;background:transparent}
 .archive-kicker{font:700 11px "JetBrains Mono",monospace;letter-spacing:.16em;color:#C8F169}
 .archive-hero h1{font-size:32px;font-weight:800;line-height:1.05;letter-spacing:-1px;margin:4px 0 0}
 .archive-hero p{font-size:14px;color:#B4BEB8;margin:4px 0 0}
 .archive-select{display:flex;align-items:center;gap:12px;width:100%;min-height:56px;margin-top:16px;padding:0 16px;border:1px solid #2F6B45;border-radius:16px;background:#101512;color:#F4F5F2}
 .archive-select>span{font-size:0;color:#C8F169}.archive-select>span:before{content:"▦";font-size:20px}
 .archive-select select{flex:1;min-width:0;background:transparent;border:0;outline:0;color:#F4F5F2;font-size:15px;font-weight:600;appearance:none}
 .archive-select option{background:#101512}.archive-select>b{font-size:20px;color:#C8F169}
 .archive-card{position:relative;margin-top:0;padding:0 0 18px;border:0;border-radius:0;background:transparent;box-shadow:none;overflow:hidden}
 .archive-card-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:26px 20px 0}
 .archive-card-head h2{font-size:22px;font-weight:800;line-height:1.1;letter-spacing:-.4px;margin:0;text-transform:capitalize}
 .archive-card-head p{margin:2px 0 0;font:11px "JetBrains Mono",monospace;color:#9AA69F}
 .frozen-pill{display:inline-flex;align-items:center;gap:6px;flex:none;padding:6px 10px;border:1px solid #2F6B45;border-radius:999px;font:700 10px "JetBrains Mono",monospace;letter-spacing:1px;color:#C8F169}
 .archive-stats{display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;align-items:center;margin:20px 20px 0;padding:14px 8px;border:1px solid #1F2A24;border-radius:25px;background:#101512}
 .archive-stats>div{display:grid;gap:3px;text-align:center}.archive-stats strong{font-size:30px;line-height:1;font-weight:800}.archive-stats>div:last-child strong{color:#C8F169}.archive-stats span{font-size:13px;color:#B4BEB8}.archive-stats i{height:34px;width:1px;background:#24402F;justify-self:center}
 .archive-podium{position:relative;display:grid;grid-template-columns:1fr 1.12fr 1fr;align-items:end;gap:10px;min-height:0;margin:0;padding:22px 20px 0}
 .podium-player{position:relative;display:flex;flex-direction:column;align-items:center;min-width:0;padding:0;color:#F4F5F2;text-decoration:none;text-align:center}
 .podium-crown{height:26px;color:#E8C547;font-size:0;line-height:1;display:flex;align-items:center;justify-content:center}
 .podium-avatar{width:68px;height:68px;display:grid;place-items:center;border:3px solid #C9CFCB;border-radius:50%;background:#101512;color:#C8F169;font-size:28px;font-weight:800}
 .place-1 .podium-avatar{width:88px;height:88px;border-color:#E8C547;box-shadow:0 0 28px rgba(232,197,71,.3);font-size:36px}
 .place-3 .podium-avatar{border-color:#C88A52}
 .podium-place{position:absolute;top:calc(26px + 55px);right:calc(50% - 42px);width:26px;height:26px;display:grid;place-items:center;border:0;border-radius:50%;background:#C9CFCB;color:#0A0E0C;font:800 13px Inter,sans-serif;z-index:1}
 .place-1 .podium-place{top:calc(26px + 72px);right:calc(50% - 52px);width:30px;height:30px;background:#E8C547;font-size:15px}
 .place-3 .podium-place{background:#C88A52}
 .podium-name{max-width:100%;font-size:15px;font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:10px}
 .place-1 .podium-name{font-size:17px}
 .podium-player>strong{font-size:22px;line-height:1.1;margin-top:2px;letter-spacing:-.5px}
 .place-1>strong{font-size:28px;color:#F5D547}
 .podium-player>small{font:10px "JetBrains Mono",monospace;color:#9AA69F;margin-top:2px}
 .podium-step{width:100%;height:56px;margin-top:10px;border:0;border-radius:12px 12px 0 0;background:linear-gradient(180deg,#2A3330,#141A17);display:flex;align-items:flex-start;justify-content:center;padding-top:8px;font-size:22px;font-weight:800;color:#C9CFCB}
 .place-1 .podium-step{height:84px;color:#E8C547;background:linear-gradient(180deg,#4A3F1C,#17140A)}
 .place-3 .podium-step{height:40px;color:#C88A52;background:linear-gradient(180deg,#3A2A1A,#17120D)}
 .archive-champion{position:relative;z-index:2;display:flex;align-items:center;gap:12px;margin:0;padding:14px;border:1px solid #4A3F1C;border-radius:0 0 20px 20px;background:linear-gradient(90deg,#1E1808,#0F120E);min-width:0;color:#E8C547}
 .champ-trophy{font-size:34px;color:#E8C547;flex:none}.archive-champion>div{display:grid;gap:4px;flex:1;min-width:0}.archive-champion small{font:700 11px "JetBrains Mono",monospace;color:#E8C547;letter-spacing:.12em}.archive-champion b{font-size:22px;line-height:1.05;color:#F4F5F2;overflow-wrap:anywhere}.archive-champion>div>span{font:11px "JetBrains Mono",monospace;color:#9AA69F}.archive-champion>a{margin-left:auto;display:flex;align-items:center;gap:4px;min-height:44px;font-size:14px;font-weight:700;color:#C8F169;white-space:nowrap}
 .archive-standings-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin:26px 20px 10px}.archive-standings-head h3{font-size:19px;font-weight:800;margin:0;color:#C8F169;text-transform:none}.archive-standings-head span{font:10px "JetBrains Mono",monospace;color:#9AA69F}
 .archive-top-list{position:relative;margin:0 20px;overflow:hidden;border:1px solid #1F2A24;border-radius:18px;background:#101512}
 .top-row{display:grid;grid-template-columns:24px 32px minmax(0,1fr) 56px 64px;align-items:center;gap:10px;min-height:60px;padding:0 14px;border-bottom:1px solid #1F2A24;color:#F4F5F2;text-decoration:none}
 .top-row:last-child{border-bottom:0}.top-row.top-player{background:#12281A}
 .top-rank{text-align:left;font:800 15px "JetBrains Mono",monospace;color:#9AA69F}.top-player .top-rank{color:#E8C547}
 .top-avatar{width:32px;height:32px;display:grid;place-items:center;border:1px solid #2F6B45;border-radius:50%;color:#C8F169;font-weight:800;font-size:14px;flex:none}
 .top-person{display:flex;align-items:center;gap:10px;min-width:0}.top-person strong{font-size:15px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.top-person small{display:block;font:10px "JetBrains Mono",monospace;color:#9AA69F;margin-top:2px}
 .top-record{text-align:right;color:#D5DAD6;font-size:14px;white-space:nowrap}.top-rating{display:grid;gap:2px;text-align:right}.top-rating strong{font-size:15px;line-height:1;font-weight:800}.top-rating small{font-size:11px;color:#C8F169}
 .archive-full-button{display:flex;align-items:center;justify-content:center;gap:10px;width:calc(100% - 40px);min-height:56px;margin:16px 20px 0;padding:14px;border:0;border-radius:16px;background:#C8F169;color:#0A0E0C;font-size:16px;font-weight:800;text-transform:none}
 .archive-saved{text-align:center;font:10px "JetBrains Mono",monospace;color:#9AA69F;margin:12px 20px 0}
 .archive-more{margin:24px 20px 0}.archive-more>div:first-child small{font:9px "JetBrains Mono",monospace;color:#C8F169;letter-spacing:.15em}.archive-more h2{font-size:22px;margin:5px 0 12px}.archive-table-wrap{width:100%;overflow:hidden;border:1px solid #364b34;border-radius:11px;background:#0b140d}.archive-table{width:100%;border-collapse:collapse;table-layout:fixed;color:#f1f5ec}.archive-table th,.archive-table td{padding:11px 8px;text-align:center;border-bottom:1px solid #2c3b2c;white-space:nowrap;overflow:hidden}.archive-table th{background:#1a2718;color:#b9c4b1;font:700 10px monospace}.archive-table td{font-size:12px;font-weight:700}.archive-player-name{display:flex;gap:5px;color:#f1f5ec;text-decoration:none}.archive-player-name small{color:#aab5a4}.archive-elo{color:#d7f052;font:800 13px monospace!important}
 .empty-archive{padding:25px;border:1px solid #354235;border-radius:14px;background:#101711;color:#aab6a8}
 @media(max-width:390px){.archive-hero{padding-left:20px;padding-right:20px}.archive-stats{margin-left:20px;margin-right:20px}.archive-podium{gap:10px}.archive-card-head{padding-left:20px;padding-right:20px}.podium-avatar{width:64px;height:64px}.place-1 .podium-avatar{width:84px;height:84px}.podium-place{top:calc(26px + 52px);right:calc(50% - 40px)}.place-1 .podium-place{top:calc(26px + 68px);right:calc(50% - 49px)}.podium-name{font-size:14px}.place-1 .podium-name{font-size:16px}.podium-player>strong{font-size:20px}.place-1>strong{font-size:26px}.top-row{grid-template-columns:22px 30px minmax(0,1fr) 50px 60px;gap:8px;padding:0 11px}.top-person{gap:8px}.top-person strong{font-size:14px}}
 @media(max-width:350px){.archive-hero h1{font-size:29px}.archive-stats strong{font-size:26px}.archive-podium{gap:5px;padding-left:14px;padding-right:14px}.podium-avatar{width:58px;height:58px}.place-1 .podium-avatar{width:76px;height:76px}.podium-name{font-size:12px}.top-row{grid-template-columns:18px 28px minmax(0,1fr) 45px 56px;gap:6px;padding:0 8px}.top-person strong{font-size:12px}}
 `}</style></main>;
}
