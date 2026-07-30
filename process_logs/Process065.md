# Process065 - Parameter Formula Authority And Method Contract

Date: 2026-07-10

Status: `closed / researched / contract frozen / independently reviewed`

## Scope

This closure covers the Stage G1B source-authority gate only:

- authoritative source trace for the first two parameter methods
- exact formula, variable, unit, sign, and result-semantics contracts
- applicability evidence, conflict handling, and recovery rules
- `Nkt` starting-assumption and site-calibration boundaries
- independent valid, invalid, boundary, and cross-scope golden vectors

It does not add production formula code, visible parameter-page controls, result selection, formal adoption, output generation, or export.

## Frozen Methods

### Peak effective friction angle

- Result: `φ′p（峰值有效摩擦角）`; generic `φ′` is not an acceptable numeric-result label.
- Formula: `φ′p = 17.6 + 11 log10(Qtn)`.
- Numeric domain: finite `Qtn`, strictly `20 < Qtn < 400`, with no clipping.
- Applicability screen: `IcRW < 2.60`, confirmed standard penetration rate of exactly `20 mm/s`, independent drained-behavior evidence, and material-scope evidence.
- Unknown or extrapolated material scope may retain a trial value, but cannot become the current result until an explicit engineering-confirmation revision exists.

### Triaxial-compression reference undrained strength

- Result: `suc（三轴压缩参考不排水强度）`; generic `Su` is not an acceptable numeric-result label.
- Formula: `suc = qnet / Nkt` with finite positive `qnet` and `Nkt`.
- `Ic` is conflict/screen evidence, not a hard strength gate.
- The literature value `Nkt = 12` is available only as an explicit user-selected starting assumption for soft-to-firm normally consolidated, low-organic-content intact clay under the triaxial-compression reference mode. It is never auto-written or described as site calibrated.
- A site-calibrated `Nkt` is accepted only when project, site, point, material, exact layer revision, calibration revision, matched rows/tests, strength mode, failure criterion, and derivation authority all match the current run.

## Evidence And Recovery Contract

- Added versioned penetration-rate, drainage-applicability, material-applicability, calibration, and conflict evidence shapes.
- Added stable issue/reason codes and explicit allowed, warned, blocked, and recoverable states.
- Added `SoilClassBehaviorScreenConflict` before method recommendation when engineering classification conflicts with `Ic` or drainage evidence.
- Conflict resolution is revision-bound. Missing, stale, unrelated, or falsely superseded conflict revisions are rejected.
- Actual material, rate, and drainage observations belong to the shared method-run evidence snapshot; `Nkt` records only its origin, eligibility rules, and source references.
- Non-finite JSON inputs use an explicit `encodedNonFinite` marker and are decoded before domain validation, keeping missing values distinct from `NaN` and infinities.

## Source Corrections

- The deterministic `Qtn` equation is attributed to the ConeTec CPT Design Parameter Manual equation 5.6, not misrepresented as the deterministic equation from Uzielli and Mayne (2019), whose cited deterministic expression uses `qt1`.
- The friction-angle source dataset boundary is recorded as standard `20 mm/s` testing on unaged, uncemented quartz/silica sands and silty sands, with the published `Qtn` modeling interval.
- `Nkt` is mode- and material-dependent. The onshore and offshore literature summaries are retained as separate structured source references rather than collapsed into a universal constant.

## Golden Contract

Primary artifact:

- `sample_data/parameters/parameter-methods-g1b-golden.v1.json`

Coverage:

- 24 `φ′p` vectors
- 41 `suc` vectors
- 8 joint-applicability/conflict vectors
- 41 stable reason codes
- 17 non-null independent numeric formula oracles

The vectors cover valid calculations, open boundaries, missing and non-finite input, rate evidence, material/drainage evidence, explicit conflicts, conflict supersession, literature-assumption eligibility, and site-calibration authority across project/site/point/layer/material/source-row/reference-test revisions.

## Verification

- JSON schema marker: `parameter-method-golden.v1`.
- Golden verifier: `Errors = 0`.
- Independent numeric oracle comparison: `MaxDelta = 0` across 17 non-null expected results.
- All evidence references, context references, issue codes, and calibration-authority references resolve.
- Formula-source review: `P0=0 / P1=0`.
- Domain/applicability review: `P0=0 / P1=0`.
- Golden-vector/test review: `P0=0 / P1=0`.

No build or Playwright run was required for this closure because it changes research contracts and test fixtures only, not executable code or visible UI. Production implementation must consume this contract and will require focused tests, build verification, and browser regression.

## Artifacts

- `docs/prototype/参数解译G1B公式来源与方法合同.md`
- `docs/prototype/参数解译G0调研与功能合同.md`
- `sample_data/parameters/parameter-methods-g1b-golden.v1.json`

## Next Gate

The next slice is G1B implementation confirmation. Only after user confirmation may the production domain implement these two methods, their evidence snapshots, applicability states, immutable runs, and focused acceptance tests. Visible page hierarchy and right-side parameter tools remain G2/G3 work.
