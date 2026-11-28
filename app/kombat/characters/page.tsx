"use client";
import {useEffect,useMemo,useState} from "react";
import KombatPageShell from "@/components/kombat/KombatPageShell";
import {supabase} from "@/lib/supabase";
type Fighter={id:string;name:string;slug:string;tile_color:string|null;image_src:string|null;sort_order:number};
const ROSTER=["Baraka","Cassie Cage","Cetrion","D'Vorah","Erron Black","Frost","Fujin","Geras","Jacqui Briggs","Jade","Jax Briggs","Johnny Cage","Kabal","Kano","Kitana","Kollector","Kotal Kahn","Kung Lao","Liu Kang","Mileena","Nightwolf","Noob Saibot","Raiden","Rambo","RoboCop","Scorpion","Shang Tsung","Shao Kahn","Sheeva","Sindel","Sk arlet","Spawn","Sub-Zero","The Joker","Terminator","Rain","Kronika"];
export default function KombatCharactersPage(){
 const [fighters,setFighters]=useState<Fighter[]>([]);
 const [query,setQuery]=useState("");
 const [sort,setSort]=useState("default");
 const [selected,setSelected]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;async function load(){if(!supabase){setLoading(false);return}const {data,error}=await supabase.from("kombat_fighters").select("id,name,slug,tile_color,image_src,sort_order").eq("enabled",true).order("sort_order",{ascending:true});if(!active)return;if(!error&&data?.length)setFighters(data as Fighter[]);else setFighters(ROSTER.map((name,i)=>({id:"roster-"+i,name,slug:name.toLowerCase().replace(/[^a-z0-9]+/g,"-"),tile_color:null,image_src:null,sort_order:i})));setLoading(false)}load();return()=>{active=false}},[]);
 const visible=useMemo(()=>{const rows=fighters.filter(f=>f.name.toLowerCase().includes(query.toLowerCase()));return sort==="az"?[...rows].sort((a,b)=>a.name.localeCompare(b.name)):rows},[fighters,query,sort]);
 const toggle=(id:string)=>setSelected(old=>old.includes(id)?old.filter(x=>x!==id):old.length<2?[...old,id]:[old[1],id]);
 const chosen=selected.map(id=>fighters.find(f=>f.id===id)).filter(Boolean) as Fighter[];
 return <KombatPageShell active="characters"><section className="kb-hero"><div className="kb-eyebrow">THE FULL ROSTER</div><h1>CHARACTER<br/>ARENA</h1><p>Explore all 37 fighters. Performance stats unlock as official matches are recorded.</p></section>
 <div className="kb-tools"><input className="kb-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search all fighters…" aria-label="Search fighters"/><select className="kb-select" value={sort} onChange={e=>setSort(e.target.value)}><option value="default">Roster order</option><option value="az">A–Z</option></select></div>
 <div className="kb-grid">{visible.map(f=><button type="button" key={f.id} className={"kb-fighter "+(selected.includes(f.id)?"selected":"")} onClick={()=>toggle(f.id)} aria-pressed={selected.includes(f.id)}><span className="kb-fighter-art" style={f.tile_color?{background:f.tile_color}:undefined}>{f.image_src?<img src={f.image_src} alt=""/>:f.name.slice(0,1)}</span><span><strong>{f.name}</strong><small>— W/L · — WIN RATE</small></span></button>)}</div>
 {visible.length===0&&<div className="kb-empty">No fighter matches that search.</div>}
 <section className="kb-panel"><h2>FIGHTER COMPARISON <span className="kb-muted">· SELECT UP TO TWO</span></h2>{chosen.length===2?<div className="kb-compare">{chosen.map(f=><div key={f.id}><strong>{f.name}</strong><p className="kb-muted">No recorded matchup data yet.</p><b>—</b><p className="kb-muted">Win rate · Matches · Pick rate</p></div>)}</div>:<div className="kb-empty"><strong>{chosen.length===1?chosen[0].name+" SELECTED":"CHOOSE TWO FIGHTERS"}</strong>{chosen.length===1?"Select one more fighter to compare them.":"Select any two fighters above. Comparisons will remain blank until match data exists."}</div>}</section>
 {loading&&<p className="kb-muted">Checking the official roster…</p>}
 </KombatPageShell>;
}
