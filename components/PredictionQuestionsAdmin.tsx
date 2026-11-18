"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type LadderStep = { label: string; points: number; day_index: number; minute_of_day: number };
type Template = {
  template_key: string; title: string; description: string | null; category: string;
  points_reward: number; points_ladder: LadderStep[]; eligibility: string;
  opens_rule: string; closes_rule: string; data_condition: string | null;
  active: boolean; sort_order: number; minimum_matches: number;
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

  const load = useCallback(async()=>{
    if(!supabase)return;
    setLoading(true);
    const [{data,error},{data:auditRows}] = await Promise.all([
      supabase.from("prediction_question_templates").select("*").order("sort_order"),
      supabase.rpc("admin_list_prediction_question_audit")
    ]);
    if(error){setNotice("Could not load prediction templates: "+error.message);setLoading(false);return;}
    const rows=(data||[]) as Template[];
    setTemplates(rows);
    setAudit((auditRows||[]) as Audit[]);
    const currentStart = (()=>{const now=new Date();const lagos=new Date(now.toLocaleString("en-US",{timeZone:"Africa/Lagos"}));const day=lagos.getDay();lagos.setDate(lagos.getDate()-((day+1)%7));return `${lagos.getFullYear()}-${String(lagos.getMonth()+1).padStart(2,"0")}-${String(lagos.getDate()).padStart(2,"0")}`;})();
    const {data:questions}=await supabase.from("prediction_questions").select("id,template_key").eq("week_start",currentStart);
    const counts:Record<string,number>={};
    for(const q of questions||[]){const {count}=await supabase.from("prediction_entries").select("id",{count:"exact",head:true}).eq("question_id",q.id);counts[q.template_key||""]=(counts[q.template_key||""]||0)+(count||0);}
    setPickCounts(counts);setLoading(false);
  },[setNotice]);

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

  const totalPicks=useMemo(()=>Object.values(pickCounts).reduce((a,b)=>a+b,0),[pickCounts]);
  const FormFields=({value,change}:{value:Template;change:(key:keyof Template,val:any)=>void})=><>
    <label>Question text<input value={value.title} maxLength={140} onChange={e=>change("title",e.target.value)}/></label>
    <label>Short description<textarea value={value.description||""} rows={2} onChange={e=>change("description",e.target.value)}/></label>
    <div className="pq-two"><label>Base points<input type="number" min="1" max="10000" value={value.points_reward} onChange={e=>change("points_reward",Number(e.target.value))}/></label><label>Who can be picked<select value={value.eligibility} onChange={e=>change("eligibility",e.target.value)}><option value="all_active_players">All active players</option><option value="top5_snapshot">Saturday Top 5 snapshot</option></select></label></div>
    <div className="pq-two"><label>Opens<input value={value.opens_rule} onChange={e=>change("opens_rule",e.target.value)}/></label><label>Closes<input value={value.closes_rule} onChange={e=>change("closes_rule",e.target.value)}/></label></div>
    <div className="pq-two"><label>Minimum matches<input type="number" min="1" max="500" value={value.minimum_matches} onChange={e=>change("minimum_matches",Number(e.target.value))}/></label><label>Category<input value={value.category} onChange={e=>change("category",e.target.value)}/></label></div>
    <label>Data condition<input value={value.data_condition||""} placeholder="No extra condition" onChange={e=>change("data_condition",e.target.value)}/></label>
    <div className="pq-ladder-head"><b>Points on each step</b><button type="button" onClick={()=>change("points_ladder",[...value.points_ladder,{label:"New",points:50,day_index:0,minute_of_day:0}])}>＋ Add step</button></div>
    {value.points_ladder.map((step,i)=><div className="pq-step" key={i}><select aria-label="Day" value={step.day_index} onChange={e=>change("points_ladder",value.points_ladder.map((s,j)=>j===i?({...s,day_index:Number(e.target.value),label:dayNames[Number(e.target.value)]}):s))}>{dayNames.map((d,n)=><option value={n} key={d}>{d}</option>)}</select><input aria-label="Time" type="time" value={`${String(Math.floor(step.minute_of_day/60)).padStart(2,"0")}:${String(step.minute_of_day%60).padStart(2,"0")}`} onChange={e=>change("points_ladder",value.points_ladder.map((s,j)=>j===i?({...s,minute_of_day:Number(e.target.value.split(":")[0])*60+Number(e.target.value.split(":")[1])}):s))}/><input aria-label="Points" type="number" min="0" value={step.points} onChange={e=>change("points_ladder",value.points_ladder.map((s,j)=>j===i?({...s,points:Number(e.target.value)}):s))}/><button type="button" className="pq-remove" onClick={()=>change("points_ladder",value.points_ladder.filter((_,j)=>j!==i))}>×</button></div>)}
    <p className="pq-help">Players keep the points shown on the day they lock in a pick. All times are Africa/Lagos (WAT).</p>
  </>;

  return <section className="pq-root">
    <style jsx>{`
      .pq-root{color:#F4F5F2;max-width:760px;margin:0 auto;padding:0 0 100px;font-family:Inter,system-ui,sans-serif}
      .pq-head{display:flex;align-items:center;gap:12px;margin:4px 0 16px}.pq-back{width:38px;height:38px;border:1px solid #2B3A31;border-radius:10px;background:#101512;color:#dce4de;font-size:20px}.pq-kicker{font:11px 'JetBrains Mono',monospace;letter-spacing:2px;color:#C8F169}.pq-head h2{font-size:24px;letter-spacing:-.6px;margin:2px 0 0}
      .pq-summary{display:flex;align-items:center;gap:10px;padding:14px;background:#12201A;border:1px solid #24402F;border-radius:18px;margin-bottom:12px}.pq-dot{width:8px;height:8px;border-radius:50%;background:#C8F169}.pq-summary-copy{flex:1}.pq-summary-copy b{display:block;font-size:15px}.pq-summary-copy small{color:#9AA69F;font-size:12px}.pq-summary strong{color:#C8F169;font-size:12px;white-space:nowrap}
      .pq-add{width:100%;height:52px;border:0;border-radius:14px;background:#C8F169;color:#0A0E0C;font-weight:800;font-size:16px;margin:0 0 8px}.pq-note{color:#9AA69F;font-size:12px;line-height:1.5;margin:0 0 14px}
      .pq-card{background:#101512;border:1px solid #1F2A24;border-radius:18px;padding:14px;margin:12px 0}.pq-card.is-expanded{border-color:#2F6B45}.pq-row{display:flex;align-items:center;gap:12px}.pq-icon{width:40px;height:40px;border-radius:10px;background:#12201A;color:#C8F169;display:grid;place-items:center;font-size:22px;flex:none}.pq-copy{flex:1;min-width:0}.pq-copy b{font-size:15px;line-height:1.3;display:block}.pq-copy small{font-size:12px;color:#9AA69F;display:block;margin-top:3px}.pq-switch{width:44px;height:26px;border:0;border-radius:99px;background:#38443c;position:relative;flex:none;padding:0}.pq-switch.on{background:#C8F169}.pq-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#0A0E0C;transition:transform .15s}.pq-switch.on:after{transform:translateX(18px)}
      .pq-editor{margin-top:12px;padding-top:12px;border-top:1px solid #1F2A24}.pq-editor label,.pq-add-form label{display:block;color:#9AA69F;font-size:12px;margin:12px 0 6px}.pq-editor input,.pq-editor select,.pq-editor textarea,.pq-add-form input,.pq-add-form select,.pq-add-form textarea{width:100%;min-width:0;height:44px;border:1px solid #2B3A31;border-radius:10px;background:#0B110D;color:#F4F5F2;padding:0 12px;font:14px Inter,system-ui,sans-serif}.pq-editor textarea,.pq-add-form textarea{height:auto;padding:10px;resize:vertical}.pq-two{display:grid;grid-template-columns:1fr 1.4fr;gap:10px}.pq-ladder-head{display:flex;justify-content:space-between;align-items:center;margin:16px 0 6px;font-size:12px;color:#9AA69F}.pq-ladder-head button{background:none;border:0;color:#C8F169;font-weight:700}.pq-step{display:grid;grid-template-columns:1fr 1fr 1fr 32px;gap:6px;margin:7px 0}.pq-step input,.pq-step select{height:42px!important;padding:0 8px!important;text-align:center}.pq-remove{border:1px solid #3b2b2b;background:#1b1111;color:#F09595;border-radius:9px;font-size:18px}.pq-help{font-size:11px;color:#9AA69F;margin-top:8px;line-height:1.5}.pq-apply{margin-top:16px}.pq-apply-title{font-size:12px;color:#9AA69F;margin-bottom:7px}.pq-radio{display:flex;gap:10px;align-items:center;padding:12px;border:1px solid #2B3A31;border-radius:12px;margin:6px 0;cursor:pointer}.pq-radio.selected{border-color:#C8F169;background:#14241A}.pq-radio input{width:auto;height:auto;accent-color:#C8F169}.pq-radio b{font-size:14px;font-weight:500;display:block}.pq-radio small{font-size:12px;color:#9AA69F;display:block}.pq-warning{border:1px solid #7d4d32;background:#25180f;color:#F4C28E;padding:10px 12px;border-radius:10px;font-size:12px;line-height:1.45;margin-top:9px}.pq-actions{display:flex;gap:10px;margin-top:14px}.pq-save{flex:1;height:48px;border:0;border-radius:12px;background:#C8F169;color:#0A0E0C;font-weight:800}.pq-cancel{height:48px;padding:0 18px;border:1px solid #2B3A31;border-radius:12px;background:transparent;color:#F4F5F2}.pq-void{background:none;border:0;color:#F09595;font-size:13px;padding:0}.pq-last{font-size:12px;color:#9AA69F}.pq-history{margin-top:22px;border-top:1px solid #1F2A24;padding-top:16px}.pq-history h3{font-size:16px;margin:0 0 10px}.pq-history-row{padding:10px 0;border-bottom:1px solid #1F2A24;font-size:12px}.pq-history-row small{display:block;color:#9AA69F;margin-top:3px}.pq-add-form{background:#101512;border:1px solid #2F6B45;border-radius:18px;padding:14px;margin:12px 0}.pq-add-form h3{font-size:16px;margin-bottom:8px}.pq-empty{color:#9AA69F;font-size:13px;padding:20px;text-align:center}
      @media(max-width:520px){.pq-root{padding-left:0;padding-right:0}.pq-head h2{font-size:22px}.pq-two{grid-template-columns:1fr 1fr}.pq-step{grid-template-columns:.8fr 1fr .8fr 28px;gap:4px}}
    `}</style>
    <div className="pq-head"><button className="pq-back" type="button" onClick={onBack}>←</button><div><div className="pq-kicker">ADMIN DESK</div><h2>Prediction questions</h2></div></div>
    <div className="pq-summary"><span className="pq-dot"/><div className="pq-summary-copy"><b>Weekly prediction templates</b><small>Changes apply from next week unless you choose otherwise.</small></div><strong>{totalPicks} picks this week</strong></div>
    <button className="pq-add" type="button" onClick={()=>{setShowAdd(v=>!v);setDraft(null);setExpanded(null);}}>＋ Add question</button>
    <p className="pq-note">Questions repeat automatically every week. Each saved change is recorded in the audit history.</p>
    {loading?<p className="pq-empty">Loading prediction questions…</p>:templates.map(row=><article className={"pq-card"+(expanded===row.template_key?" is-expanded":"")} key={row.template_key}>
      <div className="pq-row"><div className="pq-icon">{icons[row.template_key]||"◎"}</div><div className="pq-copy"><b>{row.title}</b><small>{row.opens_rule} → {row.closes_rule} · {fmtLadder(row.points_ladder)} pts</small></div><button type="button" className={"pq-switch"+(row.active?" on":"")} aria-label={row.active?"Disable "+row.title:"Enable "+row.title} aria-pressed={row.active} onClick={()=>toggle(row)} /></div>
      {expanded===row.template_key&&draft&&<div className="pq-editor">
        <FormFields value={draft} change={(k,v)=>patch(k as keyof Template,v)}/>
        <div className="pq-apply"><div className="pq-apply-title">Apply this change</div>
          <label className={"pq-radio"+(!applyCurrent?" selected":"")}><input type="radio" checked={!applyCurrent} onChange={()=>setApplyCurrent(false)}/><span><b>From next week</b><small>Recommended. Nothing changes this week.</small></span></label>
          <label className={"pq-radio"+(applyCurrent?" selected":"")}><input type="radio" checked={applyCurrent} onChange={()=>setApplyCurrent(true)}/><span><b>This week too</b><small>Only before this question opens.</small></span></label>
          {applyCurrent&&(pickCounts[row.template_key]||0)>0&&<div className="pq-warning">{pickCounts[row.template_key]} players have already predicted. Current-week changes are blocked to protect their picks.</div>}
        </div>
        <div className="pq-actions"><button className="pq-save" type="button" disabled={busy} onClick={save}>{busy?"Saving…":"Save changes"}</button><button className="pq-cancel" type="button" onClick={()=>{setDraft(null);setExpanded(null);}}>Cancel</button></div>
        <div className="pq-last" style={{display:"flex",justifyContent:"space-between",marginTop:12}}><button type="button" className="pq-void" onClick={()=>setNotice("Voiding a live weekly question is not connected yet; use the existing question settlement controls until that action is implemented.")}>Void this week</button><span>Changes are audited</span></div>
      </div>}
      {expanded!==row.template_key&&<button type="button" style={{marginTop:12,background:"none",border:0,color:"#C8F169",fontWeight:700}} onClick={()=>edit(row)}>Edit question →</button>}
    </article>)}
    {showAdd&&<div className="pq-add-form"><h3>Add a question template</h3>
      <label>Template key<input value={newDraft.template_key} onChange={e=>setNewDraft(v=>({...v,template_key:e.target.value}))}/></label>
      <FormFields value={newDraft} change={(k,v)=>setNewDraft(cur=>({...cur,[k]:v}))}/>
      <div className="pq-actions"><button className="pq-save" type="button" disabled={busy} onClick={create}>{busy?"Adding…":"Add question"}</button><button className="pq-cancel" type="button" onClick={()=>setShowAdd(false)}>Cancel</button></div>
    </div>}
    <div className="pq-history"><h3>Change history</h3>{audit.length===0?<p className="pq-empty">No changes recorded yet.</p>:audit.map(item=><div className="pq-history-row" key={item.id}><b>{item.template_key.replace(/_/g," ")}</b> · {item.action.replace(/_/g," ")}<small>{item.actor_email||"Admin"} · {new Date(item.created_at).toLocaleString("en-GB",{timeZone:"Africa/Lagos"})}</small></div>)}</div>
  </section>;
}
