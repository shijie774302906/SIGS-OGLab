# Process070 - G5 Yingkou Real-Case Workflow

Date: 2026-07-11

Status: `closed / implemented / verified / independently reviewed`

## Objective

Validate the browser product with the original multi-point Yingkou workbooks at realistic row counts, and fix any import, persistence, curve, recovery, or cross-page problem found by that human workflow.

## Original Sources

Copied as immutable test inputs from `D:\CPT-UIQA\sample_data\yingkou_cpt9_19_s1\营口海风CP9-19-S1` into `sample_data/source/yingkou/`.

| Point | File | Rows | Depth | Gaps > 0.1 m | SHA-256 |
| --- | --- | ---: | --- | ---: | --- |
| CPT09 | `CPT09数据.xlsx` | 4,282 | 0.01-60.76 m | 0 | `a9f4a8151e8e1eae8e9329b0057eaee7e182cd2c8091a216eb961cf175b9ca6c` |
| CPT19 | `CPT19数据.xlsx` | 4,489 | 0.01-60.30 m | 1 | `20fc4184565a2d1c1ab999fad4ce6ff648f5a4d4129dc6c538f0322adb9b57c7` |
| SCPT1 | `SCPT1数据.xlsx` | 7,832 | 0.01-100.30 m | 6 | `5752326708fa2e77bac919157d24ee8b12b61324bf7a46cbd15b667c3e03acdf` |

All three use `Sheet1`, header row 9, and data beginning at Excel row 10. Total: 16,603 rows.

## Product Changes

1. Added browser-side `.xlsx` workbook profiling and CPT/CPTU extraction in `src/features/import/excelImport.ts` using a dynamically loaded parser. Measurement rows with invalid depth are retained as row-level problems instead of being silently dropped.
2. Unified CSV and Excel normalization through `createTabularImportPipeline`, preserving original fingerprint, sheet metadata, source columns, raw rows, display row numbers, exact V2 lineage, complete cached-value worksheet extraction, and source-cell/workbook-calculated/application-derived/metadata column origins.
3. Extended workflow/V2/migration/adapter/snapshot models for `uploaded-excel` and Excel source metadata.
4. Added a multiple-candidate sheet selection dialog and visible Excel source summary.
5. Changed file failures into transient import problems. A broken workbook, old `.xls`, or unsupported extension never replaces the last committed batch; retry clears the problem and reload restores the valid authority.
6. Bounded curve DOM cost: extrema-preserving SVG line sampling and deterministic interactive-point sampling retain visual peaks, selected-row linking, full result tables, and all persisted 7,832 values.
7. Replaced the static output sample identity with the active project/point and current check, stratification, parameter, and custom-formula counts. File output remains explicitly unconfigured.
8. Added exact output authority checks. Stale stratification, parameters, or formulas cannot become current merely because old rows still exist; formula valid/missing/problem/non-target counts remain visible.
9. Added an adaptive depth-gap check and linked return to the original Excel row. Curves break at real depth gaps and use green for current custom results.
10. Added V2 rejection for damaged Excel source metadata and malformed workbook extractions.
11. Closed an output-authority defect found by independent review: a completed parameter derivation is now output-ready only when both `invalidInputCount` and `undefinedCount` are zero. The output item and gate matrix expose the exact problem counts even when no custom formula exists.

## Human Flow

`FLOW-G5-01` performs only browser-visible actions:

```text
create project
-> upload/check CPT09.xlsx
-> upload/create/check CPT19.xlsx
-> upload/create/check SCPT1.xlsx
-> inspect 6 depth gaps and locate the source Excel row
-> reload and verify three independent points
-> run formula/rule stratification
-> confirm 6 boundaries and classify 7 layers
-> commit stratification
-> create/commit parameter scheme
-> derive and inspect 7,832-row built-in curves
-> define/commit/run qnet / 100 + Qtn
-> inspect the SCPT1 output manifest
-> reload and switch CPT09 / CPT19 / SCPT1
```

`FLOW-G5-02` uploads corrupt `.xlsx` after a valid CPT09 check, retries the valid workbook through check and stratification, then rejects legacy `.xls` and proves the recovered point, batch, source hash, row count, and check artifact are unchanged before and after reload.

## Results

- Three current check artifacts, one per point.
- SCPT1 rule run: completed, 6 candidates, 7 committed layers.
- Parameter derivation: completed over 7,832 source rows, with 5 invalid-input rows and 20 undefined rows; parameter output remains `存在问题` until those rows are resolved.
- Custom formula: `营口综合解译指数`, revision v1, completed, 7,832 values: 7,807 valid, 25 missing-input, 0 numeric problems, 0 out-of-range, and 0 non-target.
- Output manifest: active project and `SCPT1`, 7 layers, parameter result `存在问题`, formula result `存在问题`, and file output unconfigured.
- Final phase timings: CPT09/CPT19/SCPT1 upload-and-check 1.1/2.2/5.4 s; rule stratification 22.7 s; parameter derivation, curve, and no-formula output gate 8.3 s; custom formula 18.9 s; output item review 12.0 s; reload and three-point switching 42.1 s. Full downstream: about 106.5 s.

## Verification

- `npm.cmd run build`: passed.
- `npx.cmd playwright test tests/e2e/yingkou-real-workflow.spec.ts --project=chromium`: 2/2 passed.
- `npx.cmd playwright test --project=chromium`: 133/133 passed.
- Both viewports: no body, main document, or right panel horizontal overflow.
- Browser evidence: no console errors and no page errors.

## Evidence

- Machine record: `process_logs/playwright-mcp/yingkou-real-workflow/flow-run.json`
- Import: `three-points-import-1440x900.png`, `three-points-import-1920x1080.png`
- Curves: `scpt1-custom-curve-1440x900.png`, `scpt1-custom-curve-1920x1080.png`
- Output: `scpt1-output-1440x900.png`, `scpt1-output-1920x1080.png`
- Recovery: `broken-xlsx-recovery-1440x900.png`, `legacy-xls-recovery-1440x900.png`, `recovery-run.json`

## Review

Three independent read-only reviews covered code/data authority, product Flow/recovery, and UI/evidence. The code review found one P1 in parameter output readiness; it was fixed, regression-covered, and re-reviewed. Final result for all three tracks: `P0=0 / P1=0`.
