# Process050 - Right Inspector Collapse And Data Import Hierarchy Plan

Date: 2026-07-10

Status: `closed / implemented / verified / next plan documented`

## Theme

Clean up the first-page interaction shell and prepare the second-page `数据导入` hierarchy plan.

## Scope

- Make the right inspector default open but collapsible.
- Keep a narrow reopen control when collapsed.
- Remove the visible top Flow banner from the visual hierarchy.
- Keep Flow banner data in the DOM as hidden test/data anchor.
- Write the next active plan for `数据导入` First Look hierarchy.

## Result

- Added global right-inspector state in `ProjectWorkspaceApp`.
- Added `隐藏` and `检查器` reopen controls.
- Added collapsed right-panel grid width.
- Hid `FlowCaseBanner` visually while preserving its text for seed/case/test extraction.
- Updated Playwright to verify inspector collapse/reopen.
- Updated tests to read hidden Flow metadata via `textContent`.
- Rewrote `plan.md` as the planned second-page `数据导入页 First Look 信息层级` slice.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 6 tests.
- Browser check passed:
  - Flow banner visible: `false`.
  - Inspector states: `open -> collapsed -> open`.
  - Console errors: `0`.
  - Page errors: `0`.

## Evidence

- `process_logs/playwright-mcp/right-inspector-flow-cleanup/browser-check.json`
- `process_logs/playwright-mcp/right-inspector-flow-cleanup/right-inspector-open-1440x900.png`
- `process_logs/playwright-mcp/right-inspector-flow-cleanup/right-inspector-collapsed-1440x900.png`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No `数据导入` behavior was implemented in this slice; only its hierarchy plan was written.

## Next

Implement the planned `数据导入` First Look hierarchy from `plan.md`.
