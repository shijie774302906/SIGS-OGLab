# Process037 - Blue Purple Role Swap

Date: 2026-07-09

Status: closed / verified

## Trigger

User asked to swap the current color roles:

- Main blue becomes purple.
- Purple becomes blue.
- Brown becomes light red.
- Brown is temporarily unused.

## Boundary

- Web prototype only.
- No desktop repo files changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior touched.
- No new dependency or component library added.
- No layout, workflow, data model, or copy rewrite.

## Files Changed

- `src/styles.css`
- `plan.md`
- `Process.md`
- `process_logs/Process037.md`

## Implementation Summary

- Preserved the source palette:
  - `#35b0f5`
  - `#2abf9a`
  - `#beae58`
  - `#fe92a1`
  - `#bdadff`
- Remapped visible roles:
  - primary/action/focus/chart emphasis: `#bdadff`
  - selected/secondary emphasis: `#35b0f5`
  - review/warning/sand and blocked attention: `#fe92a1`
  - success/mixed-soil: `#2abf9a`
- Kept `#beae58` only as the palette token `--palette-olive`; it is not used by visible semantic roles.
- Updated derived purple text/ink and hover shades so filled purple controls remain readable.
- Updated chart guide lines, selected layer outlines, status dots, warning notices, boundary markers, sand zone, and sand layer fill to follow the new mapping.

## Checklist Result

- Primary/action/focus tokens use purple: passed.
- Selected/secondary emphasis tokens use blue: passed.
- Warning/review/sand roles use light red: passed.
- Brown/olive is not used by visible semantic roles: passed.
- Existing workbench layout remains unchanged: passed.
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
- Browser token checks:
  - `colorPrimary=#bdadff`
  - `colorSelectedAccent=#35b0f5`
  - `colorWarningAccent=#fe92a1`
  - `soilSand=#fe92a1`
  - `soilClay=#35b0f5`
  - `oliveNotSemantic=true`

Evidence:

- `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-1440x900.png`
- `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-1920x1080.png`
- `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-interaction-1440x900.png`
- `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-browser-check.json`

## Visual Notes

- The main workbench action color now reads purple, including the left create button, focus/fill accents, and chart-linked evidence emphasis.
- Selection now reads blue, including the active sidebar item and selected table row surfaces.
- Review and sand cues now read light red rather than brown/olive, which makes the temporary removal of brown explicit.
- The workbench shell, density, and product flow are unchanged.

## Residual Risk

- Warning and danger now intentionally share the light-red family. If future review states need stronger semantic separation, use tone, shape, copy, or a darker derived red text shade before reintroducing brown.
