"use client";
import { FormEvent,useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import SiteNavigation from "@/components/SiteNavigation";
export default function ForgotPasswordPage(){
 const [email,setEmail]=useState("");const [busy,setBusy]=useState(false);const [notice,setNotice]=useState("");const [error,setError]=useState("");
 async function submit(e:FormEvent){e.preventDefault();if(!supabase)return;setBusy(true);setNotice("");setError("");const {error}=await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(),{redirectTo:`${window.location.origin}/reset-password`});if(error)setError(error.message);else setNotice("If an account exists for that email, a password reset link has been sent. Check your inbox.");setBusy(false);}
 return <main className="shell redesign-shell"><SiteNavigation/><section className="auth-wrap"><div className="eyebrow">ACCOUNT RECOVERY</div><h1>Reset password<span>.</span></h1><p className="muted">Already created your BASE25 login? Enter its email to receive a password reset link. If BASE25 has only assigned you an email and you have never created a login, use Create Player Account first. Password reset cannot create a new account.</p><form className="form auth-card" onSubmit={submit}><label>Email address<input required type="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy}>{busy?"Sending...":"Send reset link"}</button>{error&&<p className="notice">{error}</p>}{notice&&<p className="auth-success">{notice}</p>}<p className="muted auth-foot">New to BASE25 PRO? <Link href="/register">Create player account</Link></p><p className="muted auth-foot"><Link href="/login">Back to sign in</Link></p></form></section></main>;
}
