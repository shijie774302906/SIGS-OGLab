# Process060 - Editable Mapping And Units

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Scope

Stage C turns the persisted V2 import pipeline into a real Data Import interaction. Users can inspect source fields, confirm or change mappings, confirm source units, compare source and standardized values, locate problems, run Data Check, and recover after mapping or unit changes.

## Delivered

- Editable mapping lifecycle: select, confirm, modify, cancel, clear, and reset.
- Explicit units for m/cm/mm, kPa/MPa, and %/ratio with source-to-standard conversion samples.
- Mapping, unit, row, and point problems with field or physical source-row recovery targets.
- Source values, standardized values, source units, standard units, and provenance exposed in the import/check views and evidence.
- Exact stale reasons after mapping or unit changes; rerunning Data Check restores the current dependency chain.
- Batch-wide invalidation across every point referencing the edited batch, including check, stratification, parameters, and output states.
- Multi-point planning detects existing names and aliases before generation; generation UI remains Stage D.
- Page-specific right dock limited to the selected field's mapping and unit tools.
- Separate pending mapping and pending unit counts; optional missing fields remain data notices rather than false pending actions.
- CSV-only file-selection language and input filter. Template actions remain in the upload section.

## Acceptance Flows

1. `FLOW-IMPORT-01`: upload a randomized alias/MPa CSV, confirm the alias mapping and source unit, inspect kPa values, then run Data Check.
2. `FLOW-IMPORT-02`: upload a randomized unknown-depth-column CSV, cancel an edit, map it to `DepthM`, confirm m, and run Data Check.
3. `FLOW-IMPORT-03`: check a no-unit qc file as MPa, change it to kPa, prove the old check and all shared-batch downstream states become stale, then rerun.
4. `FLOW-IMPORT-04`: check a randomized standard CSV, clear the required depth mapping, prove the exact stale reason, then reset and recover.

Each flow records generated CSV input, 1440x900 and 1920x1080 screenshots, intermediate recovery-state screenshots, and a machine-readable `flow-run.json`.

## Verification

- `npm.cmd run build`: passed.
- Focused Stage C evidence: `4 passed`.
- Full Playwright: `69 passed`.
- Durable JSON report: `expected=69 / unexpected=0 / flaky=0 / skipped=0`.
- Browser console/page errors: none in the recorded flows.
- Layout checks: no incoherent overlap or required horizontal clipping at 1440x900 and 1920x1080.

## Independent Review

- Visual: `P0=0 / P1=0`.
- Domain: `P0=0 / P1=0`.
- Copy and information architecture: `P0=0 / P1=0`.

## Evidence

- `process_logs/playwright-mcp/import-mapping-ui/full-regression.json`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-01-run.json`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-02-run.json`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-03-run.json`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-04-run.json`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-01-1440x900.png`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-01-1920x1080.png`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-03-unit-stale-check-1440x900.png`
- `process_logs/playwright-mcp/import-mapping-ui/flow-import-03-unit-stale-check-1920x1080.png`

## Next

Stage D should implement multi-point split-all/split-selected decisions, per-point append/replace/rename/skip handling, generation progress, partial failure recovery, and the corresponding human-operation acceptance flows.
