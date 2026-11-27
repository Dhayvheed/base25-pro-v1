# BASE25 PRO — Source of Truth

Last verified: 27 November 2026

## Official production
- Canonical live URL: https://base25-pro-v1.vercel.app/
- Vercel project: base25-pro-v1
- GitHub repository: Dhayvheed/base25-pro-v1
- Supabase project ref: alqfeigvhrcufgcqcucx

## Production baseline (verified)
- Production deployment ID: dpl_EDUy5zdRibpwEUKJbAuTNqdXRq3w
- Production branch: weekly-boardman-rank-fix
- Production commit: 3930a629359e8ef687ce7ef3f73d0acd6a1835e7
- Deployment state: READY
- Deployment alias includes the canonical production URL above.

This commit is the verified baseline at the time this document was created. It is not a permanent claim that production will never change. Before every task, query Vercel for the deployment currently serving the canonical production alias and update this record if it has changed.

## Non-negotiable product rule
The live BASE25 PRO website is the source of truth for both functionality and visual design. New work must extend the currently live product. Do not restore, copy, or use an older homepage, layout, branch, or deployment just because it exists in Git history.

## Before changing code
1. Read this file and BASE25_DEVELOPMENT_RULES.md.
2. Check the current production deployment behind https://base25-pro-v1.vercel.app/ in Vercel.
3. Record its exact commit SHA and branch. Do not assume `main`, a previous feature branch, or the newest Git commit is production.
4. Inspect the relevant production-baseline files before editing.
5. Start a new feature branch from the exact production commit unless the user explicitly approves a different integration base.
6. Preserve existing routes, homepage layout, styling, navigation, data, and working features unless the user explicitly requests a change.

## Known project decisions
- BASE25 PRO is the competitive gaming platform for Base25.
- Snooker and other game modes must keep their ratings and records separate.
- Mortal Kombat work is for MK11 and must be integrated into this same product, not spun into a separate app.
- Preview deployments are for review only. Production changes require explicit user approval.
- The canonical production URL above must remain the primary URL.

## Important caution
A preview being READY only means it built and deployed. It does not prove the existing site was preserved. Compare the preview with the current production site, including the homepage and affected flows, before asking for approval.
