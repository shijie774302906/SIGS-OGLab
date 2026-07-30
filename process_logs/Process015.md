# Process015 - Mixpanel Global Top Navigation

Date: 2026-07-08

Status: `closed / verified`

## Trigger

The user pointed out that the top of the prototype should also follow Mixpanel: it should have a product-level navigation bar instead of starting immediately with the workflow tabs.

## Design Plan

- Color: use Mixpanel purple `#5B43E6` for the global top bar.
- Type: compact 12px navigation and search text, with short project context on the right.
- Layout: add a first-row global top navigation; shift Explorer, Editor, and Query panel to the second row; keep workflow tabs as the second navigation layer.

## Implementation

Files changed:

- `src/App.tsx`
- `src/styles.css`
- `plan.md`
- `Process.md`
- `process_logs/Process015.md`

Main changes:

- Added `GlobalTopNav`.
- Added top-level product columns: `Boards`, `Reports`, `Data`, `Points`, `Outputs`.
- Added centered search/command field.
- Added right project context and lightweight utility icons.
- Changed `.workbench` from a one-row grid to a two-row grid.
- Moved Explorer, Editor, and Right Query panel to grid row 2.

## Verification

Commands:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run test:e2e
```

Results:

- `npm run build`: passed.
- `npm run test:e2e`: passed, 2 tests.

Playwright MCP:

- Opened `http://127.0.0.1:5173/`.
- Captured `1440x900` screenshot.
- Confirmed global top nav exists.
- Selected `自动分层候选 A`.
- Selected layer `L2`.
- Switched bottom panel to `成果预检`.
- Captured interaction screenshot at `1440x900`.
- Captured `1920x1080` screenshot.
- Checked forbidden terms: none found.
- Checked `.top-chrome`, `.activity-bar`, `.status-bar`: not present.
- Console warnings/errors: 0 warnings, 0 errors.

Evidence:

- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-interaction-1440x900.png`
- `process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1920x1080.png`
- `process_logs/playwright-mcp/mixpanel-top-nav/snapshot-1440x900.md`
- `process_logs/playwright-mcp/mixpanel-top-nav/snapshot-1920x1080.md`
- `process_logs/playwright-mcp/mixpanel-top-nav/console-warnings.md`
- `process_logs/playwright-mcp/mixpanel-top-nav/console-errors.md`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formulas, persistence, or export behavior was touched.
- No new dependency was installed.
- The new top bar is product navigation, not the previously rejected VS-like top chrome.

## Next

If continuing the Mixpanel direction, the next useful pass is to make the top product columns route or filter real workbench views instead of being visual placeholders.
