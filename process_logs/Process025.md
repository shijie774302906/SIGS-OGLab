# Process025 - Web-P2 Slice 5 Stratification Deepening

Date: 2026-07-09

Status: `closed / verified`

## User Goal

推进 Web-P2 全流程开发。当前切片深化 `地层分层`，重点完成边界复核项选择、层位/边界联动、SBTn 示意刻度、右侧检查器同步和响应式验证。

## Scope

- Only modify `D:\CPT-UIQA-WebPrototype`.
- Continue using the Yingkou CPT09 stratification sample bundle.
- Keep SBTn as schematic evidence, not a formal production classifier.
- Do not implement official formula logic, persistence, or formal adoption/export.

## Completed

- Added selectable review-boundary chips in `StratificationDocument`.
- Added clickable boundary markers in `LayerTrack`.
- Added `selectedBoundary` plumbing from app state into document, right inspector, and bottom panel.
- Converted bottom review items into clickable controls.
- Added `current-boundary-panel` to the right inspector.
- Added lightweight SBTn schematic ticks (`Fr` and `Qtn` guide values).
- Updated `tests/e2e/workbench.spec.ts` to assert boundary selection and right-inspector synchronization.
- Fixed a Playwright MCP-discovered interaction bug:
  - Symptom: boundary chip selected visually, but right inspector stayed on the previous boundary.
  - Cause: `rightPanelContent` memo dependencies omitted `selectedBoundary`.
  - Fix: added `selectedBoundary` to the dependency list and tightened E2E assertions to target `current-boundary-panel`.
- Updated `plan.md`, `docs/prototype/web-p2-feature-development-plan-2026-07-09.md`, and `Process.md`.

## Verification

```powershell
npm.cmd run build
```

Result: passed.

```powershell
npm.cmd run test:e2e
```

Result: passed, 2 tests.

## Playwright MCP Evidence

- Screenshot 1440x900: `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-1440x900.png`
- Screenshot 1920x1080: `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-1920x1080.png`
- Browser check: `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-browser-check.json`
- Console errors: `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-console-errors.md`
- Console warnings: `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-console-warnings.md`

Browser-check summary:

- Boundary chips visible: yes.
- Boundary markers visible: yes.
- Selected boundary panel updated to `0.60 m / 0.50-0.70 m`: yes.
- SBTn schematic ticks visible: yes.
- Non-official SBTn copy visible: yes.
- Forbidden terms found: none.
- Text overflow findings: none.
- Console errors/warnings: 0.

## Boundary

- No files under `D:\CPT-UIQA` were modified.
- No desktop `app_data` was read or written.
- No SQLite schema or persistence behavior was touched.
- No official CPT/CPTU formula or production SBT/SBTn classifier was implemented.
- No formal adoption/export behavior was implemented.
- No new dependency was installed.

## Residual Risk

- SBTn ticks are schematic UI cues, not formal chart axes.
- Full visual/professional/IA reusable-agent review is deferred to Slice 8/9.

## Next

Start Slice 6: build `参数解译` using `sample_data/parameters/yingkou-cpt09-parameter-scheme-bundle.v1.json`, with scheme list, trial candidate table, applicability/preflight inspector, and bottom trial notes.
