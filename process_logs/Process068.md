# Process068 - G2 Parameter Curve Workbench

Date: 2026-07-11  
Status: `closed / implemented / verified / independently reviewed`

## Scope

Turn the verified G1A/G1B/G1C parameter domain into a real browser workbench:

```text
committed stratification revision
-> parameter scheme and exact revision
-> qt / qnet / Qtn / IcRW derivation
-> layer evidence and Nkt authority
-> φ′p / suc method runs
-> shared-depth curves, rows, layer summaries, problems, history, and recovery
```

G2 does not add hidden formulas, formal adoption semantics, production export, or user-defined formulas.

## Implemented

- Replaced the static parameter page authority with the persisted V2 `parameterWorkspace`.
- Added shared-depth tracks for `qt/qnet`, `Qtn`, `IcRW`, and the selected `φ′p/suc` result, including layer bands, boundaries, cursor, local axes, legends, missing-value breaks, and same-method history comparison.
- Added scheme create, select, edit, commit, duplicate, rename, soft delete, restore, stale rebuild, and exact revision history.
- Added derivation and method run start, cancellation, terminal history, rerun, immutable result hashes, and refresh persistence.
- Added row, curve, layer, and source-row linkage while separating inspection layer state from evidence target-layer state.
- Added per-layer penetration rate, drainage, material class, and Nkt evidence; unresolved drainage conflicts are visibly blocked until an exact resolution revision is saved.
- Made site-calibrated Nkt unavailable without matching CAUC/CIUC authority and removed any page-local fallback to literature Nkt.
- Added one dirty-transition gate for method, layer, scheme, route, and source-row navigation: save a new revision, discard and continue, or stay.
- Added a read-only selected-run authority view with frozen scheme settings, method version, formula source, per-layer Nkt, evidence snapshots, and evidence revision references.
- Kept current scheme controls and historical run authority visually and semantically separate.

## Acceptance Flows

`tests/e2e/parameter-workbench-ui.spec.ts` uses random CSV files uploaded through the real UI:

1. `FLOW-G2-01`: complete φ′p/suc curve flow, dirty transitions, cancellation, rerun, curve-row-layer linkage, history comparison, source-row recovery, and refresh.
2. `FLOW-G2-02`: site-calibrated Nkt is blocked when CAUC/CIUC authority is absent; no silent literature fallback.
3. `FLOW-G2-03`: historical scheme deletion and restoration do not replace the current scheme.
4. `FLOW-G2-04`: a v1 run reopens with frozen v1 scheme, stratification, settings, and evidence while the current scheme is v2.
5. `FLOW-G2-05`: an upstream stratification revision makes the old parameter scheme stale, then rebuilds a multi-target-layer scheme from the latest revision.
6. `FLOW-G2-06`: drainage conflict and exact resolved-conflict authority are created through visible UI actions.

Every Flow monitors console and page errors. Evidence JSON records `browserErrors=[]`.

## Verification

- `npm.cmd run build`: passed.
- G2 Playwright Flow: `6/6` passed.
- Full Playwright regression: `123/123` passed.
- Viewports: `1440x900` and `1920x1080`.
- Layout checks: document, workbench, curve grid, and right panel horizontal overflow are all `0`.
- Final read-only reviews:
  - Visual Layout Taste Auditor: `P0=0 / P1=0`.
  - Geotechnical Domain Reviewer: `P0=0 / P1=0`.
  - Copy/IA/Mobbin Challenger: `P0=0 / P1=0`.

## Evidence

- Contract: `docs/prototype/参数解译G2曲线工作台合同.md`
- Main evidence: `process_logs/playwright-mcp/parameter-workbench-ui/flow-g2-01-run.json`
- Historical revision: `process_logs/playwright-mcp/parameter-workbench-ui/flow-g2-04-run.json`
- Stale multi-layer rebuild: `process_logs/playwright-mcp/parameter-workbench-ui/flow-g2-05-run.json`
- Conflict authority: `process_logs/playwright-mcp/parameter-workbench-ui/flow-g2-06-run.json`
- Screenshots and random CSV inputs: `process_logs/playwright-mcp/parameter-workbench-ui/`

## Remaining Boundary

The next stage is G1D constrained user-defined formulas. It requires a new confirmation card before implementation. Yingkou remains the later G5 real multi-page upload acceptance.
