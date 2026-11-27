"use client";

import { useMemo, useState } from "react";

type PlayerOption = { id: string; username: string; full_name: string; player_code: string };
type Props = { players: PlayerOption[]; onBack: () => void };
const FIGHTERS = [{"name":"Cetrion","group":"A"},{"name":"Jacqui Briggs","group":"A"},{"name":"Liu Kang","group":"A"},{"name":"The Joker","group":"A"},{"name":"Fujin","group":"A"},{"name":"Geras","group":"A"},{"name":"Jade","group":"A"},{"name":"Sub-Zero","group":"B"},{"name":"Shang Tsung","group":"B"},{"name":"Kabal","group":"B"},{"name":"Kung Lao","group":"B"},{"name":"Erron Black","group":"B"},{"name":"Kano","group":"B"},{"name":"Noob Saibot","group":"B"},{"name":"Cassie Cage","group":"B"},{"name":"Johnny Cage","group":"B"},{"name":"Kotal Kahn","group":"B"},{"name":"Spawn","group":"B"},{"name":"Sheeva","group":"C"},{"name":"Raiden","group":"C"},{"name":"Jax","group":"C"},{"name":"Kollector","group":"C"},{"name":"Terminator","group":"C"},{"name":"Scorpion","group":"C"},{"name":"D’Vorah","group":"C"},{"name":"Baraka","group":"C"},{"name":"Nightwolf","group":"C"},{"name":"Rain","group":"C"},{"name":"Sindel","group":"C"},{"name":"Frost","group":"C"},{"name":"Mileena","group":"C"},{"name":"Sonya Blade","group":"C"},{"name":"Kitana","group":"C"},{"name":"Skarlet","group":"C"},{"name":"RoboCop","group":"C"},{"name":"Shao Kahn","group":"D"},{"name":"Rambo","group":"D"}];

export default function KombatMatchRecorderPreview({ players, onBack }: Props) {
  const [playerOne, setPlayerOne] = useState("");
  const [playerTwo, setPlayerTwo] = useState("");
  const [fighterOne, setFighterOne] = useState("");
  const [fighterTwo, setFighterTwo] = useState("");
  const [matchType, setMatchType] = useState<"ranked" | "casual">("ranked");
  const [format, setFormat] = useState<"bo3" | "bo5">("bo3");
  const [winners, setWinners] = useState<string[]>([]);
  const [showReview, setShowReview] = useState(false);
  const winsOne = winners.filter((id) => id === playerOne).length;
  const winsTwo = winners.filter((id) => id === playerTwo).length;
  const target = format === "bo3" ? 2 : 3;
  const complete = winsOne === target || winsTwo === target;
  const selectedWinner = winsOne > winsTwo ? playerOne : playerTwo;
  const playerName = (id: string) => players.find((p) => p.id === id)?.username ?? "Select player";
  const remainingGames = target * 2 - 1;
  const canRecordGame = Boolean(playerOne && playerTwo && playerOne !== playerTwo && fighterOne && fighterTwo && !complete && winners.length < remainingGames);

  function setGameWinner(index: number, winnerId: string) {
    setWinners((current) => {
      const next = current.slice(0, index);
      if (winnerId) next[index] = winnerId;
      return next;
    });
    setShowReview(false);
  }

  function changeFormat(next: "bo3" | "bo5") {
    setFormat(next);
    setWinners([]);
    setShowReview(false);
  }

  const reviewScore = useMemo(() => ({ one: winsOne, two: winsTwo }), [winsOne, winsTwo]);

  return <div className="kombat-recorder">
    <div className="kr-topline"><button type="button" onClick={onBack}>← Admin desk</button><span>GAME MODE / MORTAL KOMBAT 11</span></div>
    <div className="kr-heading"><div className="kr-kicker">KOMBAT · MATCH ENTRY</div><h2>Record a fight<span>.</span></h2><p>Separate from pool matches. No pool racks, no pool Elo, no Kings Pot.</p></div>
    <div className="kr-mode-row" role="group" aria-label="Match type">
      <button type="button" className={matchType === "ranked" ? "active" : ""} onClick={() => {setMatchType("ranked");setShowReview(false);}}>RANKED <small>Ratings & weekly board</small></button>
      <button type="button" className={matchType === "casual" ? "active" : ""} onClick={() => {setMatchType("casual");setShowReview(false);}}>CASUAL <small>History only</small></button>
    </div>
    <div className="kr-card">
      <div className="kr-step">01 / PLAYERS</div>
      <div className="kr-player-grid">
        <label>PLAYER ONE<select value={playerOne} onChange={e=>{setPlayerOne(e.target.value);setWinners([]);setShowReview(false);}}><option value="">Choose player</option>{players.filter(p=>p.id!==playerTwo).map(p=><option key={p.id} value={p.id}>@{p.username} · {p.player_code}</option>)}</select></label>
        <label>PLAYER TWO<select value={playerTwo} onChange={e=>{setPlayerTwo(e.target.value);setWinners([]);setShowReview(false);}}><option value="">Choose player</option>{players.filter(p=>p.id!==playerOne).map(p=><option key={p.id} value={p.id}>@{p.username} · {p.player_code}</option>)}</select></label>
      </div>
    </div>
    <div className="kr-card">
      <div className="kr-step">02 / FIGHTERS</div>
      <div className="kr-player-grid">
        <label>{playerName(playerOne).toUpperCase()} · FIGHTER<select value={fighterOne} onChange={e=>{setFighterOne(e.target.value);setShowReview(false);}}><option value="">Choose fighter</option>{FIGHTERS.map(f=><option key={f.name} value={f.name}>{f.name} · Group {f.group}</option>)}</select></label>
        <label>{playerName(playerTwo).toUpperCase()} · FIGHTER<select value={fighterTwo} onChange={e=>{setFighterTwo(e.target.value);setShowReview(false);}}><option value="">Choose fighter</option>{FIGHTERS.map(f=><option key={f.name} value={f.name}>{f.name} · Group {f.group}</option>)}</select></label>
      </div>
      <p className="kr-note">One fighter per player for the full match.</p>
    </div>
    <div className="kr-card">
      <div className="kr-step">03 / SERIES FORMAT</div>
      <div className="kr-format">
        <button type="button" className={format==="bo3"?"chosen":""} onClick={()=>changeFormat("bo3")}><b>BEST OF 3</b><small>First to 2 wins</small></button>
        <button type="button" className={format==="bo5"?"chosen":""} onClick={()=>changeFormat("bo5")}><b>BEST OF 5</b><small>First to 3 wins · Finals</small></button>
      </div>
      <div className="kr-score"><div><small>{playerName(playerOne)}</small><b>{reviewScore.one}</b></div><span>—</span><div><small>{playerName(playerTwo)}</small><b>{reviewScore.two}</b></div></div>
      <div className="kr-games">{Array.from({length:Math.min(remainingGames,winners.length+1)},(_,i)=><div className="kr-game" key={i}><b>GAME {i+1}{i===remainingGames-1?" · DECIDER":""}</b><div><button type="button" disabled={!canRecordGame && !winners[i]} className={winners[i]===playerOne?"won":""} onClick={()=>setGameWinner(i,playerOne)}>{playerName(playerOne)} won</button><button type="button" disabled={!canRecordGame && !winners[i]} className={winners[i]===playerTwo?"won":""} onClick={()=>setGameWinner(i,playerTwo)}>{playerName(playerTwo)} won</button></div></div>)}</div>
      {complete&&<div className="kr-winner"><span>SERIES WINNER</span><b>{playerName(selectedWinner)}</b><strong>{winsOne} — {winsTwo}</strong></div>}
    </div>
    <div className="kr-disclaimer"><b>PREVIEW MODE</b><span>This screen is interactive, but saving is disabled. No match will be written to the database until the Kombat database and secure publish action are approved and connected.</span></div>
    <button type="button" className="kr-review" disabled={!complete || !fighterOne || !fighterTwo} onClick={()=>setShowReview(true)}>REVIEW MATCH</button>
    {showReview&&<div className="kr-review-panel"><div className="kr-step">MATCH REVIEW · NOT PUBLISHED</div><h3>{playerName(selectedWinner)} takes the series</h3><p>{fighterOne} ({playerName(playerOne)}) vs {fighterTwo} ({playerName(playerTwo)})</p><strong>{winsOne} — {winsTwo} · {format==="bo3"?"BEST OF 3":"BEST OF 5"} · {matchType.toUpperCase()}</strong><p>Publishing is intentionally disabled in this prototype.</p><button type="button" onClick={()=>setShowReview(false)}>Back to editing</button></div>}
    <style jsx>{`
      .kombat-recorder{color:#f4f3ee;background:linear-gradient(160deg,#100d10,#170e12 55%,#0b0a0d);border:1px solid #48232d;border-radius:18px;padding:clamp(14px,3vw,26px);max-width:850px;margin:0 auto 40px;box-shadow:0 18px 50px #0008}
      .kr-topline{display:flex;justify-content:space-between;gap:10px;align-items:center;border-bottom:1px solid #45232d;padding-bottom:13px}.kr-topline button{background:none;border:0;color:#e3a6ad;font-weight:800}.kr-topline span,.kr-kicker,.kr-step{font:800 10px/1.4 monospace;letter-spacing:.13em;color:#e58c99}
      .kr-heading{padding:23px 0 17px}.kr-heading h2{font-size:clamp(30px,6vw,46px);margin:5px 0;letter-spacing:-.05em}.kr-heading h2 span{color:#f04b61}.kr-heading p,.kr-note{color:#b5a7aa;font-size:12px;line-height:1.5}
      .kr-mode-row,.kr-format{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:14px}.kr-mode-row button,.kr-format button{background:#171216;color:#d9cbd0;border:1px solid #49303a;border-radius:11px;padding:12px;text-align:left;font-weight:900}.kr-mode-row button.active,.kr-format button.chosen{border-color:#f04b61;background:#35131d;color:#fff}.kr-mode-row small,.kr-format small{display:block;color:#bdaeb2;font-size:10px;margin-top:5px;font-weight:500}
      .kr-card,.kr-review-panel{border:1px solid #3c2930;background:#120f12;border-radius:13px;padding:16px;margin:12px 0}.kr-step{margin-bottom:13px}.kr-player-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.kr-player-grid label{display:grid;gap:7px;font:800 9px monospace;letter-spacing:.08em;color:#c9b9be}.kr-player-grid select{width:100%;min-width:0;background:#21171d;color:#fff;border:1px solid #59313d;border-radius:9px;padding:12px;font-size:13px}
      .kr-score{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;text-align:center;margin:18px 0 10px}.kr-score>div{display:grid;gap:3px}.kr-score small{font:700 10px monospace;color:#bbaeb1;overflow-wrap:anywhere}.kr-score b{font:900 32px monospace;color:#f36b7a}.kr-score>span{color:#7d6c72}
      .kr-games{display:grid;gap:9px}.kr-game{display:grid;gap:8px;padding:12px;border:1px solid #382830;border-radius:10px}.kr-game>b{font:800 9px monospace;letter-spacing:.1em;color:#d88b97}.kr-game>div{display:grid;grid-template-columns:1fr 1fr;gap:8px}.kr-game button{border:1px solid #54323b;border-radius:8px;background:#21171d;color:#e9dfe2;padding:10px;font-size:12px}.kr-game button.won{border-color:#f04b61;background:#401621;color:#fff}.kr-game button:disabled{opacity:.4}
      .kr-winner{display:grid;grid-template-columns:1fr auto;gap:6px 12px;padding:13px;margin-top:12px;border:1px solid #b13c4d;border-radius:10px;background:#2b1118}.kr-winner span{font:800 9px monospace;color:#e58c99;letter-spacing:.1em}.kr-winner b{font-size:18px}.kr-winner strong{grid-column:2;grid-row:1/3;align-self:center;font:900 26px monospace;color:#ff7a88}
      .kr-disclaimer{display:grid;gap:5px;padding:13px;border:1px dashed #76515a;border-radius:10px;background:#1b1116;margin:14px 0}.kr-disclaimer b{font:900 9px monospace;letter-spacing:.12em;color:#f2b3bc}.kr-disclaimer span{font-size:11px;line-height:1.5;color:#c6b8bc}.kr-review{width:100%;padding:15px;border:0;border-radius:10px;background:#e94158;color:white;font-weight:950;letter-spacing:.1em}.kr-review:disabled{opacity:.35}.kr-review-panel h3{font-size:22px;margin:4px 0}.kr-review-panel p{color:#c2b2b7;font-size:12px}.kr-review-panel>strong{color:#ff8290;font:900 13px monospace}.kr-review-panel>button{padding:9px 12px;border:1px solid #71414c;border-radius:8px;background:#27171d;color:#fff}
      @media(max-width:560px){.kr-player-grid{grid-template-columns:1fr}.kr-topline span{font-size:8px}.kr-card{padding:13px}}
    `}</style>
  </div>;
}
