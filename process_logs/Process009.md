# Process009 - Mature Workbench Visual Refactor

Date: 2026-07-08

Status: `closed / verified`

## Trigger

User approved the proposed direction:

- Use a mature workbench pattern.
- Improve the current color, layout, visual hierarchy, and overall taste.
- Record the planned edits in `plan.md` and check items off as they are completed.

## Reference

- Ant Design Pro / ProComponents workbench semantics:
  - side layout
  - PageContainer-like header
  - ProTable-like table density
  - ProDescriptions-like property inspector
  - compact enterprise toolbar and metadata rows

Implementation note:

- The prototype did not migrate to a full Umi/Max Ant Design Pro template.
- The refactor applies the mature workbench structure and component semantics inside the current Vite + React prototype.

## Design Plan

- Color:
  - engineering gray `#F5F7FA`
  - ink `#111827`
  - single primary blue `#1E5AA8`
  - review amber `#A8660F`
  - pass green `#147D64`
- Type:
  - system UI font for interface text
  - tabular numeric rendering for depth and table values
- Layout:
  - merge header, metrics, and filter summary into a compact workbench header and metadata bar
  - make layer track, SBTn evidence, and layer table the main visual object
  - make the right panel a property inspector instead of stacked cards
  - reduce bottom panel visual weight

## Deliverables

- Updated `plan.md`
  - Added the current checklist and checked completed items progressively.
- Updated `src/App.tsx`
  - Replaced the three-layer `PageHeader + Statistic cards + QueryBar` with a compact analysis header and metadata bar.
  - Replaced `SummaryTile` with `MetricInline`.
- Updated `src/styles.css`
  - Unified color tokens around one primary blue and muted engineering neutrals.
  - Added muted soil colors.
  - Reduced card stacking, radius, and visual noise.
  - Reworked scheme list into a flat list.
  - Reworked evidence panel into a continuous analysis surface.
  - Reworked right panel into a property inspector.
  - Reduced bottom panel height and weight.
  - Fixed CSS Grid stretching that made the header and metadata bar too tall.

## Verification

```powershell
npm run build
```

Result: passed.

```powershell
npm run test:e2e
```

Result: passed, 2 tests passed.

## MCP Browser QA

Tool: `mcp__playwright`

Viewport: `1920x1080`

Actions:

1. Opened `http://127.0.0.1:5173`.
2. Selected `自动分层候选 A`.
3. Selected layer row `L2`.
4. Captured final screenshot.
5. Checked old top chrome absence.
6. Checked visible text for forbidden/internal terms.
7. Checked console errors.

Results:

- `foundForbidden`: `[]`
- `hasCandidate`: `true`
- `hasDepth`: `true`
- `topChromeExists`: `false`
- `hostScrollTop`: `0`
- Console errors: `0`

Evidence:

- Screenshot: `process_logs/playwright-mcp/web-p1-mature-workbench-refactor-final.png`
- Console log: `process_logs/playwright-mcp/web-p1-mature-workbench-console.log`

## Boundary Review

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- The prototype still uses copied sample data only.
- Save/adopt/official parameter actions remain disabled where behavior is not implemented.

## Residual Risk

- The UI now follows a browser-native engineering workbench direction, not a literal VSCode clone.
- Real Ant Design Pro components are not installed yet; if Web-P2 needs real column settings, pagination, editable rows, forms, or tree tables, consider adding `antd` first and then targeted ProComponents adapters.

