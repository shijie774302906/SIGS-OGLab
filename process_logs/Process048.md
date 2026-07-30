# Process048 - Data Check Quality Gate And Problem Handling

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Turn `数据检查` into a quality gate and problem-handling workbench before `地层分层`.

## Scope

- Add the active data-check event contract.
- Update `plan.md` for the current slice.
- Add explicit check states: `未检查`, `无问题`, `仅提示`, `存在问题`, `需重新检查`.
- Bind check conclusions to the import draft version.
- Add check filters, check scope, evidence rows, check history, and rerun actions.
- Keep the right side as page-specific functional dock controls.
- Verify with a human-like Playwright flow using random case data.

## Result

- Added `docs/prototype/数据检查事件合同.md`.
- Rewrote `plan.md` and closed it after verification.
- Added per-project check run history and selected check filter state.
- Added a `未检查` quality-gate state when entering `数据检查` before running a check.
- Added center-page filter buttons for `全部 / 存在问题 / 仅提示 / 通过`.
- Added right-dock filter controls, check scope, rerun action, and continuation gate.
- Added evidence rows for the selected check issue.
- Added check history records and rerun history append behavior.
- Fixed empty-filter behavior so hidden old check details are not shown.
- Updated E2E expectations so `仅提示` is distinct from `无问题`.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 6 tests.

## Evidence

- `process_logs/playwright-mcp/data-check-quality-gate/flow-run.json`
- `process_logs/playwright-mcp/data-check-quality-gate/check-not-run-1440x900.png`
- `process_logs/playwright-mcp/data-check-quality-gate/check-notice-evidence-1440x900.png`
- `process_logs/playwright-mcp/data-check-quality-gate/check-rerun-history-1440x900.png`
- `process_logs/playwright-mcp/flow-1-import-stale-check/flow-run.json`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-run.json`

## Dev Server

- `http://127.0.0.1:5174/`
- Port `5173` was already occupied, so the slice server was started on `5174`.

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Check history is browser prototype state only.
- Current quality checks are prototype logic, not production engineering judgment.

## Next

- Add a true check-stage `存在问题` sample that is not already blocked by the import page.
- Or move to `地层分层` and create the same action-event contract for layer scheme review, boundary editing, evidence linking, and gate to `参数解译`.
