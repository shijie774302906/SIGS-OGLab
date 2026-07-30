# Process062 - First-Three-Page Closure And Check Handoff

Date: 2026-07-10

Status: `closed / implemented / verified / independently reviewed`

## Scope

Stage E closes `项目/点位数据 -> 数据导入 -> 数据检查` as one point-bound workflow and establishes the explicit gate into `地层分层`. A check result is usable only when its point, active draft, import batch, and complete five-part revision vector still match.

## Delivered

- Data Check First Look states for not run, current, problem, notice-only, and stale results.
- Explicit `allow / warn / deny` handoff gate into stratification, used by both route clicks and restored routes.
- Complete `ArtifactDependency` capture at check start and revalidation before persistence, preventing cross-point or cross-draft result binding.
- Authoritative `selectCurrentCheckResult` and database validation for active run, artifact, draft, batch, status, conclusion, and revision consistency.
- Per-point independent check runs, issue selections, histories, and handoff state.
- Issue-to-import recovery with target field, stable source-row ID, and user-visible file row number.
- Correct recovery evidence for both single-point and interleaved multi-point CSV files.
- Current, stale, same-input-history, and historical run semantics.
- Distinct visual language for problem, notice, passed, not-run, and stale states.
- Compact history and evidence tables with zero internal overflow at the required viewports.
- Passed checks use a read-only dock; recovery actions appear only where a correction is meaningful.

## Acceptance Flows

1. `FLOW-E-01`: upload a randomized clean point, prove unchecked stratification denial, run a notice-only check, inspect the exact dependency, verify passed-item dock behavior, and enter stratification.
2. `FLOW-E-02`: upload randomized qc problem data, inspect row evidence, recover to the exact file row, upload a correction, prove the old result stale, rerun, and preserve history.
3. `FLOW-E-03`: generate randomized interleaved A/B/C points, prove current/empty/problem state independence, and recover point C's internal second row to file row seven.
4. `FLOW-E-04`: change a confirmed unit after a current check, prove exact revision invalidation and route denial, then rerun and retain the old run as history.

## Verification

- `npm.cmd run build`: passed.
- Focused Stage E and selector suite: passed.
- Full Playwright: `81 passed`.
- Durable JSON report: `expected=81 / unexpected=0 / flaky=0 / skipped=0`.
- Browser console/page errors: none in all four recorded flows.
- Required 1440x900 and 1920x1080 evidence is present.
- Document, decision band, right dock, history table, and evidence table overflow checks are zero where required.

## Independent Review

- Visual: `P0=0 / P1=0 / P2=0`.
- Domain: `P0=0 / P1=0 / P2=0`.
- Copy and information architecture: `P0=0 / P1=0`; no remaining closure issue.

## Evidence

- `process_logs/playwright-mcp/check-handoff-ui/full-regression.json`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-01-run.json`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-02-run.json`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-03-run.json`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-04-run.json`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-01-unchecked-redirect-1440x900.png`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-01-passed-dock-1920x1080.png`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-02-problem-before-recovery-1440x900.png`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-02-source-row-recovery-1920x1080.png`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-03-interleaved-source-row-1920x1080.png`
- `process_logs/playwright-mcp/check-handoff-ui/flow-e-04-stale-history-1920x1080.png`

## Next

Stage F designs and implements the complete `地层分层` workflow: scheme, layer, and boundary lifecycles; synchronized evidence; recovery; downstream invalidation; and the handoff into `参数解译`.
