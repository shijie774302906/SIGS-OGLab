# Process010 - Taste Skill UI Audit And Shell Simplification

Date: 2026-07-08

Status: `closed / verified`

## Trigger

User asked to use the current design taste skill to review the product UI, provide improvement advice, and remove:

- the left black rail
- the bottom blue status bar

## Skill Reading

Used `design-taste-frontend / taste-skill`.

Design read:

- This is an engineering analysis workbench for technical/B2B users.
- It is dense product UI, not a landing page, portfolio, marketing page, or hero composition.
- The skill explicitly says dashboards, data tables, and multi-step product UI should not directly use its landing-page patterns.
- Therefore this slice uses the skill's redesign audit, anti-template, color consistency, card restraint, and real-design-system guidance rather than its landing-page layout rules.

## UI Audit

Current strengths:

- The product workflow is clear and still follows `项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出`.
- `地层分层` is the default and the main evidence object is visible.
- The current scheme, candidate status, review depths, selected layer, and output blockers are readable.

Current visual debt:

- The black left rail and blue full-width status bar made the browser prototype feel like an IDE skin instead of a domain-specific workbench.
- The shell had too many chrome signals competing with the engineering evidence area.
- The bottom status line repeated low-value environment/status data that belongs in diagnostics, not in the primary viewport.

Direction:

- Keep Explorer, Editor Tabs, Right Panel, and Bottom Panel because they help real workflow navigation.
- Remove literal VSCode chrome that does not carry product value.
- Keep a restrained engineering palette: neutral canvas, one primary blue, semantic amber/green/error states, and muted soil colors.
- For future real component adoption, prefer Ant Design Pro / ProComponents, Carbon, or Fluent-style dense product components over landing-page templates.

## Deliverables

- Updated `plan.md`
  - Added the current `0.4` checklist.
  - Rewrote current workflow checks so Activity Bar and Status Bar are no longer required.
  - Added explicit checks that they must not appear.
- Updated `src/App.tsx`
  - Removed `ActivityBar` rendering and component.
  - Removed `StatusBar` rendering and component.
  - Removed unused activity/status imports and props.
- Updated `src/styles.css`
  - Changed the workbench shell from four columns plus status row to three columns and one row.
  - Moved Explorer to the left edge.
  - Removed activity bar and status bar styles.
  - Updated responsive grid columns.
- Updated `tests/e2e/workbench.spec.ts`
  - Added assertions that `activity-bar` and `status-bar` are absent.
  - Kept workflow navigation, scheme selection, layer selection, bottom panel switching, forbidden-term checks, and runtime error capture.

## Verification

PowerShell `npm.ps1` is blocked by execution policy in this environment, so verification used `npm.cmd`.

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run build
```

Result: passed.

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run test:e2e
```

Result: passed, 2 tests passed.

## MCP Browser QA

Tool: `mcp__playwright`

Viewport: `1920x1080`

Actions:

1. Opened `http://127.0.0.1:5173`.
2. Resized viewport to `1920x1080`.
3. Captured accessibility snapshot.
4. Selected `自动分层候选 A`.
5. Selected layer row `L2`.
6. Switched bottom tabs: `计算记录`, `成果预检`, `质量问题`.
7. Captured final screenshot.
8. Evaluated DOM and visible text for removed shell elements and forbidden terms.
9. Saved console warning/error log.

Results:

- `activityBarExists`: `false`
- `statusBarExists`: `false`
- `topChromeExists`: `false`
- `explorerLeftPx`: `0`
- `workbenchSize`: `1920 x 1080`
- `hasCandidate`: `true`
- `hasLayerDepth`: `true`
- `foundForbidden`: `[]`
- Console errors: `0`
- Console warnings: `0`

Evidence:

- Screenshot: `process_logs/playwright-mcp/web-p1-no-black-rail-no-status-final.png`
- Snapshot: `process_logs/playwright-mcp/web-p1-no-rail-status-snapshot.md`
- Evaluation: `process_logs/playwright-mcp/web-p1-no-black-rail-no-status-evaluate.json`
- Console log: `process_logs/playwright-mcp/web-p1-no-black-rail-no-status-console.log`

## Boundary Review

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- The prototype still uses copied sample data only.
- Save/adopt/official parameter actions remain disabled where behavior is not implemented.

## Residual Risk And Next Improvements

- The workbench is visually cleaner, but still uses hand-rolled CSS. If future work needs real dense tables, editable forms, column settings, or advanced filter panels, add `antd` first and then selectively add ProComponents.
- The evidence scatter is still a prototype visualization. Real CPT/CPTU curves should only be added after true sample curve data is available.
- The bottom panel is now neutral, but could later become collapsible so evidence review gets more vertical space.
- Future visual polish should extract reusable components: `WorkbenchShell`, `ExplorerTree`, `AnalysisHeader`, `MetaBar`, `SchemeList`, `EvidencePanel`, `LayerTable`, `PropertyInspector`, and `ToolPanel`.
