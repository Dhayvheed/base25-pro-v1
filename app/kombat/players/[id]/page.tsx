"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useParams} from "next/navigation";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {supabase} from "@/lib/supabase";
type Player={id:string;username:string;photo_url:string|null};
type Rating={weekly_rating:number;all_time_elo:number;ranked_wins:number;ranked_losses:number;current_streak?:number};
export default function KombatPlayerProfilePage(){
 const params=useParams<{id:string}>();const id=params.id;
 const [player,setPlayer]=useState<Player|null>(null);const [rating,setRating]=useState<Rating|null>(null);const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase){setLoading(false);return}const [p,r]=await Promise.all([supabase.from("players").select("id,username,photo_url").eq("id",id).maybeSingle(),supabase.from("kombat_ratings").select("weekly_rating,all_time_elo,ranked_wins,ranked_losses,current_streak").eq("player_id",id).maybeSingle()]);if(!active)return;setPlayer(p.data as Player|null);const recorded=r.data as Rating|null;setRating(recorded&&(recorded.ranked_wins>0||recorded.ranked_losses>0)?recorded:null);setLoading(false)}if(id)load();return()=>{active=false}},[id]);
 return <KombatPageShell active="players"><section className="kb-hero"><div className="kb-eyebrow">PUBLIC KOMBAT PROFILE</div>{loading?<p>Loading fighter profile…</p>:!player?<><h1>FIGHTER NOT FOUND</h1><Link href="/kombat/leaderboard">Back to leaderboard</Link></>:<>
 <div className="kb-profile-head"><span className="kb-avatar">{player.photo_url?<img src={player.photo_url} alt=""/>:player.username.slice(0,1).toUpperCase()}</span><div><h1>{player.username}</h1><p className="kb-muted">BASE25 KOMBAT competitor</p></div></div></>}</section>
 {player&&<><section className="kb-panel"><h2>KOMBAT RECORD</h2><div className="kb-stat-grid"><div className="kb-stat"><strong>{rating?rating.weekly_rating.toLocaleString("en-NG"):"—"}</strong><span>WEEKLY RATING</span></div><div className="kb-stat"><strong>{rating?rating.all_time_elo.toLocaleString("en-NG"):"—"}</strong><span>ALL-TIME ELO</span></div><div className="kb-stat"><strong>{rating?rating.ranked_wins:"—"}</strong><span>WINS</span></div><div className="kb-stat"><strong>{rating?rating.ranked_losses:"—"}</strong><span>LOSSES</span></div></div>{!rating&&<p className="kb-muted">No Kombat statistics yet. This profile will update after the first published match.</p>}</section>
 <section className="kb-panel"><h2>HEAD-TO-HEAD</h2><div className="kb-empty"><strong>NO MATCHUP HISTORY</strong>Opponent comparisons will appear after this player has recorded Kombat matches.</div></section>
 <section className="kb-panel"><h2>RATING HISTORY</h2><div className="kb-empty">No rating history to chart yet.</div></section>
 <section className="kb-panel"><h2>RECENT FIGHTS</h2><div className="kb-empty">No published fights recorded.</div></section></>}
 </KombatPageShell>;
}
