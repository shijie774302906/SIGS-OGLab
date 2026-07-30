# Process034 - Strict Mixpanel Shell Refactor

Date: 2026-07-09

Status: closed / verified

## Trigger

User approved moving from the strict Mixpanel audit into detailed implementation, with every item checked after modification.

## Boundary

- Web prototype only.
- No desktop repo files changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior touched.
- No new dependency or component library added.
- `+ 新建分析` remains a prototype workbench action and does not imply formal persisted project creation.

## Files Changed

- `src/App.tsx`
- `src/styles.css`
- `tests/e2e/workbench.spec.ts`
- `plan.md`
- `Process.md`
- `process_logs/Process034.md`

## Implementation Summary

- Removed default rendering of the full-width global top nav.
- Removed default rendering of the editor tab strip.
- Removed default rendering of the persistent bottom panel.
- Changed root shell to a three-pane layout:
  - full-height sidebar
  - center report canvas
  - right query/inspection panel
- Added sidebar `+ 新建分析`.
- Added sidebar search and grouped navigation:
  - `Data`
  - `Analysis`
  - `Output`
- Replaced long nav status text with subtle dot indicators.
- Added right panel tabs:
  - `检查`
  - `图表`
  - `注释`
- Recalibrated tokens:
  - app frame `#F7F7F8`
  - canvas `#FFFFFF`
  - subtle surface `#FAFAFB`
  - border `#E8E8EC`
  - selected state `#F3F0FF`
  - primary purple `#5B43E6`
- Updated E2E expectations so the new shell contract is enforced.

## Checklist Result

- Root grid is sidebar / center canvas / right panel: passed.
- Sidebar starts at top of window: passed.
- No `global-top-nav`: passed.
- No `editor-tabs`: passed.
- No persistent `bottom-panel`: passed.
- Sidebar has `+ 新建分析`: passed.
- Sidebar nav is grouped as `Data`, `Analysis`, and `Output`: passed.
- Right panel has `检查 / 图表 / 注释`: passed.
- Center header has a primary action: passed.
- Selected token uses purple-soft: passed.
- Business workflow labels remain present: passed.
- Browser overflow count is `0`: passed.
- Browser console/page errors are `0`: passed.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Browser checklist passed:
  - `allPassed=true`
  - `overflowCount=0`
  - `consoleErrors=0`
  - `pageErrors=0`

Evidence:

- `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-1920x1080.png`
- `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-interaction-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-browser-check.json`

## Visual Notes

- The first viewport now reads much closer to a Mixpanel-like report builder: product sidebar, report canvas, and right-side query/inspection panel.
- The center canvas keeps geotechnical evidence semantics rather than becoming a generic product analytics chart.
- A layout bug where the stratification metric row stretched too tall at 1920px was fixed by changing analysis pages to auto grid rows.

## Residual Risk

- This slice focuses on the shell and token system. Further polish can still improve chart/table grammar, especially reducing visual competition between soil-color data fills and UI selection states.
- The right panel tabs are structural and visual; only `检查` content is currently populated.
