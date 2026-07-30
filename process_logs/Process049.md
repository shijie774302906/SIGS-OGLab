# Process049 - Project Page First Look Hierarchy

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Reduce first-page cognitive load by adding a clear first visual anchor to `项目/点位数据`.

## User Problem

The first page had enough functions, but the interaction feeling was poor: too much information appeared at the same level, and users could not immediately tell where to begin.

## Scope

- Add a first-look task band to the project page.
- Keep only one strongest primary action on the page.
- Add a compact workflow strip to show the immediate order.
- Demote metrics and point tables into secondary/detail layers.
- Support both ready-data and empty-project states.

## Result

- Added `project-first-look`.
- Added `project-first-flow`.
- Removed the duplicate header `核对导入` primary button.
- Empty projects now show `暂无数据` and `导入 CPT/CPTU 数据`.
- Ready demo/random projects show `待核对导入` and `核对导入`.
- Added responsive behavior for the first-look band and flow strip.
- Updated Playwright to assert the first-look hierarchy and empty-project state.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 6 tests.
- Browser screenshot check passed.
- Console errors: `0`.
- Page errors: `0`.

## Evidence

- `process_logs/playwright-mcp/project-first-look-hierarchy/project-first-look-ready-1440x900.png`
- `process_logs/playwright-mcp/project-first-look-hierarchy/project-first-look-empty-1440x900.png`
- `process_logs/playwright-mcp/project-first-look-hierarchy/browser-check.json`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-project-1440x900.png`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No data import or data check behavior was changed.

## Next

Review whether this `First Look` rule should become a shared hierarchy pattern for `数据导入` and `数据检查`.
