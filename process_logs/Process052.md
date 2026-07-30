# Process052 - Governance And Single Source Of Truth

Date: 2026-07-10

Status: `closed / documented / verified`

## Theme

Reduce active-context and communication overhead by giving each planning and process document one explicit responsibility.

## User Problem

The product prototype had substantial functionality and evidence, but current state, long-term direction, recurring lessons, and 51 historical closure entries were increasingly expensive to reconcile. The active plan also still described a closed slice.

## Scope

- Preserve the full previous Process index.
- Slim `AGENTS.md` to stable rules and entry points.
- Upgrade `plan-total.md` into the product maturity and roadmap source of truth.
- Rewrite `plan.md` for the current governance slice.
- Deduplicate `memory.md`.
- Add reusable feature-slice and evidence-policy documents.
- Replace `Process.md` with a lightweight current/recent index.
- Verify documents and current app baseline without changing user-facing behavior.

## Result

- Archived the previous Process001-051 index as `process_logs/Process-index-archive-001-051.md` with a matching SHA-256 hash.
- Reduced `AGENTS.md` to six stable sections and added confirmation-validity guidance so one confirmed slice does not require repeated subtask approvals.
- Added five-zone/six-page maturity, handoff, milestone, and open-decision tables to `plan-total.md`.
- Restored `plan.md` as current-slice-only.
- Reduced `memory.md` to recurring mistakes and durable user preferences.
- Added `docs/process/feature-slice-template.md`.
- Added `docs/process/evidence-policy.md`.
- Replaced the long `Process.md` with current, recent, product-status, and history pointers.

## Verification

- UTF-8 and internal-reference audit passed.
- All expected context, template, archive, and recent Process references exist.
- Previous Process index archive SHA-256: `EF983D6824DBA70009F731A9B6C7B6AF51929ABEAA4F6E877A3652E593960B50`.
- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 6 tests.

## Boundary

- No `src/`, CSS, parser, app state, or Playwright behavior was changed.
- No existing evidence or generated input file was deleted.
- No desktop repo, `app_data`, SQLite, official formula, persistence, or export behavior was touched.

## Next

After closure, begin M1 engineering structure as a separate confirmed slice before changing the data-check page hierarchy.
