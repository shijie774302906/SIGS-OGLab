# Process061 - Multi-Point Generation And Recovery

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Scope

Stage D turns a multi-point CSV from an unresolved import batch into an explicit per-point generation plan. Users can choose all or selected points, resolve existing-name conflicts per point, generate independent point drafts atomically, cancel and reopen without losing the plan, recover from stale workspace revisions, and continue with the remaining problem points.

## Delivered

- Point-plan table with generation scope, source-row count, depth range, target action, target name, and execution state.
- Per-point create, append, replace, rename, and skip decisions with name/alias conflict handling.
- Duplicate-target protection in both the planning command and the generation command.
- Deterministic collision-resistant point and draft IDs, including names whose readable slugs are identical.
- Atomic multi-point generation with idempotent execution records and no partial runtime write on persistence failure.
- Independent point drafts, active-point switching, check histories, and downstream artifact state.
- Full source-row ownership validation at the IndexedDB boundary, including row existence, uniqueness, point ownership, and normalized-row count.
- Complete evidence projection for source-row IDs, structured value provenance, mappings, units, target decisions, revisions, and check input dependencies.
- Cancellation as a frozen lifecycle state: point selections, decisions, executions, mappings, units, and revisions remain unchanged; reopening resumes the plan.
- Stale-plan freeze with one refresh/reconfirm action and no misleading ready-to-generate labels.
- One generation primary action in First Look; the right dock is limited to the selected point's target decision and problem recovery.
- Current-point problem detail with evidence, recommended action, and field/source-row location.
- Point plan promoted to the first viewport for multi-point batches.

## Acceptance Flows

1. `FLOW-D-01`: create and check point A, upload randomized A/B/C data, append A, create B/C, generate all, check only A, then switch to B and prove independent check state.
2. `FLOW-D-02`: establish a checked point, upload a randomized two-point candidate, cancel it, prove existing-point and candidate-batch canonical state are unchanged, then reopen.
3. `FLOW-D-03`: upload randomized A/B/C data with a depth-order problem in C, generate A/B only, keep C in the batch, inspect its evidence, and use the recovery locator.
4. `FLOW-D-04`: make a ready plan stale through an external workspace revision, prove zero generated drafts, freeze the plan, refresh, and generate exactly once.

## Verification

- `npm.cmd run build`: passed.
- Focused randomized Stage D flows: `4 passed`.
- Focused import/domain/database suite: `32 passed` during remediation.
- Full Playwright: `75 passed`.
- Durable JSON report: `expected=75 / unexpected=0 / flaky=0 / skipped=0`.
- Browser console/page errors: none in all four recorded flows.
- Layout evidence: 1440x900 and 1920x1080 both have zero document overflow; the workbench, right dock, and point-plan table remain inside their containers.

## Independent Review

- Visual: `P0=0 / P1=0`.
- Domain: `P0=0 / P1=0`.
- Copy and information architecture: `P0=0 / P1=0`.

## Evidence

- `process_logs/playwright-mcp/import-multipoint-ui/full-regression.json`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-01-run.json`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-02-run.json`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-03-run.json`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-04-run.json`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-01-ready-1440x900.png`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-01-ready-1920x1080.png`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-02-cancelled-1440x900.png`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-03-partially-generated-1440x900.png`
- `process_logs/playwright-mcp/import-multipoint-ui/flow-d-04-stale-rejected-1440x900.png`

## Next

Stage E should close the first-three-page workflow end to end: active-point context, point-bound Data Check results, issue-to-import recovery, rerun, and the explicit handoff gate into `地层分层`.
