# Process017 - IA Copy And 1440 Layout Safety Refactor

Date: 2026-07-08

Status: `closed / verified / multi-agent re-reviewed`

## Scope

Implement the recommended slice from Process016:

- fix navigation hierarchy
- make the right panel engineering-semantic
- clean Chinese and prototype-boundary copy
- keep 1440x900 evidence and table visible
- run browser verification
- arrange multi-agent rereview

## Implementation

- Changed the global top nav into a scope/search/tool bar with dynamic workflow text.
- Kept the left sidebar as the single workflow navigator.
- Changed the second row from duplicated workflow tabs into a current-document context bar.
- Renamed right panel semantics from query-builder language to `方案检查`.
- Replaced risky copy around save/adopt/export/formal flow with prototype-safe wording.
- Made bottom panel content route-aware.
- Added SBTn zones, guide lines, selected-layer evidence highlighting, and legend.
- Reduced large-screen evidence-card stretch and removed right scheme-list clipping.
- Updated Playwright E2E to cover route-synced top nav, project next-step order, route-aware bottom panel, and forbidden boundary terms.

## Multi-Agent Rereview

Agents:

- Maxwell: layout consistency.
- Parfit: Mixpanel reference alignment.
- Rawls: Chinese UX copy and prototype boundary.
- Kepler: IA and workflow coherence.

Findings fixed in this slice:

- top nav route hard-code
- project page workflow skip
- bottom panel showing stratification state outside stratification
- right panel query-builder mismatch
- large-screen evidence-card empty stretch
- right scheme-list clipping
- formal-flow boundary wording
- `已采纳 / 当前采用` visible UI wording
- `JSON / dimensionless` visible implementation leakage

Review summary:

- No remaining P0 blockers after fixes.
- Residual P2: the UI remains a deliberate Mixpanel-inspired + workflow-rail hybrid; future screens need their own flow-specific layouts.

## Verification

- `npm run build`: passed.
- `npm run test:e2e`: passed.
- Playwright MCP browser walkthrough:
  - default 1440 screenshot: `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-1440x900.png`
  - interaction 1440 screenshot: `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1440x900.png`
  - interaction 1920 screenshot: `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1920x1080.png`
  - final browser check: `process_logs/playwright-mcp/ia-copy-layout-safety/final2-browser-check.json`
  - console errors: `process_logs/playwright-mcp/ia-copy-layout-safety/final2-console-errors.md`
  - console warnings: `process_logs/playwright-mcp/ia-copy-layout-safety/final2-console-warnings.md`

Final MCP checks:

- forbidden visible terms: none
- console warnings/errors: 0
- selected candidate and L2 state synced
- bottom output boundary visible
- table visible in viewport
- right scheme list not clipped
- 1920 evidence card no longer stretches into a large blank panel

## Boundary

- No files under `D:\CPT-UIQA` were modified.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export logic was touched.
- No new dependency was installed.
