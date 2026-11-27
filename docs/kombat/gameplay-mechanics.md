# BASE25 KOMBAT — Approved Gameplay Mechanics

Status: specification captured from the approved BASE25 KOMBAT requirements. This is the source of truth for implementation. Do not invent or silently alter rules.

## 1. Game and match format
- Game: Mortal Kombat 11.
- Competitive mode: 1v1.
- A match is a series of individual games.
- Regular ranked matches: Best of 3 (Bo3).
- Saturday final: Best of 5 (Bo5).
- One fighter selection per player per match. The two players cannot select the same fighter in the same match.
- A match is entered and published as one complete result by an authorized Manager. There is no opponent confirmation or pending approval queue.

## 2. Ranked and casual separation
### Ranked
- Counts toward Kombat Elo, weekly leaderboard, ranked win/loss record, streaks, fighter performance, matchup statistics and rivalries.
- Adds to the Kombat Pot only when pot mode is `live`, and only for eligible ranked matches.
- First ranked match initializes the player's Kombat rating using the approved starting rating.
### Casual
- Appears in public match history and is clearly labelled CASUAL.
- Does not change Elo, weekly leaderboard, ranked records, streaks, fighter competitive statistics, rivalries or pot contribution.

## 3. Ratings and leaderboard
- Kombat Elo is independent from Billiards Elo and FIFA ratings.
- Fighter rating is a BASE25 performance metric, not the official game's rating and not player Elo.
- Never update `players.elo_rating` or `players.highest_elo` from Kombat.
- Weekly cycle runs Saturday to Saturday in Africa/Lagos.
- Top 5 qualify for the Saturday final.
- Final is Bo5, ranked and marked FINAL; it does not add a pot contribution.
- King of Arena is the #1 weekly player. Tie-breakers: higher all-time Kombat Elo, then more ranked wins.
- Freeze/crown the week after the Saturday final. Do not invent a Monday reset.

## 4. Pot
- Pot is a separate Kombat Pot; do not use Billiards King's Pot tables or contribution triggers.
- Modes:
  - `live`: eligible ranked matches in the current week × configured contribution (default ₦100 per match).
  - `fixed`: owner-entered weekly amount.
  - `soon`: display “Coming soon” with no amount. Default mode.
- The final itself does not contribute to the pot.
- On crown, save the pot snapshot and prize amount in the Kombat Hall of Fame.

## 5. Roles and permissions
- Guest: public pages and published public records.
- Player: public records plus own private profile.
- Manager: record, edit and void matches.
- Attendant: cannot record, edit or void Kombat matches.
- Owner: all Manager capabilities plus pot settings, thresholds and past-week controls.
- Do not authorize using user-editable JWT user_metadata.
- No direct public client writes. Match publish must later be an atomic server/database transaction.

## 6. Fighter roster and derived stats
- Start with the approved 37-fighter roster reference, stored as editable database records, not hard-coded UI data.
- House players are supported as a player flag but are not required at launch.
- Main fighter: most ranked matches; ties go to the most recently used fighter.
- Fighter stats: ranked matches, wins, losses, win rate and pick rate.
- Tier thresholds are configurable; default minimum sample is 10 ranked matches. Below sample minimum: Unrated.
- Fighter matchup stats appear only after at least 3 meetings.
- Character of the Week: highest ranked win rate with at least 5 matches.
- Rivalry appears only after at least 3 meetings. Show last-7 record, current streak and recent encounters.
  - HEATED: last seven meetings are within one win.
  - ONE-SIDED: one player has won at least 75%.
  - Otherwise ONGOING.

## 7. Editing, voiding and audit
- Every publish, edit, void, pot-mode change and crown action must be audited.
- Editing or voiding must recalculate Kombat-derived state consistently.
- Frozen past weeks can only be changed by Owner.
- If historical Elo cannot be safely recalculated, stop and request approval; never silently rewrite history.
- Crown must be blocked if the week has no ranked matches and must never run twice for the same week.

## 8. Crown sequence
1. Freeze the week.
2. Snapshot standings, champion, pot, fighter statistics and rivalries.
3. Add champion to Hall of Fame with the applicable prize amount (live pot value, fixed amount, or none for soon).
4. Reset only Kombat weekly rating, leaderboard, live pot and weekly statistics.
5. Open the next Kombat week.
- Kombat earnings are included in per-game and combined all-time tournament earnings, with a separate Kombat Paid Out figure.
- In-person cashouts follow the existing Billiards cashout experience without reusing Billiards match or pot records.
- Optional wagers may reuse the existing wager concept only with both players' agreement and winner-takes-pot settlement.
- Predictions remain Billiards-only; do not add Kombat prediction UI.

## 9. Cross-game isolation — hard requirement
- Billiards: existing Billiards match workflow and tables only.
- FIFA: existing FIFA workflow and `fc_*` tables only.
- Kombat: Kombat-specific forms, services, RPCs and `kombat_*` tables only.
- Never share a generic match-recording function that silently routes by inferred game.
- Never write Kombat results to Billiards or FIFA tables.
- Never call Billiards Elo, rack, King's Pot, champion or prediction triggers from Kombat.
- Admin match form must display a persistent game label, game-specific fields, destination table/RPC in review, and a clear publish confirmation.
- Missing or mismatched game context blocks submission; never default to Billiards.

## 10. Delivery gates
- Phase 1: schema/data contract, roster and public read-only Arena.
- Phase 2: Manager match recording, publish, edit and void; atomic transaction; ranked/casual side effects.
- Phase 3: derived stats and remaining public pages.
- Phase 4: weekly final, crown, snapshots, pot configuration and Hall of Fame.
- Every phase uses its own feature branch and Vercel preview. Do not merge or change production without explicit approval.
