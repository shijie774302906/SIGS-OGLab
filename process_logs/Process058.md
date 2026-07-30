# Process058 - V2 Point Aggregate, Migration, And IndexedDB Runtime

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Theme

Replace the normal user runtime's single-point V1 storage root with a real V2 project/point aggregate and failure-safe IndexedDB authority before adding editable import controls.

## Result

- Added complete V2 workspace types:
  - projects, real points, import batch records, point drafts
  - full revision vectors and artifact dependencies
  - current and legacy check histories
  - batch tombstones and point conflict state
- Added deterministic V1-to-V2 migration:
  - empty V1 projects do not create placeholder points
  - valid single-point drafts become real points and shared data blocks
  - ambiguous units and multi-point drafts remain editable instead of creating false points
  - entity IDs include project and V1 draft identity to avoid content collisions
- Added IndexedDB authority:
  - manifest, data blocks, migration record, and active metadata commit in one transaction
  - transaction abort is explicit on write failure
  - reachable blocks are retained and orphaned blocks are removed
  - full nested reference validation covers point, draft, batch, run, artifact, execution, fingerprint, and identity relationships
- Added failure-safe bootstrap:
  - V2 loads first
  - V1 migrates only after V2 transaction and readback verification
  - V1 backup remains intact
  - damaged V1, unsupported V1, and damaged V2 stop startup and require confirmed reset
- Switched the normal `/` runtime to V2 while deterministic Flow URLs remain isolated.
- Added a temporary compatibility view that applies explicit V2 patches:
  - UI-only actions do not rebuild domain state
  - import and check patches preserve untouched drafts, runs, issue IDs, and downstream dependencies
  - new-point appends; duplicate name/alias/ID becomes a visible conflict
- Added manifest revision CAS and visible write freeze after cross-tab conflict.
- Moved feedback messages into document flow so they no longer cover tables.

## Verification

- `npm.cmd run build`: passed.
- `npm.cmd run test:e2e`: `38 passed`.
- Covered:
  - deterministic migration and ID collision cases
  - true IndexedDB transaction abort after a queued manifest write
  - stale-tab CAS conflict and continued-edit freeze
  - valid V1 app migration and V1 backup preservation
  - invalid V1 and V2 recovery
  - normal generated CSV upload, point creation, check, and refresh restore
  - A/B new-point creation with independent check history
  - switching real points
  - duplicate point identity conflict without replacement
  - UI navigation preserving hidden drafts, failed run metadata, issue IDs, and four downstream dependency states
- Two read-only review tracks completed. Final result: no known Stage A P0.

## Evidence

- `process_logs/playwright-mcp/workspace-v2-runtime/v2-runtime-import-1440x900.png`
- `process_logs/playwright-mcp/workspace-v2-runtime/v2-runtime-import-1920x1080.png`
- `process_logs/playwright-mcp/workspace-v2-runtime/flow-run.json`
- `flow-run.json` records generated input, final V2 state, viewport checks, console/page errors, and SHA-256 for the implementation and test files.

Final evidence checks:

- body horizontal overflow: false
- document horizontal overflow: false
- right dock horizontal overflow: false
- feedback/table overlap count: 0
- console errors: 0
- page errors: 0

## Boundary

- The compatibility adapter remains temporary; new mapping/unit work must use V2 domain commands and must not expand V1 runtime ownership.
- Excel parsing, editable mapping UI, unit UI, full multi-point split UI, production backend, and formal export remain later stages.

## Next

Stage B: extract and implement the import domain for source columns, editable mapping decisions, unit decisions, normalized rows, stable source row IDs, per-point grouping, and deterministic tests.

