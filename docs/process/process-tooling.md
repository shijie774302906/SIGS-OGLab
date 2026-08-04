# Process Consistency And Evidence Tooling

## Process Doctor

```powershell
npm.cmd run process:doctor -- --process 094
npm.cmd run process:doctor -- --process 094 --phase closure
```

The default phase is inferred for the requested Process, not only from the globally active plan. Therefore a historical closed Process can still be checked while a newer Process is active.

Active checks treat unfinished todos, pending knowledge dispositions and a missing final manifest as notices. They still fail on contradictions such as a mismatched active Process number, a stale knowledge context or a one-way update-library relationship.

Closure checks require:

- `plan.md` has no active slice when `--phase closure` is explicitly requested.
- `Process.md` owns the same current closed Process, or retains a correct historical row when checking older work.
- The archive exists, is closed and contains no unchecked todo.
- Every managed closed Process is present in `update-library.json` and all Process/KPB links are bidirectional.
- The referenced knowledge report is reviewed and still matches its archived context.
- Every referenced evidence path exists.
- At least one referenced final `evidence-manifest.json` audits successfully and binds implementation, tests and the knowledge report.
- Recorded build and test commands succeeded.

Use `--output <file> --json` for a machine-readable diagnostic record. Errors name the owning path and a concrete recovery action.

## Historical Knowledge Reports

An archived report keeps the problem-library hash from its closure time. Later additions to the shared problem/update libraries do not invalidate that history by themselves. The doctor still verifies the archived context hash, reviewed dispositions, report-file hash through the evidence manifest, and current bidirectional update links.

The current active or explicitly closing Process remains stricter: its report must match the current problem/update libraries.

## Safety Boundary

These tools check presence, freshness and consistency. They do not decide engineering correctness, approve `not-applicable`, delete transient evidence, change formulas, or replace human visual/geotechnical review.
## Playwright Test Tiers

`tests/e2e/test-tiers.json` is the single ownership manifest for every Playwright spec. Run:

```text
npm.cmd run test:tiers:audit
npm.cmd run test:domain-fast
npm.cmd run test:ui-isolated
npm.cmd run test:real-serial
```

- `domain-fast` runs pure domain/state/hash tests without starting Vite.
- `ui-isolated` uses Playwright's per-test BrowserContext plus `fixtures/isolatedTest.ts` to reset browser-local authority automatically.
- `real-serial` covers public or deterministic full-scale fixtures, persistence, IndexedDB recovery, and performance with one worker; private engineering sources are never required.

The audit fails when a spec is missing, duplicated, stale, in the wrong layer, bypasses the shared UI fixture, or directly clears LocalStorage/IndexedDB. A test that deliberately changes storage during a migration or recovery scenario must call `resetWorkspaceAuthority(page, { reload: false })` at that exact step. Product database names and production persistence code are never changed for test isolation.

## Slice-Aware Verification

Capture the maintained-file baseline immediately after a slice is confirmed, before implementation:

```text
npm.cmd run verify:slice -- baseline --process 096
```

Then plan or run verification:

```text
npm.cmd run verify:slice -- --process 096 --mode targeted --dry-run
npm.cmd run verify:slice -- --process 096 --mode targeted
npm.cmd run verify:slice -- --process 096 --mode closure --dry-run
```

Targeted mode combines SHA-256 file changes, direct test imports, explicit test paths in `plan.md`, and `related_tests` from the current knowledge report. Every selected spec records its reasons. Since this workspace has no Git metadata, CI may supply one or more `--changed <path>` values instead of using the local baseline.

An implementation or shared-test file without a safe impact mapping makes targeted mode fail and recommend closure. Closure mode always selects the complete tier manifest plus build, knowledge, and process gates. Child-command failure stops later work and remains recorded in the JSON result.

## Closure Dry-Run

After implementation and verification are complete, preview formal closure without mutating the active plan, index, libraries or archive:

```text
npm.cmd run process:close -- --process 098 --dry-run --verification process_logs/verification/Process098-targeted.json --evidence process_logs/playwright-mcp/process098-process-close --problem KPB-016
```

The command requires completed plan checkboxes, a current reviewed knowledge report, successful same-Process verification JSON, a nonempty curated evidence directory, valid explicit problem IDs, and no archive/update collision. It writes a JSON plan and a Markdown archive draft under `process_logs/closure-drafts/` and re-hashes all formal inputs after writing to prove they were unchanged.

`--apply` is intentionally unsupported. The engineer must complete the title, result, professional correctness, boundaries, evidence judgement and `not-applicable` reasoning before using the existing manual archive/final-manifest/strict-doctor sequence.
