# Process008 - Remove Top Chrome And Flatten Layout

Date: 2026-07-08

Status: `closed / verified`

## Trigger

User feedback:

- The top menu/command chrome is undesirable and should be removed.
- The layout still feels visually poor and too template-like.

## Scope

- Remove the global top chrome from the web prototype.
- Keep the core workbench navigation: Activity Bar, Explorer, Editor Tabs, Right Panel, Bottom Panel, Status Bar.
- Flatten the central content treatment:
  - reduce floating-card feel,
  - remove strong orange outlines,
  - reduce border radius,
  - remove visible design-system jargon from app copy,
  - keep engineering evidence and tables as the dominant objects.

## Deliverables

- Updated `src/App.tsx`
  - Removed `TopChrome` rendering and unused menu/search imports.
  - Removed user-visible design jargon such as `ProList 样式`.
- Updated `src/styles.css`
  - Changed the root grid from three rows to two rows.
  - Moved Activity Bar, Explorer, Editor, and Right Panel into the first row.
  - Status Bar remains the bottom row.
  - Flattened page header, metric tiles, query bar, scheme list, panels, and right-side property cards.
  - Reduced radius and visual noise across the workbench content.

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
2. Confirmed the old menu/title top chrome is absent.
3. Selected `自动分层候选 A`.
4. Selected layer row `L2`.
5. Captured screenshot.
6. Checked visible text for forbidden/internal terms.
7. Checked console errors.

Results:

- `topChromeExists`: `false`
- `hasOldTopMenu`: `false`
- `foundForbidden`: `[]`
- `hostScrollTop`: `0`
- Console errors: `0`

Evidence:

- Screenshot: `process_logs/playwright-mcp/web-p1-no-top-chrome-refactor-final.png`
- Console log: `process_logs/playwright-mcp/web-p1-no-top-chrome-console.log`

## Boundary Review

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- The prototype still uses copied sample data only.
- Save/adopt/official parameter actions remain disabled where behavior is not implemented.

## Residual Risk

- This intentionally deviates from the earlier UX-V5 contract that required a VSCode-like top chrome.
- The current direction is now a browser-native workbench with VSCode-like side navigation and editor tabs, not a literal VSCode chrome replica.

