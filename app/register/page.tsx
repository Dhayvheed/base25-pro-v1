"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";

export default function RegisterPage() {
  const [fullName,setFullName]=useState("");
  const [username,setUsername]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState("");
  const [error,setError]=useState("");
  async function submit(event:FormEvent){
    event.preventDefault(); if(!supabase)return;
    setBusy(true);setError("");setNotice("");
    const cleanUsername=username.trim().replace(/^@/,"");
    const {error}=await supabase.auth.signUp({email:email.trim().toLowerCase(),password,options:{emailRedirectTo:`${window.location.origin}/account`,data:{full_name:fullName.trim(),username:cleanUsername}}});
    if(error)setError(error.message);
    else setNotice("Check your inbox for the BASE25 PRO verification email. Open the link on this device to activate your account.");
    setBusy(false);
  }
  return <main className="shell redesign-shell"><SiteNavigation/><section className="auth-wrap"><div className="eyebrow">BASE25 PRO / PLAYER ACCESS</div><h1>Create your player account<span>.</span></h1><p className="muted">Use the email assigned to you by BASE25, and enter your exact registered player username. New players can register here too.</p><form className="form auth-card" onSubmit={submit}><label>Full name<input required value={fullName} onChange={e=>setFullName(e.target.value)} autoComplete="name"/></label><label>BASE25 username<input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="e.g. Abigail"/></label><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input required type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" placeholder="At least 8 characters"/></label><button disabled={busy}>{busy?"Creating account...":"Create account"}</button>{error&&<p className="notice">{error}</p>}{notice&&<p className="auth-success">{notice}</p>}<p className="muted auth-foot">Already registered? <Link href="/login">Sign in</Link></p></form></section></main>;
}
