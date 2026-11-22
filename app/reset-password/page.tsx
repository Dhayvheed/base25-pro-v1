"use client";
import { FormEvent,useEffect,useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
export default function ResetPasswordPage(){
 const [password,setPassword]=useState("");const [showPassword,setShowPassword]=useState(false);const [ready,setReady]=useState(false);const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [error,setError]=useState("");
 useEffect(()=>{if(!supabase)return;supabase.auth.getSession().then(({data})=>{setReady(!!data.session);if(!data.session)setError("This reset link is invalid or has expired. Request a new one.");});},[]);
 async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError("");const {error}=await supabase.auth.updateUser({password});if(error)setError(error.message);else{setNotice("Your password has been updated. You can now sign in.");await supabase.auth.signOut();}setBusy(false);}
 return <main className="shell redesign-shell"><SiteNavigation/><section className="auth-wrap"><div className="eyebrow">ACCOUNT RECOVERY</div><h1>Choose a new password<span>.</span></h1><form className="form auth-card" onSubmit={submit}><label>New password<div className="password-input-wrap"><input required type={showPassword?"text":"password"} minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password"/><button type="button" className="password-visibility" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"} aria-pressed={showPassword}>{showPassword?"Hide":"Show"}</button></div></label><button disabled={!ready||busy}>{busy?"Updating...":"Update password"}</button>{error&&<p className="notice">{error}</p>}{notice&&<p className="auth-success">{notice} <Link href="/login">Sign in</Link></p>}</form></section></main>;
}
