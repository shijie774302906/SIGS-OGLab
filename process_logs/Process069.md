# Process069 - G1D Constrained Custom Formulas

Date: 2026-07-11  
Status: `closed / implemented / verified / independently reviewed`

## Scope

Add user-defined parameter curves without allowing arbitrary scripts or weakening the frozen authority of built-in `φ′p/suc` methods:

```text
current parameter revision + completed input derivation + exact stratification revision
-> constrained formula revision
-> immutable row-input snapshot
-> cancellable formula run
-> shared-depth curve, rows, layer summary, problems, history, and recovery
```

## Implemented

- Added separate `内置方法 / 自定义公式` modes while reusing the G2 shared-depth workbench.
- Added formula create, list, select, edit, rename, duplicate, soft delete, confirmation, restore, stale rebuild, and exact revision history, including revisions that have never run.
- Added a `jsep` parser boundary plus a separate whitelist AST validator and evaluator. No `eval`, `Function`, property access, dynamic calls, arrays, strings, conditions, comparison, logic, loops, network, or side effects are allowed.
- Frozen variables, constants, functions, operator precedence, length/node/depth limits, null propagation, numeric bounds, function domains, result ranges, and reason codes.
- Added immutable formula and run snapshots with exact parameter, derivation, stratification, point, row, metadata, AST, content, input, result, and idempotency authority.
- Added strict load-time reconstruction: persisted input rows are rebuilt from the authoritative derivation and stratification revision; lifecycle timestamps and terminal evidence must be ordered and mutually consistent.
- Added prepare/start/cancel/complete/invalidate behavior. Cancelled, failed, and invalidated runs cannot retain partial results.
- Added live selected-row preview, cursor-aware variable/function insertion, target-layer selection, range checks, and exact issue-to-source-row navigation.
- Added dirty gates for tool mode, formula switch, route change, and source-row navigation with stay, save, or discard outcomes.
- Kept historical formula definitions, curves, inputs, and runs read-only while making the primary action explicitly run the current formula.
- Separated current formula problems from collapsed upstream derivation notices.
- Applied blue `#35b0f5` to custom results, green `#2abf9a` to built-in results, and lavender `#bdadff` to historical comparison.

## Human Acceptance Flows

`tests/e2e/custom-formula-ui.spec.ts` uploads randomized CSV files through the real UI:

1. `FLOW-G1D-01`: create, validate, target one layer, commit, cancel, rerun, link curve/row/layer/problem views, rerun again, compare history, and reload.
2. `FLOW-G1D-02`: reject property access, prove no revision was created, run a legal divide-by-zero case, preserve null rather than zero, group issues, and locate the exact uploaded source row.
3. `FLOW-G1D-03`: commit and run v1/v2, commit an unrun v3, open revision history and frozen v1 authority, duplicate, confirm delete, restore, and exercise dirty mode/formula/route transitions.
4. `FLOW-G1D-04`: retain an old completed curve after upstream stratification changes, block premature formula rebuild, rebuild the parameter source, rebind changed target layers, and complete a new formula run.

## Verification

- `npm.cmd run build`: passed.
- G1D domain tests: `3/3` passed.
- G1D randomized human flows: `4/4` passed.
- Full Playwright regression: `130/130` passed.
- `npm.cmd audit --audit-level=high`: 0 vulnerabilities.
- Evidence viewports: `1440x900` and `1920x1080`.
- Evidence: 18 PNG screenshots, 4 randomized CSV files, and 4 machine-readable run JSON files.
- Every evidence JSON records `browserErrors=[]`; document, workbench, and right-panel horizontal overflow are all `0`.
- Final read-only reviews:
  - Security/domain authority: `P0=0 / P1=0`.
  - Interaction/information architecture: `P0=0 / P1=0`.
  - Visual/evidence quality: `P0=0 / P1=0`.

## Evidence

- Contract: `docs/prototype/参数解译G1D受限自定义公式合同.md`
- Domain: `src/features/parameters/customFormulaDomain.ts`
- Human Flow: `tests/e2e/custom-formula-ui.spec.ts`
- Evidence root: `process_logs/playwright-mcp/custom-formula-ui/`
- Main curve/history: `flow-g1d-01-run.json`
- Safety/problem recovery: `flow-g1d-02-run.json`
- Revision/lifecycle: `flow-g1d-03-run.json`
- Stale old/new result recovery: `flow-g1d-04-run.json`

## Remaining Boundary

G1D does not make custom formulas formally adopted results and does not add backend sharing or production export. The next stage is G5: locate and confirm the Yingkou source files, then run a realistic multi-page upload and performance/flow acceptance through the browser.
