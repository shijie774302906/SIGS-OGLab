# Process067 - F2 Formula/Rule Stratification

Date: 2026-07-11

Status: `implemented / verified / independently reviewed`

## Scope

Completed the formula/rule candidate path while retaining the full manual stratification workflow:

```text
current checked data
-> configure qc / Fr change-point rule
-> immutable candidate run
-> inspect curve, score, and source windows
-> convert to a new editable scheme
-> manually refine boundaries and soil labels
-> explicitly commit an immutable stratification revision
-> hand the exact revision to parameter interpretation
```

The first rule is `qc_fr_change_point_v1`. It uses median windows and a fixed transparent score:

```text
qc_component = 1 - exp(-abs(ln(qc_below / qc_above)))
fr_component = 1 - exp(-abs(ln(fr_below / fr_above)))
score = 0.7 * qc_component + 0.3 * fr_component
```

If any Fr input is unusable, the run records `StrRuleFrUnavailable` and uses the qc component only.

## Implemented Contracts

- Versioned fixed rule specification and bounded settings.
- Deterministic median-window candidates, raw-score thresholding, endpoint spacing, minimum spacing, boundary cap, and stable tie ordering.
- Immutable queued/running/cancel-requested/completed/cancelled/failed/invalidated run lifecycle.
- Frozen ordered input rows, source-row evidence, settings, formula, input, result, idempotency, and source hashes.
- Candidate previews remain distinct from current scheme boundaries.
- Conversion creates a normal editable scheme; no candidate becomes current without manual review and explicit commit.
- Rule-derived schemes retain exact run/candidate/source references after boundary movement.
- Upstream changes invalidate open work while preserving completed history.
- Complete ordered draft rows, normalized-data hashes, exact check dependency, manifest CAS, contiguous revisions, live/revision equality, tombstones, and candidate uniqueness are validated.
- Every terminal hashed check run is authority-bound from creation, before any rule run can reference it.
- Committed schemes cannot be downgraded to `working`; a working scheme must be a new uncommitted `isNew` edit.
- Direct manifest corruption is detected by the external interpretation-authority digest.

Threat-model boundary: the browser prototype does not claim resistance to same-origin malicious code that can rewrite both the manifest and its metadata digest. That requires a trusted server-side anchor or signature.

## Acceptance

- Stratification rule domain tests: `5/5` passed.
- Focused complete stratification workflow: `8/8` passed.
- Checked-data and downstream integration subset: `20/20` passed.
- Pre-F2 check-authority tamper test: `1/1` passed.
- Full Playwright regression: `113/113` passed.
- Production build: `npm.cmd run build` passed.
- Build retains the existing non-failing Vite chunk-size warning.

`FLOW-F2-01` uploads a randomized 14-row CSV through the real UI, runs Data Check, configures the rule, generates and inspects a candidate, converts it to an editable scheme, moves the boundary from `3.75 m` to `3.85 m`, reviews soil groups, commits revision 1, verifies downstream handoff, and executes adversarial persistence checks.

Evidence:

- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01.csv`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-run.json`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-rule-preview-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-rule-preview-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-committed-rule-scheme-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-committed-rule-scheme-1920x1080.png`

The final evidence reports zero browser errors and zero horizontal overflow at both viewports.

## Review

Formula/domain, UI, and persistence review tracks all closed at `P0=0 / P1=0` after targeted fixes and reruns.

## Next

Prepare G2 as a separately confirmed slice: a visible parameter depth-curve workbench consuming the existing G1B methods and exact F2/manual stratification revision. Custom formulas and the real Yingkou upload flow remain later stages.
