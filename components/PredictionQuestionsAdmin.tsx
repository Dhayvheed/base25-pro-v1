"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LadderStep = { label: string; points: number; day_index: number; minute_of_day: number };
type Template = {
  template_key: string; title: string; description: string | null; category: string;
  points_reward: number; points_ladder: LadderStep[]; eligibility: string;
  opens_rule: string; closes_rule: string; data_condition: string | null;
  active: boolean; sort_order: number; minimum_matches: number; current_pick_count?: number;
};
type Audit = { id: string; actor_id: string; action: string; template_key: string; before_values: any; after_values: any; created_at: string; actor_email: string | null };

const starter: Template = {
  template_key: "new_question", title: "", description: "", category: "Weekly",
  points_reward: 100, points_ladder: [{label:"Sun",points:100,day_index:0,minute_of_day:0}],
  eligibility: "all_active_players", opens_rule:"Sunday 00:00 WAT", closes_rule:"Friday 23:59 WAT",
  data_condition:"", active:true, sort_order:6, minimum_matches:1
};
const icons: Record<string,string> = {
  saturday_champion:"♜", weekly_leaderboard:"♛", top5_qualifier:"♙", most_wins:"▥", elo_improvement:"↗"
};
const dayNames = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dayFull = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const parseRule = (rule:string) => { const m=rule.match(/(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)\s+(\d{1,2}:\d{2})\s+WAT/i); return {day:m?dayFull.findIndex(x=>x.toLowerCase()===m[1].toLowerCase()):0,time:m?m[2]:"00:00",suffix:m?rule.slice(m.index!+m[0].length):""}; };
const makeRule = (day:number,time:string,suffix:string) => `${dayFull[day]} ${time} WAT${suffix}`;
const fmtLadder = (steps: LadderStep[]) => (steps || []).map(x=>`${x.label} ${x.points}`).join(" · ");

export default function PredictionQuestionsAdmin({ onBack, setNotice }: { onBack:()=>void; setNotice:(s:string)=>void }) {
  const [templates,setTemplates]=useState<Template[]>([]);
  const [audit,setAudit]=useState<Audit[]>([]);
  const [expanded,setExpanded]=useState<string|null>(null);
  const [draft,setDraft]=useState<Template|null>(null);
  const [applyCurrent,setApplyCurrent]=useState(false);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [showAdd,setShowAdd]=useState(false);
  const [newDraft,setNewDraft]=useState<Template>(starter);
  const [pickCounts,setPickCounts]=useState<Record<string,number>>({});
  const [weekSummary,setWeekSummary]=useState<{week_label:string;status:string;players_predicted:number;latest_close:string|null;last_changed_by:string}>({week_label:"Week 2",status:"predictions open",players_predicted:0,latest_close:null,last_changed_by:""});

  const load = useCallback(async()=>{
    if(!supabase)return;
    setLoading(true);
    const [{data,error},{data:auditRows},{data:summary}] = await Promise.all([
      supabase.rpc("admin_list_prediction_templates"),
      supabase.rpc("admin_list_prediction_question_audit"),
      supabase.rpc("admin_get_prediction_admin_summary")
    ]);
    if(error){setNotice("Could not load prediction templates: "+error.message);setLoading(false);return;}
    const rows=(data||[]) as Template[];
    setTemplates(rows);
    setAudit((auditRows||[]) as Audit[]);
    if(summary)setWeekSummary(summary as typeof weekSummary);
    setPickCounts(Object.fromEntries(rows.map(row=>[row.template_key,Number(row.current_pick_count||0)])));
    const initiallyExpanded=rows.find(row=>row.template_key==="most_wins")||rows[0];
    if(initiallyExpanded&&!expanded){setExpanded(initiallyExpanded.template_key);setDraft({...initiallyExpanded,points_ladder:[...(initiallyExpanded.points_ladder||[])]});}
    setLoading(false);
  },[setNotice,expanded]);

  useEffect(()=>{load();},[load]);

  function edit(row:Template){setExpanded(row.template_key);setDraft({...row,points_ladder:[...(row.points_ladder||[])]});setApplyCurrent(false);setShowAdd(false);}
  function patch<K extends keyof Template>(key:K,value:Template[K]){setDraft(cur=>cur?({...cur,[key]:value}):cur);}
  function patchStep(index:number,key:keyof LadderStep,value:string|number){if(!draft)return;patch("points_ladder",draft.points_ladder.map((s,i)=>i===index?({...s,[key]:value}):s));}
  function addStep(){if(!draft)return;patch("points_ladder",[...draft.points_ladder,{label:"New",points:50,day_index:0,minute_of_day:0}]);}
  function removeStep(index:number){if(!draft)return;patch("points_ladder",draft.points_ladder.filter((_,i)=>i!==index));}

  async function save(){
    if(!supabase||!draft)return;
    if(applyCurrent&&(pickCounts[draft.template_key]||0)>0){setNotice(`This question already has ${pickCounts[draft.template_key]} picks. Current-week changes are blocked to protect them.`);return;}
    setBusy(true);
    const {error}=await supabase.rpc("admin_save_prediction_template",{
      p_template_key:draft.template_key,p_title:draft.title,p_description:draft.description||"",p_category:draft.category,
      p_points_reward:Number(draft.points_reward),p_eligibility:draft.eligibility,p_opens_rule:draft.opens_rule,
      p_closes_rule:draft.closes_rule,p_data_condition:draft.data_condition||"",p_minimum_matches:Number(draft.minimum_matches),
      p_points_ladder:draft.points_ladder,p_active:draft.active,p_sort_order:Number(draft.sort_order),p_apply_current:applyCurrent
    });
    if(error)setNotice("Template was not saved: "+error.message);
    else{setNotice(applyCurrent?"Template saved and applied to this week's unopened question.":"Template saved for next week.");setDraft(null);setExpanded(null);await load();}
    setBusy(false);
  }

  async function create(){
    if(!supabase)return;
    const key=newDraft.template_key.trim().toLowerCase().replace(/[^a-z0-9_]+/g,"_");
    setBusy(true);
    const {error}=await supabase.rpc("admin_create_prediction_template",{
      p_template_key:key,p_title:newDraft.title,p_description:newDraft.description||"",p_category:newDraft.category,
      p_points_reward:Number(newDraft.points_reward),p_eligibility:newDraft.eligibility,p_opens_rule:newDraft.opens_rule,
      p_closes_rule:newDraft.closes_rule,p_data_condition:newDraft.data_condition||"",p_minimum_matches:Number(newDraft.minimum_matches),
      p_points_ladder:newDraft.points_ladder,p_sort_order:templates.length+1
    });
    if(error)setNotice("Question was not added: "+error.message);
    else{setNotice("New prediction question template added.");setShowAdd(false);setNewDraft({...starter,template_key:"new_question_"+(templates.length+1),sort_order:templates.length+1});await load();}
    setBusy(false);
  }

  async function toggle(row:Template){
    if(!supabase)return;
    const {error}=await supabase.rpc("admin_save_prediction_template",{
      p_template_key:row.template_key,p_title:row.title,p_description:row.description||"",p_category:row.category,
      p_points_reward:row.points_reward,p_eligibility:row.eligibility,p_opens_rule:row.opens_rule,p_closes_rule:row.closes_rule,
      p_data_condition:row.data_condition||"",p_minimum_matches:row.minimum_matches,p_points_ladder:row.points_ladder,
      p_active:!row.active,p_sort_order:row.sort_order,p_apply_current:false
    });
    if(error)setNotice("Could not update question: "+error.message);else{setNotice(row.active?"Question disabled for future weeks.":"Question enabled for future weeks.");await load();}
  }

  async function voidThisWeek(row:Template){
    if(!supabase||!window.confirm(`Void this week's "${row.title}" question? Existing picks will receive zero points.`))return;
    setBusy(true);
    const {data,error}=await supabase.rpc("admin_void_prediction_question",{p_template_key:row.template_key});
    if(error)setNotice("Question was not voided: "+error.message);
    else setNotice(`Question voided. ${data?.voided_pick_count||0} existing picks were cancelled.`);
    await load();setBusy(false);
  }

  async function moveTemplate(row:Template,delta:number){
    const current=[...templates].sort((a,b)=>a.sort_order-b.sort_order);
    const index=current.findIndex(x=>x.template_key===row.template_key), next=index+delta;
    if(index<0||next<0||next>=current.length)return;
    [current[index],current[next]]=[current[next],current[index]];
    setBusy(true);
    for(let i=0;i<current.length;i++){
      const item=current[i];
      if(item.sort_order===i+1)continue;
      const {error}=await supabase!.rpc("admin_save_prediction_template",{
        p_template_key:item.template_key,p_title:item.title,p_description:item.description||"",p_category:item.category,
        p_points_reward:item.points_reward,p_eligibility:item.eligibility,p_opens_rule:item.opens_rule,p_closes_rule:item.closes_rule,
        p_data_condition:item.data_condition||"",p_minimum_matches:item.minimum_matches,p_points_ladder:item.points_ladder,
        p_active:item.active,p_sort_order:i+1,p_apply_current:false
      });
      if(error){setNotice("Question order update failed: "+error.message);setBusy(false);return;}
    }
    setNotice("Question order updated.");await load();setBusy(false);
  }

  const totalPicks=useMemo(()=>Object.values(pickCounts).reduce((a,b)=>a+b,0),[pickCounts]);
  const FormFields=({value,change}:{value:Template;change:(key:keyof Template,val:any)=>void})=>{
    const opening=parseRule(value.opens_rule),closing=parseRule(value.closes_rule);
    const updateOpen=(day:number,time:string)=>change("opens_rule",makeRule(day,time,opening.suffix));
    const updateClose=(day:number,time:string)=>change("closes_rule",makeRule(day,time,closing.suffix));
    const ordered=[...value.points_ladder].sort((a,b)=>a.day_index-b.day_index);
    return <>
      <label>Question<input className="pq-control" value={value.title} maxLength={140} onChange={e=>change("title",e.target.value)}/></label>
      <div className="pq-two"><label>Base points<input className="pq-control" type="number" min="1" max="10000" value={value.points_reward} onChange={e=>change("points_reward",Number(e.target.value))}/></label><label>Who can be picked<select className="pq-control" value={value.eligibility} onChange={e=>change("eligibility",e.target.value)}><option value="all_active_players">All players</option><option value="top5_snapshot">Top 5 snapshot</option></select></label></div>
      <div className="pq-two"><label>Opens<select className="pq-control" value={opening.day} onChange={e=>updateOpen(Number(e.target.value),opening.time)}>{dayFull.map((d,i)=><option value={i} key={d}>{dayNames[i]}</option>)}</select></label><label>Time<input className="pq-control" type="time" value={opening.time} onChange={e=>updateOpen(opening.day,e.target.value)}/></label></div>
      <div className="pq-minimum"><span>Also wait until</span><input aria-label="Minimum matches" type="number" min="1" max="500" value={value.minimum_matches} onChange={e=>change("minimum_matches",Number(e.target.value))}/><span>matches are recorded</span></div>
      <div className="pq-two"><label>Closes<select className="pq-control" value={closing.day} onChange={e=>updateClose(Number(e.target.value),closing.time)}>{dayFull.map((d,i)=><option value={i} key={d}>{dayNames[i]}</option>)}</select></label><label>Time<input className="pq-control" type="time" value={closing.time} onChange={e=>updateClose(closing.day,e.target.value)}/></label></div>
      <div className="pq-ladder-head"><span>Points on each step</span><button type="button" onClick={()=>{const ordered=[...value.points_ladder].sort((a,b)=>a.day_index-b.day_index);change("points_ladder",ordered.map((x,i)=>({...x,points:Math.max(0,ordered[0].points-10*i)})));}}>Auto-fill drop</button></div>
      <div className="pq-ladder-labels">{ordered.map((step,i)=><span key={i}>{step.label}</span>)}</div>
      <div className="pq-ladder-values">{ordered.map((step,i)=><input key={i} aria-label={step.label+" points"} type="number" min="0" value={step.points} onChange={e=>change("points_ladder",value.points_ladder.map(x=>x.day_index===step.day_index?({...x,points:Number(e.target.value)}):x))}/>)}</div>
      <p className="pq-help">Players keep the points shown on the day they pick.</p>
    </>;
  };

  return <section className="pq-root">
    <style jsx>{`
      .pq-root{color:#F4F5F2;max-width:760px;margin:0 auto;padding:0 0 28px;font-family:Inter,system-ui,sans-serif}
      .pq-head{display:flex;align-items:center;gap:12px;margin:4px 0 16px}.pq-back{width:40px;height:40px;border:1px solid #2B3A31;border-radius:13px;background:#101512;color:#dce4de;font-size:22px}.pq-kicker{font:11px 'JetBrains Mono',monospace;letter-spacing:2.5px;color:#C8F169}.pq-head h2{font-size:25px;letter-spacing:-.7px;margin:2px 0 0;font-weight:800}
      .pq-summary{display:flex;align-items:center;gap:12px;padding:16px 14px;background:#101B15;border:1px solid #29382F;border-radius:19px;margin-bottom:12px;min-height:96px}.pq-dot{width:8px;height:8px;border-radius:50%;background:#C8F169;flex:none}.pq-summary-copy{flex:1;min-width:0}.pq-summary-copy b{display:block;font-size:15px;line-height:1.35;text-transform:capitalize}.pq-summary-copy small{color:#9AA69F;font-size:12px;display:block;line-height:1.25}.pq-summary strong{color:#C8F169;font-size:12px;white-space:nowrap;font-weight:500}
      .pq-add{width:100%;height:54px;border:0;border-radius:15px;background:#C8F169;color:#0A0E0C;font-weight:800;font-size:17px;margin:0 0 8px}.pq-note{color:#9AA69F;font-size:12px;line-height:1.5;margin:0 0 14px}
      .pq-card{background:#0E1410;border:1px solid #202A24;border-radius:19px;padding:14px;margin:12px 0}.pq-card.is-expanded{border-color:#3B7050}.pq-row{display:flex;align-items:center;gap:12px;min-height:70px}.pq-icon{width:40px;height:40px;border-radius:11px;background:#142019;color:#C8F169;display:grid;place-items:center;font-size:21px;flex:none}.pq-copy{flex:1;min-width:0}.pq-copy b{font-size:15px;line-height:1.3;display:block;font-weight:700}.pq-copy small{font-size:12px;color:#9AA69F;display:block;margin-top:3px;line-height:1.35}.pq-order{display:none}.pq-switch{width:44px;height:26px;border:0;border-radius:99px;background:#38443c;position:relative;flex:none;padding:0}.pq-switch.on{background:#C8F169}.pq-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#0A0E0C;transition:transform .15s}.pq-switch.on:after{transform:translateX(18px)}
      .pq-editor{margin-top:12px;padding-top:12px;border-top:1px solid #1F2A24}.pq-editor label,.pq-add-form label{display:block;color:#9AA69F;font-size:12px;margin:12px 0 6px}.pq-control,.pq-editor input,.pq-editor select,.pq-editor textarea,.pq-add-form input,.pq-add-form select,.pq-add-form textarea{width:100%;min-width:0;height:46px;border:1px solid #303B34;border-radius:11px;background:#0A100C;color:#F4F5F2;padding:0 12px;font:15px Inter,system-ui,sans-serif}.pq-editor textarea,.pq-add-form textarea{height:auto;padding:10px;resize:vertical}.pq-two{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}.pq-minimum{display:flex;align-items:center;justify-content:center;gap:9px;color:#C9D0CB;font-size:13px;margin:10px 0}.pq-minimum input{width:40px;height:36px;text-align:center;padding:0 4px}.pq-ladder-head{display:flex;justify-content:space-between;align-items:center;margin:15px 0 7px;font-size:12px;color:#9AA69F}.pq-ladder-head button{background:none;border:0;color:#C8F169;font-weight:700}.pq-ladder-labels,.pq-ladder-values{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);gap:5px;text-align:center}.pq-ladder-labels span{font-size:11px;color:#9AA69F}.pq-ladder-values input{height:46px;text-align:center;padding:0 4px;font-weight:700}.pq-help{font-size:11px;color:#9AA69F;margin-top:8px;line-height:1.5}
      .pq-apply{margin-top:15px}.pq-apply-title{font-size:12px;color:#9AA69F;margin-bottom:7px}.pq-radio{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid #2B3A31;border-radius:12px;margin:6px 0;cursor:pointer;min-height:60px}.pq-radio.selected{border-color:#C8F169;background:#142019}.pq-radio input{width:18px;height:18px;flex:none;accent-color:#C8F169}.pq-radio b{font-size:14px;font-weight:500;display:block;color:#F4F5F2}.pq-radio small{font-size:12px;color:#9AA69F;display:block;margin-top:2px}.pq-warning{border:1px solid #7d4d32;background:#25180f;color:#F4C28E;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.45;margin-top:9px}.pq-actions{display:flex;gap:10px;margin-top:14px}.pq-save{flex:1;height:49px;border:0;border-radius:12px;background:#C8F169;color:#0A0E0C;font-weight:800;font-size:15px}.pq-cancel{height:49px;padding:0 20px;border:1px solid #2B3A31;border-radius:12px;background:transparent;color:#F4F5F2}.pq-void{background:none;border:0;color:#E49B9B;font-size:13px;padding:0}.pq-last{font-size:12px;color:#9AA69F}.pq-history{margin-top:16px;border-top:0;padding-top:0;color:#9AA69F;font-size:12px}.pq-history h3{display:none}.pq-history-row{padding:6px 0;border-bottom:1px solid #1F2A24;font-size:12px}.pq-history-row small{display:block;color:#9AA69F;margin-top:3px}.pq-add-form{background:#101512;border:1px solid #2F6B45;border-radius:18px;padding:14px;margin:12px 0}.pq-add-form h3{font-size:16px;margin-bottom:8px}.pq-empty{color:#9AA69F;font-size:13px;padding:20px;text-align:center}
      @media(max-width:520px){.pq-root{padding-left:0;padding-right:0}.pq-head h2{font-size:24px}.pq-two{grid-template-columns:1fr 1.2fr}.pq-row{min-height:72px}.pq-ladder-values{gap:4px}}
    `}</style>
    <div className="pq-head"><button className="pq-back" type="button" onClick={onBack}>←</button><div><div className="pq-kicker">ADMIN DESK</div><h2>Prediction questions</h2></div></div>
    <div className="pq-summary"><span className="pq-dot"/><div className="pq-summary-copy"><b>{weekSummary.week_label} · {weekSummary.status}</b><small>Most questions close Fri 11:59pm</small></div><strong>{weekSummary.players_predicted} players predicted</strong></div>
    <button className="pq-add" type="button" onClick={()=>{setShowAdd(v=>!v);setDraft(null);setExpanded(null);}}>＋ Add question</button>
    <p className="pq-note">Questions repeat automatically every week. Changes apply from next week unless you choose otherwise.</p>
    {loading?<p className="pq-empty">Loading prediction questions…</p>:templates.map(row=><article className={"pq-card"+(expanded===row.template_key?" is-expanded":"")} key={row.template_key}>
      <div className="pq-row"><div className="pq-icon">{icons[row.template_key]||"◎"}</div><div className="pq-copy"><b>{row.title}</b><small>{row.opens_rule.split(" WAT")[0]} · {fmtLadder(row.points_ladder)} pts</small></div><div style={{display:"flex",alignItems:"center",gap:4}}><button type="button" className="pq-order" disabled={busy||templates[0]?.template_key===row.template_key} onClick={()=>moveTemplate(row,-1)} aria-label="Move question up">↑</button><button type="button" className="pq-order" disabled={busy||templates[templates.length-1]?.template_key===row.template_key} onClick={()=>moveTemplate(row,1)} aria-label="Move question down">↓</button><button type="button" className={"pq-switch"+(row.active?" on":"")} aria-label={row.active?"Disable "+row.title:"Enable "+row.title} aria-pressed={row.active} onClick={()=>toggle(row)} /></div></div>
      {expanded===row.template_key&&draft&&<div className="pq-editor">
        <FormFields value={draft} change={(k,v)=>patch(k as keyof Template,v)}/>
        <div className="pq-apply"><div className="pq-apply-title">Apply this change</div>
          <label className={"pq-radio"+(!applyCurrent?" selected":"")}><input type="radio" checked={!applyCurrent} onChange={()=>setApplyCurrent(false)}/><span><b>From next week</b><small>Recommended. Nothing changes this week.</small></span></label>
          <label className={"pq-radio"+(applyCurrent?" selected":"")}><input type="radio" checked={applyCurrent} onChange={()=>setApplyCurrent(true)}/><span><b>This week too</b><small>Only before this question opens.</small></span></label>
          {applyCurrent&&(pickCounts[row.template_key]||0)>0&&<div className="pq-warning">{pickCounts[row.template_key]} players have already predicted. Current-week changes are blocked to protect their picks.</div>}
        </div>
        <div className="pq-actions"><button className="pq-save" type="button" disabled={busy} onClick={save}>{busy?"Saving…":"Save changes"}</button><button className="pq-cancel" type="button" onClick={()=>{setDraft(null);setExpanded(null);}}>Cancel</button></div>
        <div className="pq-last" style={{display:"flex",justifyContent:"space-between",marginTop:12}}><button type="button" className="pq-void" onClick={()=>voidThisWeek(row)} disabled={busy}>Void this week</button><span>Last changed by {weekSummary.last_changed_by||"—"}</span></div>
      </div>}
      {expanded!==row.template_key&&<button type="button" style={{marginTop:12,background:"none",border:0,color:"#C8F169",fontWeight:700}} onClick={()=>edit(row)}>Edit question →</button>}
    </article>)}
    {showAdd&&<div className="pq-add-form"><h3>Add a question template</h3>
      <label>Template key<input value={newDraft.template_key} onChange={e=>setNewDraft(v=>({...v,template_key:e.target.value}))}/></label>
      <FormFields value={newDraft} change={(k,v)=>setNewDraft(cur=>({...cur,[k]:v}))}/>
      <div className="pq-actions"><button className="pq-save" type="button" disabled={busy} onClick={create}>{busy?"Adding…":"Add question"}</button><button className="pq-cancel" type="button" onClick={()=>setShowAdd(false)}>Cancel</button></div>
    </div>}
    <div className="pq-history"><p>Every change is saved to the history, with who made it.</p></div>
  </section>;
}
