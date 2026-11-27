# BASE25 KOMBAT — Phase 1 database plan

Status: design/review only. This document does not apply schema changes to Supabase.

## Guardrails
- Kombat competitive records are isolated from Billiards matches, match_racks, King's Pot ledgers and Billiards prediction settlement.
- Shared identity only: Kombat rows reference public.players(id); do not write to Billiards Elo columns.
- Existing Billiards Elo recalculation is not reusable as-is: it recalculates the Billiards population and applies rack-margin logic. Preserve its maths and do not call it for Kombat.
- Match operations are Manager-only. Attendants cannot record, edit or void. Owner retains owner-only configuration and past-week controls.
- Public pages are read-only for guests. No client-side direct writes in Phase 1.
- Default Kombat pot mode is soon.
- All timestamps and weekly boundaries use Africa/Lagos.

## Proposed tables
1. kombat_fighters: editable roster; stable UUID, name, slug, optional image/tile colour, enabled flag, sort order.
2. kombat_weeks: start/end timestamps, open/final/frozen status, immutable snapshot fields added with the weekly-cycle phase.
3. kombat_config: singleton configuration; pot mode, fixed amount, per-ranked-match contribution (default ₦100), final format (Bo5), qualifying spots (5), configurable fighter tier thresholds and sample minimum.
4. kombat_ratings: one row per player; all-time Elo, weekly rating, ranked wins/losses, current streak. It must never update players.elo_rating.
5. kombat_matches: match-level record; two distinct players, two fighters, ranked/casual type, Bo3/Bo5 format, final flag, winner, series score, Elo before/after, pot contribution, creator, published/edited/void timestamps and reason.
6. kombat_match_games: ordered child rows for each game in a series, winner and optional round scores. Enforce valid series length and distinct competitors.
7. kombat_audit_log: append-only record of publish/edit/void, pot setting changes and crowning actions.

## Phase 1 implementation boundary
- Build the read-only Arena home and typed data contract.
- Prepare and review the SQL design before applying any production schema change.
- Add Realtime subscriptions for published match/rating/roster/config changes, with a timed refresh fallback.
- Do not enable match recording, derived-stat writes, pot contributions, weekly resets or crown operations in this phase.

## Atomic publishing requirement (Phase 2)
A single database transaction/RPC must validate the match, persist the match and game rows, update only Kombat-derived state, append audit data, and return the committed result. Casual matches must not alter ratings, leaderboard, fighter competitive stats, rivalries or pot. Ranked matches add the configured contribution only when pot mode is live.

## Production safety checklist
- Back up production before migration.
- Review every FK, CHECK constraint, index, grant, RLS policy and function.
- Enable RLS on every exposed table.
- Public SELECT policies only for published, non-voided public records and enabled roster/config fields.
- Restrict private player fields and admin operations to authenticated, authorized roles.
- Never trust user-editable JWT metadata for role checks.
- Verify no Kombat trigger references Billiards triggers, weekly_champions, wager settlement or Predictions.
- Run Supabase security advisors and read-only verification queries after migration.
- Keep rollback SQL and a tested backup/restore path.
