"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import { supabase } from "@/lib/supabase";

type PredictionProfile = {
  prediction_id: string;
  nickname: string;
  created_at: string;
};

export default function PredictionsPage() {
  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<PredictionProfile | null>(null);
  const [checking, setChecking] = useState(true);

  async function loadProfile() {
    if (!supabase) { setChecking(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setChecking(false); return; }
    const { data, error } = await supabase
      .from("prediction_profiles")
      .select("prediction_id,nickname,created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) setMessage("Your account is verified, but we could not load your profile. Please refresh.");
    setProfile(data as PredictionProfile | null);
    setChecking(false);
  }

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadProfile(); }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function requestEmailLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (mode === "register" && nickname.trim().length < 2) {
      setMessage("Choose a nickname with at least 2 characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: `${window.location.origin}/predictions`,
        shouldCreateUser: mode === "register",
        data: mode === "register" ? {
          prediction_account: "true",
          prediction_nickname: nickname.trim().slice(0, 24),
        } : undefined,
      },
    });
    if (error) setMessage(error.message);
    else setSent(true);
    setBusy(false);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setProfile(null);
    setSent(false);
    setMessage("");
  }

  if (!supabase) return <main className="shell"><h1>Predictions are temporarily unavailable.</h1><p>Supabase configuration is missing.</p></main>;

  return (
    <main className="shell">
      <SiteNavigation />
      <section className="prediction-auth-wrap">
        <div className="eyebrow">BASE25 PRO · PREDICTIONS LEAGUE</div>
        <h1>Call the winner.<br /><span>Build your record.</span></h1>
        <p className="prediction-intro">Predict weekly competition results, earn points for correct calls and climb the predictions leaderboard.</p>

        {checking ? <div className="prediction-auth-card">Checking your account…</div> : profile ? (
          <section className="prediction-auth-card">
            <div className="eyebrow">YOUR PREDICTION ACCOUNT</div>
            <h2>Welcome, {profile.nickname}.</h2>
            <div className="prediction-id">{profile.prediction_id}</div>
            <p>Your email is verified and your Prediction ID is ready. Prediction rounds will appear here when the league opens.</p>
            <button type="button" className="prediction-primary" onClick={signOut}>Sign out</button>
          </section>
        ) : sent ? (
          <section className="prediction-auth-card" aria-live="polite">
            <div className="prediction-mail-icon">✉</div>
            <h2>Check your email.</h2>
            <p>We sent a secure sign-in link to <strong>{email}</strong>. Open it on this device to verify your email and access your BASE25 Predictions account.</p>
            <button type="button" className="prediction-secondary" onClick={() => setSent(false)}>Use a different email</button>
          </section>
        ) : (
          <section className="prediction-auth-card">
            <div className="prediction-tabs">
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); }}>Create account</button>
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>
            </div>
            <form className="prediction-form" onSubmit={requestEmailLink}>
              {mode === "register" && <label>Choose a nickname<input required minLength={2} maxLength={24} value={nickname} onChange={e => setNickname(e.target.value)} placeholder="e.g. CueMaster" /></label>}
              <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <button className="prediction-primary" disabled={busy}>{busy ? "Sending link…" : mode === "register" ? "Verify email & create account" : "Send sign-in link"}</button>
            </form>
            {message && <p className="prediction-error" role="alert">{message}</p>}
            <p className="prediction-privacy">No password. No phone number. Your email is used to secure your account and recover access.</p>
          </section>
        )}
        <p className="prediction-back"><Link href="/">← Back to BASE25 PRO</Link></p>
      </section>
      <style jsx>{`
        .prediction-auth-wrap{max-width:560px;margin:68px auto 110px;padding:0 18px}
        .prediction-auth-wrap h1{font-size:clamp(2.5rem,8vw,4.5rem);line-height:1.02;letter-spacing:-.055em;margin:14px 0}
        .prediction-auth-wrap h1 span{color:var(--lime,#c7f36b)}
        .prediction-intro{color:var(--muted,#a3a3a3);line-height:1.7;max-width:470px;margin-bottom:28px}
        .prediction-auth-card{background:var(--panel,#151515);border:1px solid var(--line,#303030);border-radius:18px;padding:24px}
        .prediction-auth-card h2{font-size:1.65rem;margin:10px 0}
        .prediction-auth-card p{color:var(--muted,#a3a3a3);line-height:1.65}
        .prediction-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:22px}
        .prediction-tabs button,.prediction-secondary{background:transparent;color:inherit;border:1px solid var(--line,#333);border-radius:10px;padding:12px;font-weight:700}
        .prediction-tabs button.active{background:var(--lime,#c7f36b);color:#111;border-color:var(--lime,#c7f36b)}
        .prediction-form{display:grid;gap:18px}
        .prediction-form label{display:grid;gap:8px;font-size:.9rem;font-weight:650}
        .prediction-form input{width:100%;padding:14px 13px;border-radius:10px;border:1px solid var(--line,#444);background:#0d0d0d;color:white;font:inherit}
        .prediction-primary{width:100%;border:0;border-radius:10px;padding:15px;background:var(--lime,#c7f36b);color:#111;font-weight:800;font-size:.95rem;cursor:pointer}
        .prediction-primary:disabled{opacity:.6;cursor:wait}
        .prediction-privacy{font-size:.78rem;margin:18px 0 0}
        .prediction-error{color:#ff8e8e!important;font-size:.88rem}
        .prediction-mail-icon{font-size:2rem}
        .prediction-id{display:inline-block;padding:10px 14px;border:1px solid var(--line,#444);border-radius:9px;font-weight:800;letter-spacing:.08em;margin:8px 0}
        .prediction-back{margin-top:24px;font-size:.9rem}
        .prediction-back a{color:var(--muted,#aaa);text-decoration:none}
        @media(max-width:600px){.prediction-auth-wrap{margin:38px auto 100px}.prediction-auth-card{padding:19px}}
      `}</style>
    </main>
  );
}
