# Process053 - Engineering Structure And Data Check First Look

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Create reusable engineering boundaries and give the third workflow page the same clear first-decision hierarchy as project and import.

## Scope

- Extract reusable types and pure data-check logic from `App.tsx`.
- Introduce a shared page decision-band component.
- Refactor project/import First Look onto the shared component.
- Add Data Check First Look states and one center primary action.
- Add a true check-stage problem and recovery Flow.
- Split test-data helpers and add focused domain tests.

## Result

- Added `src/features/workflow/types.ts`.
- Added `src/features/import/importDomain.ts`.
- Added `src/features/check/checkDomain.ts` with check issue generation, counts, filters, state, continuation, evidence, and decision derivation.
- Added `src/components/workbench/PageDecisionBand.tsx` and adopted it on the first three pages.
- Reduced `src/App.tsx` from about 195 KB to about 185 KB and the main E2E file from about 35 KB to about 32 KB.
- Added Data Check First Look states for import problem, not run, stale, check problem, notice, and clear.
- Removed competing center continuation actions; each data-check state has exactly one strongest center primary action.
- Added CHK-E11: a schema-valid, numeric, depth-monotonic CSV with `qcKpa <= 0` passes import parsing but creates a blocking check issue.
- Added row evidence, `QcKpa` recovery focus, corrected upload, rerun, and continuation to `地层分层`.
- Added `tests/e2e/fixtures/generatedCptu.ts`, `check-domain.spec.ts`, and `data-check-first-look.spec.ts`.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 9 tests.
- Domain tests cover import-problem, not-run, stale, notice, clear, CHK-E11 counts, filtering, evidence, and continuation.
- Human CHK-E11 Flow covers generated file upload, check problem, evidence, return to import, corrected upload, rerun, and continuation.
- Browser check passed at `1440x900` and `1920x1080`:
  - center primary action count: `1`
  - document horizontal overflow: `false`
  - decision-band horizontal overflow: `false`
  - console errors: `0`
  - page errors: `0`

## Evidence

- `process_logs/playwright-mcp/data-check-first-look/check-problem-1440x900.png`
- `process_logs/playwright-mcp/data-check-first-look/check-problem-1920x1080.png`
- `process_logs/playwright-mcp/data-check-first-look/check-recovered-1440x900.png`
- `process_logs/playwright-mcp/data-check-first-look/browser-check.json`
- `process_logs/playwright-mcp/data-check-first-look/flow-run.json`
- `process_logs/playwright-mcp/data-check-first-look/input/`

## Boundary

- No desktop repo, SQLite, `app_data`, official formula, persistence, formal save/adoption, or export behavior was changed.
- Existing evidence was not deleted.
- Stratification, parameter, and output behavior was not redesigned.

## Next

Continue M1 with project/workflow state and feature-page decomposition before adding the next major page behavior. Product decisions for persistence, Excel, editable mapping, and multi-point files remain explicit in `plan-total.md`.

