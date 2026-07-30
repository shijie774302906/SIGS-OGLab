# Process036 - Palette Alignment Refresh

Date: 2026-07-09

Status: closed / verified

## Trigger

User asked to correct the current UI color situation using the agreed future palette:

```text
#35b0f5
#2abf9a
#beae58
#fe92a1
#bdadff
```

## Boundary

- Web prototype only.
- No desktop repo files changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior touched.
- No new dependency or component library added.
- No layout redesign, workflow change, data model change, or copy rewrite.

## Files Changed

- `src/styles.css`
- `plan.md`
- `Process.md`
- `process_logs/Process036.md`

## Implementation Summary

- Added named palette tokens:
  - `--palette-blue: #35b0f5`
  - `--palette-teal: #2abf9a`
  - `--palette-olive: #beae58`
  - `--palette-rose: #fe92a1`
  - `--palette-lavender: #bdadff`
- Remapped semantic UI roles:
  - primary/action/data accent: blue
  - success/valid: teal
  - review/warning/sand cue: olive
  - blocked/danger: rose
  - selected/secondary emphasis: lavender
- Kept a light Mixpanel-like neutral surface system, but shifted borders, hover states, and data heads toward the new palette.
- Replaced old purple accent leftovers in chart grids, selected rows, selected layer outlines, scheme rows, status dots, notices, and output package cards.
- Added accessible derived text/ink shades for small labels and filled blue buttons so the bright palette remains readable.
- Adjusted boundary markers and scatter x-axis labels to remove internal chart overflow while keeping the same workbench layout.

## Checklist Result

- Root tokens use the agreed palette: passed.
- Primary buttons, focus, selected nav, selected rows, and linked chart evidence use the new palette: passed.
- Success, warning, danger, and muted status pills are visually distinct and readable: passed.
- Soil/layer colors use the new palette without destroying legibility: passed.
- Direct old purple accent values are removed from visible chart/grid/selection styling: passed.
- Browser checklist passes: passed.
- Browser overflow count is `0`: passed.
- Browser console/page errors are `0`: passed.
- `npm.cmd run build` passes: passed.
- `npm.cmd run test:e2e` passes: passed.
- Screenshots captured at `1440x900`, `1920x1080`, and interaction state: passed.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Browser checklist passed:
  - `allPassed=true`
  - `overflowCount=0`
  - `consoleErrorCount=0`
  - `pageErrorCount=0`
  - `oldAccentHits=[]`

Evidence:

- `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-1440x900.png`
- `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-1920x1080.png`
- `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-interaction-1440x900.png`
- `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-browser-check.json`

## Visual Notes

- The app now uses the user-approved palette as the primary color system rather than the previous Mixpanel-purple token set.
- Main action remains bright and recognizable, while selected states move to lavender so selection does not compete with primary actions.
- Geological evidence colors now align with the palette: mixed soil uses teal, sand uses olive, and selected layer emphasis uses lavender.
- Warning surfaces and output readiness states use olive/rose accents while keeping darker derived text for contrast.

## Residual Risk

- This slice intentionally avoids deeper component layout changes. Future polish can still tune the density and chart grammar, but should keep these palette roles stable.
