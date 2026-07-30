# Process064 - Parameter Input Derivation And Persistence Foundation

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Scope

This closure covers Stage G `G1A + G1C` only:

- parameter-workspace domain objects and lifecycle
- transparent `qt/qnet/Qtn/Ic` input derivation
- exact check and stratification source binding
- immutable derivation runs and status transitions
- atomic persistence and corruption rejection
- golden-vector, lifecycle, persistence, and regression verification

It does not implement `φ′`, `Su`, layer statistics, parameter-result selection behavior, or the final parameter-page interaction. Those remain behind the G1B formula-authority gate.

## Delivered

- Added `ParameterWorkspaceV2` types for schemes, immutable revisions, edit sessions, slots, derivation settings, derivation runs, exact lineage, and future parameter-result contracts.
- Added deterministic input derivation with explicit imported/derived `qt` policy, `qnet`, recomputed `Fr`, four-step `Qtn/Ic` iteration, effective-stress floor evidence, per-row status, and issue codes.
- Added full scheme lifecycle: create, resume dirty edit, rename, update settings, commit, discard, duplicate configuration, soft delete, restore, select, and mark stale.
- Added derivation-run lifecycle: prepare, idempotent reuse, start, complete, cancel, fail, immutable source/settings snapshots, and six-state terminal validation.
- Added canonical stable serialization and synchronous SHA-256 hashing for source, settings, result, and idempotency integrity.
- Added exact normalized source-row references so derivation evidence is not inferred from point names or array positions.
- Added atomic IndexedDB persistence with manifest revision compare-and-swap and strict save/load validation.
- Added rejection of forged settings, source rows, hashes, results, summaries, duplicate commands, unknown statuses, and mixed terminal evidence.
- Added upstream invalidation from import, check, stratification, and active-draft changes.
- Added independent golden vectors generated outside the production implementation.

## Formula Boundary

The implemented contract is limited to the locally specified parameter-input derivation:

```text
normalized CPT rows
-> qt policy
-> sigma_v0 / u0 / sigma'_v0
-> qnet / Fr
-> four fixed Qtn-Ic iterations
-> immutable derivation result
```

Imported `Fr` is comparison evidence only. It does not replace recomputation. The current source material does not fully authorize `φ′` or `Su`, so those formulas are deliberately unavailable in the canonical workspace validator.

## Regression Finding

The first strict compare-and-swap integration projected every point as though it had a parameter workspace. That made a normal new-point save look like an unauthorized parameter mutation and caused 15 existing UI-flow failures with a local-save conflict message.

The projection was corrected to include only points that actually own `parameterWorkspace`. The affected 27-test subset then passed, followed by a clean full suite. This was a real integration defect found by regression testing, not dismissed as test instability.

## Verification

- `npm.cmd run build`: passed.
- Parameter domain and persistence tests: 6 passed.
- Focused regression subset after the compare-and-swap fix: 27 passed.
- Full Playwright suite: `101 passed` in 22.5 seconds.
- Final formula/domain/test independent reviews: `P0=0 / P1=0` for all three tracks.
- Build emitted only the existing Vite large-chunk warning; no build or browser failure remained.

Primary evidence:

- `sample_data/parameters/parameter-input-derivation-v1-golden.json`
- `tests/e2e/parameter-domain.spec.ts`
- `tests/e2e/parameter-persistence.spec.ts`
- `tests/e2e/point-generation.spec.ts`
- `playwright-report/index.html`

No new UI screenshots were required because this slice changed the domain and persistence foundation rather than visible page layout. The complete existing UI suite was still run as regression evidence.

## Next Gate

G1B must not begin until both `φ′` and `Su` have a source contract containing title, edition/version, page/equation, exact formula, variables, units, applicability, assumptions, and calibration behavior. The next active slice is recorded in `plan.md`.
