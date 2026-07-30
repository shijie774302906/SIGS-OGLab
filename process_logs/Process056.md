# Process056 - Versioned Local Project Persistence

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Persist multiple independent browser projects across refresh using the verified versioned snapshot while keeping deterministic Flow/test sessions isolated.

## Scope

- Add a namespaced `localStorage` adapter.
- Load validated projects before first render and save reducer state changes.
- Remove storage when the project collection becomes empty.
- Preserve memory state and expose a notice on storage failure.
- Isolate Flow/test URLs from user project reads and writes.
- Add recovery UI and confirmed clear action.
- Verify real refresh, recovery, and clear behavior.

## Result

- Added `src/features/projects/projectStorage.ts`.
- Added key `sigs-oglab.project-collection.v1`.
- Added typed load/save/clear results and read/write/remove error classification.
- App initialization restores valid saved state or safely returns to an empty project hub.
- Project reducer changes save automatically; empty collections remove the key.
- URLs with `flow`, `case=random`, or `seed` use transient demo state and do not touch saved projects.
- Project hub now provides:
  - compact recovery/save notice only when needed
  - `本机项目` dock tool
  - `清除本机项目` with cancel/confirm states
- Added `tests/e2e/project-storage.spec.ts`.
- Added `tests/e2e/project-persistence.spec.ts`.
- Extended project reducer tests with the clear action.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 21 tests.
- Adapter tests prove save/load/remove and read/write/remove failure classification.
- Human browser Flow proves:
  - two projects with different routes survive refresh
  - active project and route restore
  - deterministic Flow does not overwrite the saved snapshot
  - rename survives refresh
  - clear cancellation preserves projects
  - clear confirmation removes projects and storage key
  - damaged JSON and unsupported version recover without white screen
- Browser checks at `1440x900` and `1920x1080`:
  - main horizontal overflow: `false`
  - dock horizontal overflow: `false`
  - clear action visible: `true`
  - console errors: `0`
  - page errors: `0`

## Evidence

- `process_logs/playwright-mcp/project-local-persistence/project-hub-persisted-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/project-hub-persisted-1920x1080.png`
- `process_logs/playwright-mcp/project-local-persistence/projects-restored-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/projects-cleared-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/damaged-storage-recovery-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/browser-check.json`
- `process_logs/playwright-mcp/project-local-persistence/flow-run.json`

## Boundary

- Persistence is browser-local only; no backend, database, cross-device sync, or formal engineering storage is implied.
- Workspace file import/export, migrations, and cross-tab conflict handling were not implemented.
- No desktop repo, formula, adoption/save authority, or formal export behavior was changed.

## Next

Proceed to the remaining data-import completeness scope: editable field mapping, explicit unit confirmation, and multi-point file strategy. These require a combined object/event design before implementation because multi-point imports affect the project/point model.

