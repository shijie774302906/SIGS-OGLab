# Process096 - Slice-Aware Verification

Date: 2026-07-15

Status: `closed / implemented / verified`

## Goal

Use deterministic file deltas, active scope, known-problem test links and the Process095 tier manifest to select daily checks, while keeping complete closure verification explicit.

## Implemented

- Added `verify:slice baseline` to capture sorted SHA-256 metadata for maintained source, tests, scripts, process docs and build configuration without relying on Git.
- Added deterministic added/changed/removed/reverted comparison.
- Added impact selection from direct test imports, shared fixtures/configs, explicit plan test paths and current knowledge-report `related_tests`.
- Added safe failure for unknown changed implementation/helper paths and stale knowledge test paths; targeted mode cannot claim an empty success for an unmapped source change.
- Added tier-aware execution, JSON plans/results, child-failure short-circuit and explicit selection reasons.
- Closure mode always selects all 61 specs plus build, tier, knowledge and process checks.
- Added npm commands, 8 selector/runner tests and workflow documentation.

## Verification

- Selector/runner tests: `8/8` passed, covering delta states, direct impacts, shared fixture breadth, unknown paths, knowledge links, stale paths, child failure and closure completeness.
- Controlled tooling targeted plan: 0 browser specs, only tier audit, selector tests, knowledge and process checks; run passed.
- Current-baseline targeted run detected the changed verifier/tests/docs and passed the corresponding checks.
- Controlled domain targeted run for `src/features/check/checkDomain.ts`: selected 1/61 spec and passed `2/2`; no UI or real suite started.
- Closure dry-run selected exactly 61/61 specs: domain 29, UI 24, real 8, with all mechanical gates.
- Build passed. No product UI, engineering formula, persistence behavior or test tier ownership changed.

## Evidence

- `process_logs/verification/Process096-baseline.json`
- `process_logs/verification/Process096-targeted-controlled.json`
- `process_logs/verification/Process096-targeted-current.json`
- `process_logs/verification/Process096-targeted-domain-run.json`
- `process_logs/verification/Process096-closure-dry-run.json`
- `process_logs/playwright-mcp/process096-verify-slice/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process096.json`

## Closure Checklist

- [x] Baseline and deterministic delta comparison implemented.
- [x] Plan, knowledge and import impacts select tests with reasons.
- [x] Unknown implementation and stale knowledge mappings fail safe.
- [x] Targeted execution and closure planning are machine-readable.
- [x] Tests, build, knowledge and workflow consistency checks pass.
- [x] Final evidence is hash-bound to implementation and results.

## Next

Process097 will automate safe evidence promotion, audit and transient cleanup planning. Cleanup will default to dry-run; historical or promoted evidence will never be removed automatically.
