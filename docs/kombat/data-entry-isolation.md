# BASE25 PRO — Preventing cross-game data entry

## Non-negotiable rule
A match belongs to exactly one game. The application must never infer the game from a generic form, a selected player, or a previous screen. The route and game-specific form determine the destination.

## Game-specific write boundaries
- Billiards writes only through the existing Billiards match workflow and its Billiards tables.
- FIFA writes only through the existing FIFA workflow and `fc_*` tables.
- Kombat writes only through Kombat-specific routes, typed services, RPCs and `kombat_*` tables.
- Never create a shared `recordMatch()` function that accepts arbitrary game names and silently chooses a table.
- Do not add a generic `game` selector to the match-entry form. The selected game is fixed by the route.

## Admin UX safeguards
1. Every match-entry page has a persistent, unmistakable game heading and game-specific visual identity.
2. The route is game-specific: Billiards, FIFA and Kombat each have their own admin record route.
3. Each form has only fields valid for that game. For example, rack counts and balls remaining exist only in Billiards; fighter selection and game-by-game series scores exist only in Kombat; FIFA match fields remain in FIFA.
4. Before publish, show a review panel: game, both players, game-specific selections, format, result and destination table/RPC name.
5. Require a deliberate Publish action after the review panel. No cross-game fallback or automatic rerouting.
6. After save, show a receipt with the game name, match ID and a link to that game's match history.
7. If the route/game context is missing or mismatched, block submission. Never default to Billiards.

## Code architecture
- Keep separate modules: `lib/billiards/*`, `lib/fifa/*`, `lib/kombat/*`.
- Use separate typed payloads and separate service methods: `recordBilliardsMatch`, `recordFifaMatch`, `recordKombatMatch`.
- Kombat SQL/RPC names must start with `kombat_` or live in a dedicated private Kombat schema namespace.
- Never reuse the Billiards `matches` / `match_racks` RPCs for Kombat.
- Never update `players.elo_rating` or `players.highest_elo` from Kombat.
- Never call the Billiards Elo trigger/function from Kombat.
- FIFA and Billiards existing write paths remain unchanged.

## Testing gate before any match-entry release
- Submit one test match in each game and verify it lands only in the correct game tables.
- Verify Kombat match submission does not change Billiards player Elo, Billiards match count, FIFA match count or King's Pot ledgers.
- Verify Billiards match submission does not change Kombat or FIFA data.
- Verify FIFA match submission does not change Kombat or Billiards data.
- Test route mismatch, missing game context, invalid game-specific fields, duplicate submissions and failed writes.
- Run role tests: guest, player, attendant, manager and owner. Attendant must not record/edit/void Kombat matches.
