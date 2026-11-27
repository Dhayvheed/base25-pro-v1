# BASE25 PRO — Changelog and Work Status

This file tracks meaningful product changes and work in progress. Update it when a feature is completed, released, reverted, or materially changed.

## Current production baseline
- Canonical URL: https://base25-pro-v1.vercel.app/
- Verified production commit: 3930a629359e8ef687ce7ef3f73d0acd6a1835e7
- Verified production branch: weekly-boardman-rank-fix
- Verified deployment: dpl_EDUy5zdRibpwEUKJbAuTNqdXRq3w
- Status: READY
- Baseline verification date: 27 November 2026

## Known product areas to preserve
The following have been discussed or implemented in the product history. Always inspect the current production code before assuming any particular implementation detail:
- Player profiles and profile management.
- Match recording and match history.
- Player ratings and weekly leaderboards.
- Boardman ranking treatment.
- King's Pot and related competition/revenue features.
- Predictions and match recap information.
- Rivalries and competitive achievements.
- Game-specific competition modes.

## Work in progress
### MK11 character ratings
- Feature branch: feature/mk11-character-ratings
- Preview URL: https://base25-pro-v1-ytgkzamsb-senseis-projects-dc77a08a.vercel.app/kombat/characters
- Preview deployment ID: dpl_3nyoA9ZgZ16FES3SDXXrnBcd9UXR
- Last known state: READY
- Scope: character reference tiers and ratings page for Mortal Kombat 11.
- Not yet released to production.
- Not yet connected to a production match-recording/data model.
- Do not merge this branch blindly. Review its changes and port/rebuild the approved feature on top of the current verified production baseline if necessary.

## Release history notes
- Production commit 3930a629359e8ef687ce7ef3f73d0acd6a1835e7: "Start weekly ranks below Boardman" on branch weekly-boardman-rank-fix.
- Earlier homepage design baseline commit fb2bf06ce1e221ca94b4ccaf202182fee055d1b8: historical reference only; do not treat as current production unless Vercel confirms it.
- Older or failed deployments are historical and must not be used as a starting point without explicit review.

## Update format
For each change, record:
- Date
- Feature/change
- Branch and commit
- Preview URL and test status
- Production release status and deployment ID (if released)
- Any known limitations or follow-up work
