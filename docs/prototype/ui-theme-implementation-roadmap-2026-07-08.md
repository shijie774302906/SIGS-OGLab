# UI Theme Implementation Roadmap

Date: 2026-07-08

Goal: turn the chosen direction into an executable path for the web prototype.

Chosen direction:

```text
TDesign shell discipline + Ant/Pro component semantics + Carbon data density
```

Meaning:

- Use TDesign-like Chinese enterprise shell rhythm: clear sidebar, quiet top-level surfaces, practical spacing.
- Keep Ant Design Pro-like page semantics: analysis header, action toolbar, metadata bar, table/list/descriptions patterns.
- Borrow Carbon's data density and typographic seriousness for tables, numbers, evidence tracks, and inspection panels.
- Use Mobbin screens/flows as production evidence for dense table workspaces, issue-resolution flows, and report/export flows.

Mobbin reference analysis:

- `docs/prototype/mobbin-reference-analysis-2026-07-08.md`

Primary Mobbin patterns to apply later:

- Braintrust/Sentry/Cloudflare: table canvas + filters + issue rows + right inspector.
- HubSpot/Attio: data import mapping and issue-resolution stepper.
- Juicebox/Zoho: report list, export settings, and preview workflow.

## Non-Goals

- Do not migrate the prototype to a full TDesign, Ant Design Pro, Arco, Carbon, Umi, or Max app in this slice.
- Do not introduce new backend persistence, desktop repo coupling, SQLite changes, official formulas, or formal export behavior.
- Do not add decorative dashboards, marketing hero sections, gradients, or large KPI cards that do not answer engineering questions.
- Do not draw CPT/CPTU curves until real curve sample data exists.

## Phase 0 - Freeze The Visual Baseline

Purpose: make before/after comparison objective.

Files:

- `process_logs/playwright-mcp/theme-research/00-current-baseline.png`
- `docs/prototype/ui-theme-options-2026-07-08.md`
- `docs/prototype/ui-theme-implementation-roadmap-2026-07-08.md`

Actions:

- [x] Confirm this roadmap.
- [x] Keep current screenshot as the "before" baseline.
- [x] Keep current E2E as functional regression baseline.

Exit criteria:

- Direction is explicitly selected.
- No code change yet.

## Phase 1 - Token Refactor Only

Purpose: fix color and font without changing layout behavior.

Primary files:

- `src/styles.css`

Optional extraction if the file gets noisy:

- `src/theme.css`

Actions:

- [x] Replace current ad hoc root variables with named product tokens.
- [x] Keep one primary accent.
- [x] Separate brand/accent color from semantic status colors.
- [x] Tune neutral grays toward TDesign/Ant shell.
- [x] Tune data/table grays toward Carbon.
- [x] Define UI, data, and numeric font roles.
- [x] Apply `font-variant-numeric: tabular-nums` to tables, depth values, metrics, and logs.

Token target:

```css
:root {
  --font-ui: "Microsoft YaHei UI", "PingFang SC", "Segoe UI", Arial, sans-serif;
  --font-data: "Cascadia Mono", "SFMono-Regular", Consolas, monospace;

  --color-canvas: #f3f5f8;
  --color-surface: #ffffff;
  --color-surface-subtle: #f7f8fa;
  --color-border: #e7eaf0;
  --color-border-strong: #cfd5df;

  --color-text: #1f2329;
  --color-text-secondary: #646a73;
  --color-text-tertiary: #8a9099;

  --color-primary: #1764d9;
  --color-primary-soft: #e8f2ff;
  --color-primary-hover: #0f5ccc;

  --color-data-head: #f4f4f4;
  --color-data-border: #e0e0e0;
  --color-data-text: #161616;
  --color-data-muted: #525252;

  --color-success: #147d64;
  --color-warning: #a8660f;
  --color-danger: #b7352d;

  --soil-sand: #c8b96f;
  --soil-mixed: #9cab9b;
  --soil-clay: #9a8fa8;
}
```

Exit criteria:

- The interface no longer feels VS-like.
- Blue is calmer and consistently applied.
- Text contrast remains clear.
- `npm run build` passes.
- `npm run test:e2e` passes.
- Playwright MCP screenshot captured.

## Phase 2 - Typography And Density Pass

Purpose: make the UI feel intentionally engineered rather than default browser text.

Primary files:

- `src/styles.css`
- `src/App.tsx` only if display hierarchy requires class/name adjustments.

Actions:

- [x] Define a compact type scale:
  - page title: 20px / 28px / 700
  - section title: 14px / 22px / 650
  - table/body text: 13px / 20px / 400
  - labels/meta: 12px / 18px / 400-500
  - numeric/data text: 12-13px / tabular
- [x] Give data values a stronger rhythm than labels.
- [x] Reduce noisy bold text in side/right panels.
- [x] Make table row height consistently 32px or 34px.
- [x] Make toolbar/button height consistently 28px or 30px.
- [x] Keep text fitting in tabs, buttons, status pills, and property rows.

Exit criteria:

- The first viewport is easier to scan.
- Layer table, metric bar, and right property inspector have clear hierarchy.
- No text overlap in `1440x900` and `1920x1080`.

## Phase 3 - Shell Surface Pass

Purpose: apply TDesign-like shell discipline without adding decorative dashboard cards.

Primary files:

- `src/styles.css`
- `src/App.tsx` if minor class names are needed.

Actions:

- [ ] Make Explorer feel like a product resource pane, not a VS tree clone:
  - white or near-white background
  - clear selected state
  - quieter node icons
  - compact but readable row height
- [ ] Make editor canvas cool gray and panels white.
- [ ] Unify right panel and bottom panel borders with the new token system.
- [ ] Keep editor tabs but reduce their IDE feel:
  - cleaner selected state
  - no aggressive top stripe
  - subtle bottom/side borders
- [ ] Reframe the right panel toward the Braintrust-style object inspector:
  - current object metadata
  - raw/mapped or source state when available
  - preflight state
  - next action boundary
- [ ] Consider making bottom panel visually collapsible in a later interaction slice, but do not add behavior in this phase unless explicitly approved.

Exit criteria:

- Shell reads as an enterprise workbench, not a code editor.
- No black rail, no blue status bar, no top chrome.
- Main evidence area remains the primary visual object.

## Phase 4 - Evidence And Table Pass

Purpose: borrow Carbon data density for the domain-specific part.

Primary files:

- `src/styles.css`
- `src/App.tsx` if table/evidence class hooks need cleanup.

Actions:

- [ ] Rework table head, row hover, selected row, and status tags using data tokens.
- [ ] Make depth values, thickness values, and review depths use data/numeric font treatment.
- [ ] Reduce saturation of soil blocks so text and outlines feel more technical.
- [ ] Improve layer-track selection state with a clean focus/selection boundary.
- [ ] Make SBTn evidence scatter axes and grid feel like an instrument panel:
  - lighter grid
  - clearer axis labels
  - less decorative point shadow
- [ ] Keep disabled actions visibly disabled but not washed out to invisibility.
- [ ] Borrow Sentry/Cloudflare density for issue/check tables:
  - filter chips before table
  - compact toolbar
  - selected row state
  - issue severity shown with restrained semantic colors

Exit criteria:

- `地层分层` page feels like a professional analysis surface.
- Table and layer track are easier to scan than current version.
- No fake precision or unsupported CPT/CPTU curves introduced.

## Phase 5 - Optional Component Adoption Decision

Purpose: decide whether CSS-only is enough or a library is worth installing.

Decision gate:

Install a component package only if at least two of these become real needs:

- advanced table column settings
- stable filter forms
- editable rows
- pagination/virtualization
- drawer/modal workflows
- date/range pickers
- form validation
- tree/table hybrid UI

Recommended order:

1. `antd`
2. targeted `@ant-design/pro-components`
3. avoid installing TDesign/Carbon simultaneously unless we are replacing the component foundation

Why:

- Ant/Pro gives the shortest path to mature enterprise components.
- TDesign is a strong visual reference, but mixing TDesign and Ant components in the same page can create token drift.
- Carbon should guide data density and typography unless we decide to adopt Carbon wholesale later.

Exit criteria:

- Explicit decision recorded in `plan.md`.
- Dependency addition, if any, is tied to a real component need.

## Phase 6 - Verification And Closure

Required commands:

```powershell
& 'C:\Program Files\nodejs\npm.cmd' run build
& 'C:\Program Files\nodejs\npm.cmd' run test:e2e
```

Required MCP checks:

- Open `http://127.0.0.1:5173`.
- Capture `1440x900` and `1920x1080` screenshots.
- Select `自动分层候选 A`.
- Select layer `L2`.
- Switch bottom panel tabs.
- Check that no `Activity Bar`, `Status Bar`, or top chrome exists.
- Check console errors/warnings.
- Check forbidden terms:
  - `测试解译`
  - `runner`
  - `registry`
  - `stdout`
  - `stderr`

Evidence paths:

- `process_logs/playwright-mcp/theme-implementation/`
- `process_logs/Process013.md`

Exit criteria:

- Build passed.
- E2E passed.
- MCP screenshots captured.
- Console errors/warnings are 0.
- Current plan checklist checked.
- Process log updated.

## Proposed Execution Slice

Completed implementation slice:

```text
Phase 1 + Phase 2 only
```

Reason:

- The user's current pain is color and font.
- Token and typography changes carry the largest visual improvement with the least risk.
- It keeps us from accidentally redesigning workflow behavior before the visual foundation is approved.

After Phase 1 + Phase 2 screenshot review, continue to Phase 3 + Phase 4.
