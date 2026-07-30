# Process071 - JTS Minimal-Input CPT/CPTU Interpretation Workflow

Date: 2026-07-11

Status: `closed / implemented / verified`

## Objective

Complete the active `plan.md` slice as a browser-native CPT/CPTU workflow based on the minimum measured input contract and the JTS/T 242-2020 method package, from point lifecycle through local PDF/Excel results.

## Implemented Product Slice

1. Froze the JTS method package, units, applicability, missing-value behavior, no-u2 behavior, source references, and independent golden vectors against the official authority and the local `JTS-T242-2020.md` navigation copy.
2. Completed point create/open/switch/rename/duplicate/delete/cancel recovery with independent per-point workflow authority.
3. Reduced ordinary import to `Depth(m) / qc(MPa) / fs(kPa) / u2(kPa, optional)`, with advanced mapping and unit confirmation revealed only when needed. Raw cells and extra derived columns remain source evidence and are not default inputs.
4. Added immutable row/range governance, exclusions, depth-window median smoothing, raw/smoothed/overlay views, stale invalidation, rerun, restore, and exact source lineage.
5. Added full CPTU and no-u2 approximate derivation/classification routes, traceable nine-class evidence, editable JTS candidate schemes, immutable stratification revisions, and downstream stale recovery.
6. Added the JTS parameter package with required/recommended/optional methods, Nkt source confirmation, material and drainage decisions, per-row results, layer representative values, history, and exact authority hashes.
7. Added an explicit silt manual-alternative path. A drainage decision alone never extends a JTS correlation; a positive manual value plus its source is frozen under `manual_silt_phi` or `manual_silt_su` and remains visibly distinct from JTS calculated values.
8. Added pore-pressure dissipation test import, immutable series, automatic/manual t50, layer linkage, Ch/kh calculation revisions, history, and invalidation.
9. Added browser-generated A4 two-page interpretation reports, A3 atlases, and six-sheet Excel workbooks with current authority, provenance, history, failure retention, retry, download reconstruction, and stale invalidation.
10. Closed full CPTU, no-u2, randomized exception, recovery, refresh, three-point isolation, real Yingkou, and file-readback flows.

## Full-Scale Defects Closed During Stage 8

- Dense real classification initially emitted adjacent candidates that could not satisfy the stratification editor's 0.05 m minimum spacing. Nearby changes are now merged before conversion, endpoint candidates are filtered, and the JTS dock exposes conversion failures directly.
- Real SCPT1 contained silt, revealing that drainage confirmation alone left the output workflow with no legitimate resolution. The new manual silt path requires provenance and never labels the value as a JTS formula result.
- Large output generation could be observed before its IndexedDB save completed. The real acceptance flow now proves each immutable output revision is persisted before generating the next format and before refresh.
- The no-u2 route preserves pressure-dependent measured/output cells as null and never fabricates u2-dependent results.

## Real Yingkou Closure

- Sources: CPT09 4,282 rows, CPT19 4,489 rows, SCPT1 7,832 rows; 16,603 rows total with exact SHA-256 fingerprints.
- All three points import, check, refresh, and switch independently.
- SCPT1: standard 0.50 m smoothing revision, current recheck, 7,832-row full CPTU classification, 137 committed layers, 44,626 valid parameter values, and an explicitly sourced non-design manual silt value.
- Generated and reopened: A4 report 475,481 bytes, A3 atlas 1,304,470 bytes, Excel workbook 739,009 bytes.
- Three output revisions remain current after refresh.

## Verification

- `npm.cmd run build`: passed. Vite reports the existing large-chunk advisory only (main bundle about 985 kB before gzip).
- `MILESTONE_EVIDENCE=1 npm.cmd exec -- playwright test --project=chromium`: `187/187` passed in 3.6 minutes, with no exclusions.
- Real Yingkou current JTS Flow: passed in 3.0 minutes.
- Corrupt `.xlsx` and legacy `.xls` recovery Flow: passed in 14.3 seconds.
- Required user-facing term scan: no `阻塞` or `测试解译` in `src`.
- Curated flow records report zero console/page errors and no body, workbench, or right-dock horizontal overflow.
- Final visual checks at `1440x900` and `1920x1080` found no P0/P1 issue.

## Evidence

- Stage 1 point lifecycle: `process_logs/playwright-mcp/jts-stage1-point-workspace/`
- Stage 2 minimal import: `process_logs/playwright-mcp/jts-stage2-minimal-import/`
- Stage 3 governance: `process_logs/playwright-mcp/jts-stage3-data-governance/`
- Stage 4 classification: `process_logs/playwright-mcp/jts-stage4-classification/`
- Stage 5 parameter package: `process_logs/playwright-mcp/jts-stage5-parameter-package/`
- Stage 6 dissipation: `process_logs/playwright-mcp/jts-stage6-dissipation/`
- Stage 7 output: `process_logs/playwright-mcp/jts-stage7-output/`
- Stage 8 point/no-u2 closure: `process_logs/playwright-mcp/jts-stage8-closure/`
- Real full-scale closure: `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`, `current-jts-output-1440x900.png`, and `current-jts-output-1920x1080.png`.

## Review And Boundaries

The current session rules did not authorize review sub-agents. The primary agent completed the planned source/domain, Flow/recovery, and UI/report read-only review tracks; the closure result is `P0=0 / P1=0`.

Generated files remain prototype interpretation results, not design values or formal adoption documents. This slice does not add backend/cloud persistence, collaboration, DXF, foundation design calculations, other standards, or legacy project migration.
