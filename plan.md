# Active Plan

Date: 2026-08-02

Status: `Process144 in progress`

## Goal

Publish the current locally verified SIGS-OGLab release (closed Process126-143 work) to the connected private GitHub repository and Vercel production site without exposing private engineering data, API keys, transient evidence, or unrelated local files.

## Confirmed scope

- Audit the mixed worktree and define an explicit release file set.
- Exclude Yingkou/private source data, secrets, local environment files, generated browser artifacts, and transient screenshots.
- Re-run release-critical build, test tiers, security/release audit, and production smoke checks.
- Commit the verified release intentionally, push it to GitHub, and deploy the same commit to Vercel production.
- Verify `sigs-oglab.com` at desktop resolutions, including project onboarding, quick plot, professional workflow entry, visitor statistics, documentation link, and assistant capability endpoint.

## Non-goals

- Make the GitHub repository public.
- Publish Yingkou or other private source data.
- Add new product behavior or redesign existing pages.
- Change production secrets or DNS unless deployment verification proves it is necessary.

## Release coverage

| User action | Surface | Data/interface | Acceptance evidence |
| --- | --- | --- | --- |
| Open the public site | Project home | Vercel static deployment | HTTPS 200, no page/console errors |
| First desktop visit | Project onboarding | Browser-local completion record | Guide visible, skip/complete/replay work |
| Enter quick plot | Quick plot workspace | Generated demo/user-local input | Page scrolls and primary actions remain reachable |
| Enter professional workflow | Fixed project workflow | Browser-local project data | Navigation and first-step handoff work |
| View usage summary | Global feedback/statistics launcher | Anonymous analytics API | Failure-safe visible summary |
| Open user manual | Context help/docs link | `docs.sigs-oglab.com` | HTTPS link resolves |
| Open AI assistant | Assistant panels | Vercel assistant capability API | Capability endpoint responds without exposing a key |

## Release gates

- Known Problem Check/Gate passes for this exact plan.
- No tracked release file contains a real API key, `.env` value, private Yingkou source, or local Vercel credential.
- `npm.cmd run build`, domain-fast, ui-isolated, real-serial, assistant-server, and release audit pass.
- Curated 1440x900 and 1920x1080 production evidence is bound to the deployed commit.
- GitHub commit, Vercel deployment, and production site resolve to the same release.

## Todos

- [in_progress] Audit Git state, release scope, secrets, ignored/private data, GitHub/Vercel authentication, and remote divergence.
- [pending] Run the Known Problem Check and add matched checks to release acceptance.
- [pending] Run release-critical verification and correct release-only failures if found.
- [pending] Stage explicit release files, commit, push, and deploy the same revision.
- [pending] Run production smoke/desktop evidence checks and close Process144.
