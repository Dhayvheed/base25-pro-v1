# BASE25 PRO — Development Rules

These rules apply in every conversation and to every code change.

## 1. Establish the real baseline first
- Canonical production URL: https://base25-pro-v1.vercel.app/
- Repository: Dhayvheed/base25-pro-v1
- Verify the deployment currently attached to the canonical production alias using Vercel.
- Use the production deployment's exact Git commit SHA as the baseline.
- Never assume `main`, the latest commit, or an old feature branch is the live version.
- If the production commit differs from BASE25_SOURCE_OF_TRUTH.md, update the baseline record before coding.

## 2. Branch discipline
- Create a fresh, clearly named feature branch from the verified production SHA.
- Do not build a new feature on an old branch unless its changes have been reviewed and deliberately carried forward.
- Do not merge unrelated or unfinished work silently.
- Keep each feature focused and its commits understandable.

## 3. Protect the existing product
- Treat the current production homepage and design system as protected.
- Do not replace the homepage or global layout to add a feature.
- Do not reintroduce older UI components or styling from historical commits.
- Reuse current navigation, components, design tokens, and responsive patterns where appropriate.
- Do not make database/schema changes without first explaining the data model and obtaining approval.
- Do not delete, reset, overwrite, or migrate production data without explicit approval.

## 4. Preview and verification
- Deploy feature work to Preview only.
- Confirm the deployment reaches READY and inspect build logs for errors.
- Test the new feature and relevant existing flows.
- Compare the preview homepage directly against the canonical production homepage.
- Check mobile layout as well as desktop.
- A successful build is not sufficient; verify behavior and visual consistency.

## 5. Production release
- Never deploy to Production, promote a preview, merge into the production branch, or change production aliases without the user's explicit approval for that release.
- Before release, state the exact branch, commit, preview URL, changes, and checks performed.
- After approval and deployment, verify the canonical production URL and update BASE25_SOURCE_OF_TRUTH.md and BASE25_CHANGELOG.md.

## 6. New-chat startup protocol
At the start of every new BASE25 PRO coding conversation:
1. Read these three repository documents: BASE25_SOURCE_OF_TRUTH.md, BASE25_DEVELOPMENT_RULES.md, BASE25_CHANGELOG.md.
2. Verify the canonical production alias and current production commit in Vercel.
3. Summarize the verified baseline briefly to the user.
4. Ask for clarification only if the requested change conflicts with an existing product decision or the current code is ambiguous.
5. Do not start editing until the baseline has been verified.

## 7. If context is missing
Stop and inspect the repository and deployment history. Never guess which version is current. Never use a remembered preview URL as the production baseline.
