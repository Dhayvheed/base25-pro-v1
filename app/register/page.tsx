"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

export default function RegisterPage() {
  const [isSpectator,setIsSpectator]=useState(false);
  useEffect(()=>{setIsSpectator(new URLSearchParams(window.location.search).get("type")==="spectator");},[]);
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [showPassword,setShowPassword]=useState(false);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  async function submit(event:FormEvent){
    event.preventDefault(); if(!supabase)return;
    setBusy(true);setError("");setNotice("");
    const cleanUsername=username.trim().replace(/^@/,"");
    const {error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:`${window.location.origin}${isSpectator?"/predictions":"/account"}`,data:{full_name:fullName.trim(),username:cleanUsername,prediction_nickname:cleanUsername,account_type:isSpectator?"spectator":"player"}}});
    if(error)setError(error.message);
    else setNotice("Check your inbox for the BASE25 PRO verification email. Open the link on this device to activate your account.");
    setBusy(false);
  }
  return <main className="shell redesign-shell"><SiteNavigation/><section className="auth-wrap"><div className="eyebrow">BASE25 PRO / ACCOUNT ACCESS</div><h1>{isSpectator?"Join the Predictions League":"Create your player account"}<span>.</span></h1><p className="muted">{isSpectator?"Create a BASE25 account to make predictions and compete on the community leaderboard. You do not need to be a snooker player.":"If BASE25 assigned you an email, enter that exact email and your registered BASE25 username. Create your password here, then verify your email to activate your existing player profile."}</p><form className="form auth-card" onSubmit={submit}><label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/></label><label>{isSpectator?"Prediction nickname":"BASE25 username"}<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder={isSpectator?"e.g. CueMaster":"e.g. Abigail"}/></label><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<div className="password-input-wrap"><input required type={showPassword?"text":"password"} minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters"/><button type="button" className="password-visibility" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword}>{showPassword?"Hide":"Show"}</button></div></label><button disabled={busy}>{busy?"Creating account...":"Create account"}</button>{error&&<p className="notice">{error}</p>}{notice&&<p className="auth-success">{notice}</p>}<p className="muted auth-foot">Already registered? <Link href="/login">Sign in</Link></p></form></section></main>;
}
