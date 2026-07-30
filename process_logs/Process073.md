# Process073 - JTS Recovery UX Simplification

Date: 2026-07-12

Status: `closed / implemented / verified`

## Objective

Reduce the cognitive load of the JTS inline recovery introduced in Process072 while keeping its deterministic, bounded, previewed, reversible, and append-only safety contract intact. The problem state must lead a first-time user to one clear next action without requiring a detour to Data Check when a safe automatic treatment exists.

## Product Changes

1. A JTS problem now replaces the normal JTS tool instead of stacking below it, so the dock exposes exactly one strongest primary action.
2. The safe automatic treatment is selected and labeled as the recommendation, with a plain-language reason and a result-oriented action label.
3. Evidence, alternative treatments, and the stable diagnostic code use progressive disclosure and remain available without occupying the default first view.
4. Alternative automatic treatments use native radio controls with normal keyboard arrow behavior. Ineligible exclusion remains visible with its reason.
5. Navigation treatments are direct one-click actions instead of a select-then-execute sequence.
6. Numeric-domain copy identifies the actual problem category when all affected rows share one reason instead of always naming two possible causes.
7. Automatic recovery completion leaves a compact persistent result message explaining the created revision and confirming that raw measurements were not changed.
8. Returning from probe or water-context correction refreshes the active diagnosis in place; switching points clears local recovery state so a prior point cannot leak into the next point.

## UX Result

- Default problem view contains the problem, affected count, recommended action, impact preview, one primary action, and collapsed secondary detail.
- The former generic `执行所选处理` label is replaced by concrete labels such as `标准平滑并继续` and `排除 1 行并继续`.
- The visible automatic-treatment path remains two intentional clicks from the initial classification run to recovery completion.
- The `1440x900` default and expanded-alternative states keep the recovery primary action inside the viewport.
- The redesign preserved the existing palette, density, radius system, navigation, and engineering authority boundaries; no new dependency or motion layer was introduced.

## Verification

- `npm.cmd run build`: passed. The existing Vite large-chunk advisory remains informational.
- Focused recovery suite: `4/4` passed, covering recommended smoothing, bounded exclusion, unsafe exclusion explanation, direct navigation, manual context ownership, keyboard radio navigation, success feedback, and source preservation.
- JTS-focused regression: `42/42` passed before the final copy-only reduction.
- Full Chromium Playwright regression after implementation: `195/195` passed in 3.7 minutes.
- Final focused rerun after the last disclosure assertion: `4/4` passed.
- Source-term scan: no user-facing `阻塞`, `测试解译`, `执行所选处理`, or obsolete `标准平滑并重新检查` in `src`.
- Curated browser record: zero console/page errors; no body, workbench, or right-dock horizontal overflow; recovery primary action visible in default and expanded `1440x900` states.
- Visual review at `1440x900` and `1920x1080`: `P0=0 / P1=0`.

## Evidence

- `process_logs/playwright-mcp/jts-recovery-ux/flow-run.json`
- `process_logs/playwright-mcp/jts-recovery-ux/recommended-action-1440x900.png`
- `process_logs/playwright-mcp/jts-recovery-ux/recommended-action-1920x1080.png`
- `process_logs/playwright-mcp/jts-recovery-ux/other-options-expanded-1440x900.png`
- `process_logs/playwright-mcp/jts-recovery-ux/recovery-complete-1440x900.png`

## Boundaries

This slice changes presentation and interaction only. JTS formulas, automatic-treatment thresholds, data-governance commands, engineering-context authority, raw-data immutability, and prototype/formal-adoption boundaries are unchanged.
