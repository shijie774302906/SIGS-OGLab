# Process033 - AGENTS Context Cleanup

Date: 2026-07-09

Status: closed / documented

## Trigger

The workspace context was cleaned up so future work has a concise, stable rule file and a smaller active plan.

## Scope

- Rewrite `AGENTS.md` into a concise stable rule file.
- Correct the product goal from exploratory comparison to complete functional interpretation-tool design.
- Replace VSCode-like UI direction with Mobbin/Mixpanel as the primary visual target.
- Define always-active context, `plan.md`, `plan-total.md`, `memory.md`, `Process.md`, and `process_logs/`.
- Create lightweight `plan-total.md` and `memory.md` starter files.

## Result

- `AGENTS.md` was rewritten as a concise stable rule file.
- Product goal was corrected to a complete functional browser-based interpretation tool.
- Mobbin/Mixpanel became the primary UI target.
- Local desktop screenshots were demoted to workflow/domain references.
- `plan.md` was reset to the current active slice only.
- `plan-total.md` was added for the long-term product framework.
- `memory.md` was added for recurring lessons.

## Verification

- Files were read back with explicit UTF-8 handling.
- No build was run because this was documentation-only.

## Boundary

- No UI implementation files changed in this cleanup slice.
- No desktop repo files changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior touched.
