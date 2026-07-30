# Process055 - Project Persistence Snapshot Foundation

Date: 2026-07-10

Status: `closed / implemented / verified / storage transport awaiting confirmation`

## Theme

Build the versioned, validated snapshot foundation shared by browser storage, workspace files, and future backend persistence without choosing or attaching a transport.

## Scope

- Confirm the JSON-serializable boundary of `ProjectCollectionState`.
- Define snapshot schema/version and decode result taxonomy.
- Validate the complete nested project/workflow shape.
- Add deterministic recovery for invalid active project IDs.
- Reject malformed, duplicate, and unsupported data.
- Add a complete persistence event contract and focused tests.

## Result

- Added `docs/prototype/项目持久化事件合同.md` with PST-E01 through PST-E11.
- Added `src/features/projects/projectSnapshot.ts`.
- Added schema `sigs-oglab.project-collection`, version `1`.
- Added `encodeProjectCollectionSnapshot` and `decodeProjectCollectionSnapshot`.
- Added validation for:
  - unique project IDs and active-project type
  - project/Flow identity consistency
  - import draft headers, preview, rows, problems, versions, and point decisions
  - CPTU numeric row fields
  - check history and conclusion values
  - workflow route, tab, and selected object IDs
- Added explicit decode results: `empty`, `invalid-json`, `invalid-shape`, and `unsupported-version`.
- Unknown active project IDs preserve valid projects and recover to the project hub.
- Added `tests/e2e/fixtures/projectWorkspace.ts` and reused it across project state/snapshot tests.
- Added `tests/e2e/project-snapshot.spec.ts` with four focused tests.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 16 tests.
- Tests prove:
  - two-project nested state round-trip
  - decoded state detachment from the original
  - empty and invalid JSON classification
  - wrong schema, unsupported version, and malformed nested state rejection
  - duplicate project ID rejection
  - unknown active project recovery
  - encoder rejection of invalid state and timestamp
- Source search confirms no `localStorage` adapter was added.

## Boundary

- No browser storage read/write occurs.
- No workspace file, backend, database, cross-tab synchronization, or persistence UI was implemented.
- No desktop repo, formula, save/adoption, or export behavior was changed.

## Next

Attach one explicitly confirmed transport. Recommended current-prototype option: versioned `localStorage`, isolated from deterministic Flow/test URLs, with load/save/clear result types and Playwright refresh/recovery coverage.

