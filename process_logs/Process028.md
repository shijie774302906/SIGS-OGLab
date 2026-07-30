# Process028 - Web-P2 Slice 8 Full Workflow QA And Agent Rereview

Date: 2026-07-09

## Scope

Slice 8 closed the full Web-P2 workflow QA pass for the Yingkou CPTU sample:

`项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出`

This slice used only the web prototype workspace. It did not modify `D:\CPT-UIQA`, desktop `app_data`, SQLite schema, official formulas, persistence, or formal export behavior.

## Implementation Fixes From QA

- Fixed a sidebar context text clipping issue by allowing the current project/point label to wrap.
- Reworked the output page to avoid 1440px panel clipping.
- Added output package structure view and gate matrix so the 1920px output page reads as a real review work surface.
- Added route-level output bottom-panel gaps instead of duplicating selected item details.
- Moved stratification scheme switching into the main document and kept the right panel as an inspector.
- Added visible local-coverage wording for stratification samples.
- Changed output sample semantics to preview-only: `officialUseAllowed=false`, `exportAllowed=false`, `status=Preview`, preflight `NeedsConfirmation`.
- Tightened CPTU copy: import preview units in headers, SBTn label no longer claims log plotting.

## Verification

Commands:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Result:

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.

Playwright MCP evidence:

- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-initial-1440x900.png`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-stratification-interaction-1440x900.png`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1440x900.png`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1920x1080.png`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-browser-check.json`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-console-errors.md`
- `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-console-warnings.md`

Final browser-check summary:

- `forbiddenHits`: none.
- `overflowCount`: 0.
- Old activity bar/status bar absent.
- Full workflow route walkthrough completed.
- Output package map, gate matrix, route-level gaps, local stratification coverage, and inspector role checks passed.
- Console errors/warnings: 0.

## Agents

Reusable agents were run and then rerun after fixes:

- Visual Layout Taste Auditor
- Geotechnical Domain Reviewer
- Copy IA Mobbin Challenger

Review record:

- `docs/prototype/web-p2-slice8-agent-rereview-2026-07-09.md`

Final status:

- P0: none.
- P1: none.
- P2: recorded as future polish/backlog.

## Residual P2

- Improve SBTn schematic chart spacing and selected evidence emphasis.
- Reduce repeated project/point/read-only context in future chrome cleanup.
- Shorten output table notes if output item lists grow.
- Add richer output preview detail only when real output-preview content exists.

## Closure

Slice 8 is closed and verified. Proceed to Slice 9 completion audit.
