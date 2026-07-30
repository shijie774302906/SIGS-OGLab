# Process066 - G1B Parameter Method Implementation

Date: 2026-07-10

Status: `implemented / verified / independently reviewed`

## Scope

Implemented the first two source-bound parameter interpretation methods on top of the G1A/G1C parameter foundation:

- `phi_peak_qtn_v1`: `17.6 + 11 log10(Qtn)` with strict source bounds and no clipping
- `suc_qnet_nkt_v1`: `qnet / Nkt` with explicit literature or site-calibrated authority

The slice covers formulas, applicability, evidence revisions, conflict supersession, calibration ownership, immutable method runs, row results, layer statistics, persistence, invalidation, and corruption rejection. No visible parameter-page redesign was included.

## Implemented Contracts

- Strict 42-code reason registry and typed reason arrays.
- Independent rate, drainage, material, conflict, and reference-test revision catalogs.
- Fixed literature `Nkt=12` source scope and CAUC/CIUC-only site calibration.
- Canonical project/site/point/layer/source-row/reference-test ownership.
- Exact reconstruction of all active source rows before method scope filtering.
- Immutable scheme revisions, derivation runs, method runs, settings, evidence, inputs, and results.
- Append-only IndexedDB comparison, mandatory CAS, fixed manifest identity, and a separate authority digest for manifest-side corruption detection.
- Upstream changes invalidate open work while retaining historical terminal runs.
- Projects or points with parameter authority history cannot be removed or re-identified through a normal save; a future destructive lifecycle must use an explicit tombstone-bearing operation.

## Acceptance

- Frozen vectors: `74/74` passed.
- Stable reason codes: `42/42` matched bidirectionally.
- Independent numeric oracles: `17`, `MaxDelta = 0` at tolerance `1e-12`.
- Focused Playwright parameter/workspace tests: `13/13` passed.
- Full Playwright regression: `106/106` passed.
- Production build: `npm.cmd run build` passed.
- Build retains the existing non-failing Vite chunk-size warning.

Adversarial persistence cases prove rejection of forged values, summaries, evidence, layer references, omitted source rows, coordinated terminal-run rewrites through the save API, immutable scheme-revision rewrites, wrong-site reference tests, manifest-ID replacement, stale CAS completion, and manifest-side direct IndexedDB corruption.

Threat-model boundary: this browser-only prototype does not claim resistance to same-origin malicious code that can rewrite both the manifest and its digest. That would require a trusted anchor outside browser storage or a server signature.

## Review

Three final read-only tracks reviewed formula authority, domain/persistence boundaries, and test independence. All three closed at `P0=0 / P1=0`.

## Next

The confirmed future product shape is recorded in `plan-total.md`: formula/rule stratification, visible parameter depth curves, constrained custom formulas, then a real UI import and full Playwright run using the multi-page Yingkou case. Each remains a separately confirmed feature slice.
