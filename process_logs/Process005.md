# Process005 - Web-P1 Workbench Prototype Implementation

Date: 2026-07-08

## Intent

Implement `Web-P1：可操作 VSCode-like 工作台原型` and close it with build verification, Playwright MCP exploratory browser QA, and repeatable Playwright E2E regression.

## Confirmed Requirement

- Goal: build an isolated browser prototype with a usable VSCode-like engineering workbench as the first screen.
- Scope: Vite + React + TypeScript scaffold, workbench shell, six main workflow nodes, route/tab/status synchronization, right/bottom panels, default `地层分层` document from sample JSON, MCP browser walkthrough, and Playwright regression.
- Non-goals: no desktop repo edits, no desktop `app_data` access, no SQLite schema changes, no official algorithm/formula implementation, no official persistence, and no PDF/DXF/export commitment.
- Acceptance criteria: local browser opens the workbench; default document is `地层分层`; six Explorer workflow nodes are clickable; Explorer/Tab/Right Panel/Status Bar sync; stratification page displays real sample schemes/layers/review information; `npm run build` passes; Playwright MCP walkthrough completes; `npm run test:e2e` passes.
- Verification: `npm run build`, MCP walkthrough, screenshots, `npm run test:e2e`.
- Closure review: this process log plus `Process.md`.
- Stop conditions: none triggered.

Implementation may start: completed.

## Files Added

- `index.html`
- `vite.config.ts`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `src/main.tsx`
- `src/App.tsx`
- `src/styles.css`
- `src/vite-env.d.ts`
- `tests/e2e/workbench.spec.ts`

## Files Updated

- `package.json`
- `package-lock.json`
- `playwright.config.ts`
- `.gitignore`
- `Process.md`

## Implementation Summary

- Added Vite + React + TypeScript scripts: `dev`, `build`, `preview`.
- Implemented a VSCode-like shell:
  - Top Chrome
  - Activity Bar
  - Explorer
  - Editor Tabs
  - Document Host
  - Right Side Panel
  - Bottom Panel
  - Status Bar
- Implemented six workflow documents:
  - `项目/点位数据`
  - `数据导入`
  - `数据检查`
  - `地层分层`
  - `参数解译`
  - `成果输出`
- Default route is `地层分层`.
- Stratification page reads:
  - `sample_data/stratification/yingkou-cpt09-layer-scheme-bundle.v1.json`
- Stratification page displays:
  - scheme list
  - status/preflight summary
  - layer track
  - SBTn evidence panel
  - layer table
  - selected scheme/layer detail
  - bottom quality/log/output tabs
- No unsupported CPT/CPTU qc/fs/u2 curves were drawn.
- Projection-only limitations are shown as `只读投影`.
- Official save/adoption/export actions are disabled or presented as unavailable.

## MCP Browser QA

Local server:

```text
http://127.0.0.1:5173
```

MCP actions completed:

- Opened the local app.
- Resized viewport to `1920 x 1080`.
- Captured accessibility snapshot.
- Captured screenshots.
- Confirmed default active document is `地层分层`.
- Clicked all six Explorer workflow nodes.
- Verified active Tab / Right Panel / Status Bar synchronization.
- Returned to `地层分层`.
- Selected `自动分层候选 A`.
- Selected layer row `L2`.
- Switched Bottom Panel tabs.
- Clicked Activity Bar entries for quality issues, calculation log, and output precheck.
- Checked runtime error array and forbidden visible terms.

MCP findings fixed:

- Missing `favicon.ico` caused a browser console error. Fixed by adding inline favicon in `index.html`.
- Source labels were exposed as `Projection`, `External`, `Manual`, `Custom`. Fixed by mapping them to Chinese UI labels.
- Parameter applicability exposed internal labels such as `mixed-review-required`. Fixed by mapping to Chinese labels.
- Disabled primary action still looked blue. Fixed disabled button styling so unavailable actions look unavailable.

MCP final check:

```text
active tab: 地层分层
right panel: 地层分层
selected layer: L2
bottom panel: 成果预检
forbidden terms: none
runtime errors: none
```

Screenshots:

- `D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp\web-p1-snapshot-initial.md`
  - Accessibility snapshot: default `地层分层`
- `D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp\web-p1-initial.png`
  - Resolution: `1920 x 1080`
  - Page: default `地层分层`
- `D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp\web-p1-stratification-after-interaction.png`
  - Resolution: `1920 x 1080`
  - Page: `地层分层`, candidate scheme selected, output precheck bottom tab
- `D:\CPT-UIQA-WebPrototype\process_logs\playwright-mcp\web-p1-final-stratification.png`
  - Resolution: `1920 x 1080`
  - Page: final `地层分层` state after disabled button style fix

## Playwright Regression

Added:

- `tests/e2e/workbench.spec.ts`

Coverage:

- Workbench root visible.
- Default active document is `地层分层`.
- Six Explorer workflow nodes navigate correctly.
- Active Tab / Right Panel / Status Bar synchronize.
- Stratification scheme selection works.
- Layer row selection updates Right Panel.
- Bottom Panel tabs work.
- Activity Bar controls Bottom Panel.
- Forbidden visible terms are absent.
- Console errors and page errors fail the test.

## Verification Result

Build:

```text
npm run build
tsc -b && vite build
✓ built
```

E2E:

```text
npm run test:e2e
2 passed
```

Tests passed:

- `tests/e2e/tooling.spec.ts`
- `tests/e2e/workbench.spec.ts`

## Residual Risks

- The prototype uses sample JSON only and does not implement persistence.
- The current `地层分层` page shows a layer track and SBTn evidence only; it intentionally does not draw unsupported qc/fs/u2 curves.
- Supporting pages are lightweight workflow documents, not full feature implementations.
- Web-P2 should add richer layer/boundary/evidence linking after this shell is accepted.

## Closure Notes

Web-P1 is implemented and verified. The local Vite dev server is available at:

```text
http://127.0.0.1:5173
```

The desktop workspace `D:\CPT-UIQA` was not modified.
