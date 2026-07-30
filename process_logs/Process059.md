# Process059 - Import Domain Pipeline

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Theme

Move CSV parsing, mapping, units, normalization, provenance, and per-point planning out of `App.tsx` into one authoritative V2 import domain before building editable Stage C controls.

## Result

- Added `src/features/import/importPipeline.ts`:
  - quoted CSV parsing with physical line numbers and full raw cells
  - stable source row/column IDs bound to batch, source revision, and source fingerprint
  - exact, alias-candidate, missing, duplicate-conflict, user-confirm, clear, and reset mapping behavior
  - m/cm/mm, kPa/MPa, percent/ratio conversion and explicit unit decisions
  - full-column unit conflict scanning and finite-result validation
  - per-row normalized values with source, derived, defaulted, or missing provenance
  - per-point depth/final-depth validation without cross-point comparison
  - split-all, split-selected, cancel, constant/existing point attribution, target decisions, and execution plans
  - mapping, unit, normalization, point-plan, source-replacement, operation, and workspace-revision commands
- Removed the authoritative CSV parser, alias map, numeric reader, and cross-point depth check from `App.tsx`.
- Reused the import definitions in V1-to-V2 migration.
- Normal uploads now commit the computed pipeline into V2 rather than reconstructing it from a reduced legacy draft.
- IndexedDB raw blocks preserve every parsed row plus `sourceRowId`, source index, and original physical row number.
- V2 point drafts preserve aggregate source/derived/defaulted provenance, units, and derivation dependencies.
- Added `PointTargetDecisionV2` and reference validation for target points and expected active drafts.
- Added real operation and workspace-revision rejection before writeback.

## Correctness Fixes From Review

- Mixed, unsupported, or header/cell-conflicting units cannot be manually confirmed away.
- Unit validation scans all rows, not only preview samples.
- MPa overflow and other non-finite conversion results remain problems.
- A blank mapped PointName cannot inherit the current point.
- ASCII separator and Unicode point names cannot collide in problem IDs.
- Invalid optional source values retain raw provenance and are not relabeled as defaults.
- Fr derivation records both Fs and Qt dependencies.
- Provenance-only changes advance normalization revision.
- Rebinding a duplicate mapping recomputes every conflict state.
- Partial point projection contains only selected point rows.
- Replacing a source in the same batch advances revisions and cannot reuse row IDs.
- A delayed operation or changed workspace revision cannot overwrite a newer state.

## Verification

- `npm.cmd run build`: passed.
- Full Playwright: `63 passed`.
- Import domain: `22 passed`.
- Browser barriers prove:
  - delayed file A cannot overwrite newer file B
  - a parse result is rejected after workspace revision changes
  - uploaded pipeline objects, raw row references, revisions, source fingerprint, target decision, and provenance remain authoritative after IndexedDB commit
- Two independent read-only review tracks completed at `P0=0 / P1=0`.

## Evidence

- `process_logs/playwright-mcp/workspace-v2-runtime/v2-runtime-import-1440x900.png`
- `process_logs/playwright-mcp/workspace-v2-runtime/v2-runtime-import-1920x1080.png`
- `process_logs/playwright-mcp/workspace-v2-runtime/flow-run.json`

Evidence checks:

- all recorded implementation/test SHA-256 values match current files
- raw block completeness: `full`
- body/document/right-dock horizontal overflow: false
- feedback overlap count: 0
- console errors: 0
- page errors: 0

## Boundary

- Stage C mapping dropdowns, unit selectors, normalized source/standard comparison, and field-focused right dock are not implemented in this slice.
- Stage D multi-point generation UI and existing-name decision dialogs are not implemented in this slice; their domain types and commands now exist.
- Excel Sheet/header selection remains Stage F and must reuse this pipeline.
- No backend, production database, formal interpretation formula, or formal export was added.

## Next

Stage C: build editable mapping and unit confirmation UI on the persisted V2 batch, then run FLOW-IMPORT-01 through FLOW-IMPORT-03 with generated files and browser evidence.
