"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import {supabase} from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
export default function PublicPlayerProfile(){
 const {id}=useParams<{id:string}>();
 const [player,setPlayer]=useState<any>(null),[rank,setRank]=useState(0),[loading,setLoading]=useState(true);
 useEffect(()=>{async function load(){if(!supabase){setLoading(false);return;}
  const [{data:profile},{data:board}]=await Promise.all([
   supabase.from("player_public_leaderboard").select("id,username,player_code,photo_url,elo_rating,highest_elo,matches_played,wins,losses,win_percentage").eq("id",id).single(),
   supabase.from("player_public_leaderboard").select("id,elo_rating").order("elo_rating",{ascending:false})
  ]);
  setPlayer(profile||null);setRank((board||[]).findIndex((p:any)=>p.id===id)+1);setLoading(false);
 }load();},[id]);
 if(loading)return <main className="shell">Loading player...</main>;
 if(!player)return <main className="shell redesign-shell"><SiteNavigation/><h1>Player not found</h1><Link href="/players">← Players</Link></main>;
 const elo=Number(player.elo_rating)||1000;
 const share=async()=>{const text=`BASE25 PRO PLAYER CARD\n@${player.username} · ${player.player_code}\nELO: ${elo.toLocaleString()}\nCareer record: ${player.wins??0}W / ${player.losses??0}L\nWin rate: ${player.win_percentage??0}%`;if(navigator.share)await navigator.share({title:"BASE25 PRO Player Profile",text,url:location.href});else await navigator.clipboard.writeText(text);};
 return <main className="shell redesign-shell player-profile-page"><SiteNavigation/><section className="auth-wrap account-wrap" style={{maxWidth:760,margin:"28px auto 110px"}}>
  <div className="auth-card account-card">
   <div className="eyebrow">BASE25 PRO · PUBLIC PLAYER CARD</div>
   <div className="account-head" style={{marginTop:18}}>
    <div style={{display:"flex",alignItems:"center",gap:14}}>
     <div style={{width:72,height:72,borderRadius:"50%",overflow:"hidden",display:"grid",placeItems:"center",background:"#172719",border:"2px solid #b9f52d",color:"#c5f36a",fontSize:28,fontWeight:900,flexShrink:0}}>{player.photo_url?<img src={player.photo_url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:player.username?.[0]?.toUpperCase()}</div>
     <div><div className="eyebrow">{player.player_code} · GLOBAL RANK #{rank||"—"}</div><h1 style={{margin:"7px 0"}}>@{player.username}</h1><p className="muted">Competitive player</p></div>
    </div><strong>{elo.toLocaleString()}<small>ELO</small></strong>
   </div>
   <div className="account-stats" style={{marginTop:24}}>
    <div><small>MATCHES</small><b>{player.matches_played??0}</b></div><div><small>WINS</small><b>{player.wins??0}</b></div><div><small>LOSSES</small><b>{player.losses??0}</b></div><div><small>WIN RATE</small><b>{Number(player.win_percentage??0).toFixed(1)}%</b></div>
   </div>
   <div className="two-fields" style={{marginTop:22}}><button type="button" className="secondary" onClick={share}>↗ Share player card</button><Link className="account-action" href="/players">All players</Link></div>
  </div>
 </section></main>;
}
