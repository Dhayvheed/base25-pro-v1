"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
export default function LoginPage(){
 const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setError("");const {error}=await supabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(error)setError(error.message);else window.location.href="/account";setBusy(false);}
 return <main className="shell redesign-shell"><SiteNavigation/><section className="auth-wrap"><div className="eyebrow">BASE25 PRO / PLAYER ACCESS</div><h1>Welcome back<span>.</span></h1><p className="muted">Sign in to view your player profile and competition record.</p><form className="form auth-card" onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label><label>Password<input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password"/></label><div className="auth-links"><Link href="/forgot-password">Forgot password?</Link></div><button disabled={busy}>{busy?"Signing in...":"Sign in"}</button>{error&&<p className="notice">{error}</p>}<p className="muted auth-foot">First time here? <Link href="/register">Create player account</Link></p></form></section></main>;
}
