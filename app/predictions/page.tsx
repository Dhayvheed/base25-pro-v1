"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import SiteNavigation from "@/components/SiteNavigation";
import { supabase } from "@/lib/supabase";

type PlayerProfile = {
  id: string;
  player_code: string;
  username: string;
  full_name: string;
  photo_url: string | null;
  elo_rating: number;
  highest_elo: number;
  matches_played: number;
  wins: number;
  losses: number;
  win_percentage: number;
  account_status: "new" | "active";
  created_at: string;
};

export default function PredictionsPage() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [mode, setMode] = useState<"register" | "login">("register");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [checking, setChecking] = useState(true);

  async function loadProfile() {
    if (!supabase) { setChecking(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setProfile(null); setChecking(false); return; }
    const { data, error } = await supabase.rpc("get_my_base25_player_profile");
    if (error) setMessage("Your account is verified, but we could not load your BASE25 player profile. Please refresh.");
    setProfile((Array.isArray(data) ? data[0] : null) as PlayerProfile | null);
    setChecking(false);
  }

  useEffect(() => {
    if (!supabase) { setChecking(false); return; }
    void loadProfile();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => { void loadProfile(); }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function requestEmailLink(event: FormEvent) {
    event.preventDefault();
    if (!supabase) return;
    if (mode === "register" && (fullName.trim().length < 2 || username.trim().length < 2)) {
      setMessage("Enter your name and a username with at least 2 characters.");
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
          full_name: fullName.trim().slice(0, 60),
          username: username.trim().replace(/^@/, "").slice(0, 24),
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

  if (!supabase) return <main className="shell"><h1>BASE25 accounts are temporarily unavailable.</h1><p>Supabase configuration is missing.</p></main>;

  return (
    <main className="shell">
      <SiteNavigation />
      <section className="prediction-auth-wrap">
        <div className="eyebrow">BASE25 PRO · YOUR PLAYER ACCOUNT</div>
        <h1>One account.<br /><span>Every competition.</span></h1>
        <p className="prediction-intro">Create your BASE25 player identity once. Use the same account for your player profile, competition records and Predictions League.</p>

        {checking ? <div className="prediction-auth-card">Checking your account…</div> : profile ? (
          <section className="prediction-auth-card">
            <div className="eyebrow">YOUR BASE25 PLAYER PROFILE</div>
            <h2>Welcome, {profile.username}.</h2>
            <div className="prediction-id">{profile.player_code}</div>
            <div className="profile-stats">
              <div><small>Starting / Current ELO</small><b>{profile.elo_rating.toLocaleString()}</b></div>
              <div><small>Matches played</small><b>{profile.matches_played}</b></div>
              <div><small>Wins</small><b>{profile.wins}</b></div>
              <div><small>Win rate</small><b>{Number(profile.win_percentage || 0).toFixed(1)}%</b></div>
            </div>
            <p>{profile.account_status === "active" ? "Your competitive record is active." : "Your player profile is ready. Play your first ranked match at BASE25 to enter the competitive leaderboard."}</p>
            <div className="profile-actions">
              <Link className="prediction-primary" href={`/players/${profile.id}`}>View player profile</Link>
              <Link className="prediction-secondary" href="/leaderboard">View leaderboard</Link>
              <Link className="prediction-secondary" href="/">Explore BASE25 PRO</Link>
            </div>
            <button type="button" className="prediction-secondary signout" onClick={signOut}>Sign out</button>
          </section>
        ) : sent ? (
          <section className="prediction-auth-card" aria-live="polite">
            <div className="prediction-mail-icon">✉</div>
            <h2>Check your email.</h2>
            <p>We sent a secure sign-in link to <strong>{email}</strong>. Open it to verify your email and access your BASE25 account.</p>
            <button type="button" className="prediction-secondary" onClick={() => setSent(false)}>Use a different email</button>
          </section>
        ) : (
          <section className="prediction-auth-card">
            <div className="prediction-tabs">
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => { setMode("register"); setMessage(""); }}>Create account</button>
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setMessage(""); }}>Sign in</button>
            </div>
            <form className="prediction-form" onSubmit={requestEmailLink}>
              {mode === "register" && <>
                <label>Full name<input required minLength={2} maxLength={60} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" /></label>
                <label>Choose a username<input required minLength={2} maxLength={24} value={username} onChange={e => setUsername(e.target.value)} placeholder="e.g. CueMaster" /></label>
              </>}
              <label>Email address<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></label>
              <button className="prediction-primary" disabled={busy}>{busy ? "Sending link…" : mode === "register" ? "Verify email & create player profile" : "Send sign-in link"}</button>
            </form>
            {message && <p className="prediction-error" role="alert">{message}</p>}
            <p className="prediction-privacy">Email verification protects your account. Your player profile is created automatically after registration. No phone number required.</p>
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
        .prediction-tabs button,.prediction-secondary{background:transparent;color:inherit;border:1px solid var(--line,#333);border-radius:10px;padding:12px;font-weight:700;text-align:center;text-decoration:none}
        .prediction-tabs button.active{background:var(--lime,#c7f36b);color:#111;border-color:var(--lime,#c7f36b)}
        .prediction-form{display:grid;gap:18px}
        .prediction-form label{display:grid;gap:8px;font-size:.9rem;font-weight:650}
        .prediction-form input{width:100%;padding:14px 13px;border-radius:10px;border:1px solid var(--line,#444);background:#0d0d0d;color:white;font:inherit}
        .prediction-primary{display:block;width:100%;border:0;border-radius:10px;padding:15px;background:var(--lime,#c7f36b);color:#111;font-weight:800;font-size:.95rem;cursor:pointer;text-align:center;text-decoration:none}
        .prediction-primary:disabled{opacity:.6;cursor:wait}
        .prediction-privacy{font-size:.78rem;margin:18px 0 0}
        .prediction-error{color:#ff8e8e!important;font-size:.88rem}
        .prediction-mail-icon{font-size:2rem}
        .prediction-id{display:inline-block;padding:10px 14px;border:1px solid var(--line,#444);border-radius:9px;font-weight:800;letter-spacing:.08em;margin:8px 0}
        .prediction-back{margin-top:24px;font-size:.9rem}
        .prediction-back a{color:var(--muted,#aaa);text-decoration:none}
        .profile-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:18px 0}
        .profile-stats div{background:#0d0d0d;border:1px solid var(--line,#333);border-radius:10px;padding:13px;display:grid;gap:5px}
        .profile-stats small{color:var(--muted,#aaa);font-size:.75rem}.profile-stats b{font-size:1.2rem}
        .profile-actions{display:grid;gap:9px;margin-top:18px}.signout{width:100%;margin-top:10px}
        @media(max-width:600px){.prediction-auth-wrap{margin:38px auto 100px}.prediction-auth-card{padding:19px}}
      `}</style>
    </main>
  );
}
