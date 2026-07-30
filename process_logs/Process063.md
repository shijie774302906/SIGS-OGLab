# Process063 - Complete Stratification Workflow And Parameter Handoff

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Scope

Stage F replaces the stratification sample with a point-bound working flow. It covers scheme, layer, boundary, edit-session, revision, recovery, persistence, and upstream/downstream dependency lifecycles, then establishes an exact revision-bound gate into `参数解译`.

## Delivered

- Per-point stratification workspaces with multiple schemes, explicit active/current separation, create, open, switch, duplicate, rename, qualified replacement, and delete.
- Complete layer and boundary editing: add, split, merge, rename, describe, classify, drag, numeric entry, step adjustment, review marking, undo, redo, commit, and discard.
- One-layer initial schemes covering the checked depth range without claiming automatic geological interpretation.
- Immutable committed revision snapshots with base-version conflict protection.
- Exact dependency on point, draft, batch, five-part import revision vector, and check run.
- Exact downstream lineage through both `sourceStratificationSchemeId` and `sourceStratificationRevisionId`.
- Merge provenance with source layer IDs, original depth ranges, descriptions, and soil groups; conflicting soil groups become unclassified and require review.
- Upstream invalidation that retains dirty edits as read-only content instead of silently discarding them.
- Qualified parameter handoff: current scheme, current exact revision, current check input, valid structure, and explicit review state.
- Database validation for live schemes, revision snapshots, edit baselines/working copies, finite depths, boundary references, and parameter/output lineage.
- A Mixpanel-like center workbench with one First Look action, synchronized CPT curve/layer track/table, and a page-specific right dock.
- Required lavender primary, blue data/selection, teal success, and rose attention semantics, including distinct sand/mixed/clay layer fills.

## Acceptance Flows

1. `FLOW-F-01`: upload randomized CSV, complete the first three pages, create/edit/commit a scheme, prove exact revision lineage, reject corrupted live/snapshot/downstream bundles, and enter parameters.
2. `FLOW-F-02`: reject invalid/duplicate boundaries, drag a boundary, assign sand/mixed/clay semantics, retain a review notice, and invalidate the scheme after a new check run.
3. `FLOW-F-03`: split, rename, undo, redo, merge, attempt a target-specific route transition, stay, and explicitly discard a new scheme.
4. `FLOW-F-04`: create and rename multiple schemes, delete the current scheme with a qualified explicit replacement, then delete history without cross-scheme state leakage.
5. `FLOW-F-05`: create independent A/B point schemes, seed exact-revision parameter/output lineage, revise only A, prove A downstream stale and B unchanged, then create A's new revision.
6. `FLOW-F-06`: force two IndexedDB write failures, prove canonical state unchanged and page edits retained, retry, and commit exactly once.
7. `FLOW-F-07`: introduce an upstream change during a dirty edit, prove read-only preservation and disabled commit, explicitly discard, then create and commit a revision.

## Verification

- `npm.cmd run build`: passed.
- Stratification domain tests: `7 passed`.
- Stage F randomized browser flows: `7 passed`.
- Full Playwright: `95 passed`.
- Durable JSON: `expected=95 / unexpected=0 / flaky=0 / skipped=0`.
- Evidence set: 7 generated CSV files, 7 flow-run JSON files, and 24 screenshots.
- Required 1440x900 and 1920x1080 layouts have zero document/editor/table/right-dock overflow.
- Numeric layer cells have zero clipping; all recorded browser console/page error arrays are empty.

## Independent Review

- Visual: `P0=0 / P1=0`; one optional P2 remains for enriching the wide empty state without adding another primary action.
- Domain and persistence: `P0=0 / P1=0`; one optional P2 remains to formalize whether scheme names are non-versioned display aliases.
- Copy and information architecture: `P0=0 / P1=0 / P2=0`.

## Evidence

- `process_logs/playwright-mcp/stratification-workflow-ui/full-regression.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-01-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-02-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-03-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-04-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-05-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-07-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-02-review-boundary-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-failed-save-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-07-dirty-edit-preserved-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-07-revised-after-stale-edit-1920x1080.png`

## Next

Stage G must first confirm the parameter-interpretation functional contract, supported methods/formulas, result semantics, manual-entry policy, and acceptance evidence. No formal formula, adoption, or export implementation begins before that confirmation.
