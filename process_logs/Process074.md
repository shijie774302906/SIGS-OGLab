# Process074 - Guided JTS Pore-Path Recovery

Date: 2026-07-12

Status: `closed / implemented / verified`

## Objective

Turn JTS pore-path exceptions into a beginner-friendly decision instead of exposing thousands of rows, unexplained `路径不可用` labels, or a forced trip to Data Check. The default interaction must explain what happened, why the recommendation is safe, and offer one strongest next action while retaining traceable advanced evidence and manual control.

## Product Changes

1. JTS results now distinguish `双路径一致`, `仅 Ic 可用`, `需要确认`, and `当前不可分类` instead of treating every missing pore classification as bad pore data.
2. Pore-path reasons are grouped into continuous depth intervals. Graph-domain overflow is explained as a classification-chart limitation rather than a data error; context and numeric problems retain direct recovery paths.
3. When the pore path has no result but Ic remains valid, the recommendation uses Ic only on affected rows. Other rows retain their dual-path evidence.
4. The default dock shows a conclusion, plain-language reason, three compact counts, one primary action, and a preservation notice. Pore detail and advanced manual controls are collapsed by default.
5. Raw classification changes are separated from a stable editable-candidate preview. The prototype groups nearby changes with a disclosed `0.50 m` working window without claiming that window is an official JTS threshold.
6. One standard smoothing attempt is available only for repairable numeric cases. If a small remainder persists (`<=50` rows and `<=1%`), the user may explicitly preserve those rows as unclassified and continue; the system never invents u2 or a soil class.
7. The chosen candidate mode, grouping window, raw/selected counts, confirmation time, and accepted unclassified-row count are persisted with the scheme origin and validated on reload.
8. Stale dirty stratification edits are preserved as read-only history before a current JTS candidate scheme opens.
9. Recovery is now strictly serial: governance revision, saved Data Check, then JTS rerun. V2 route navigation prevents a legacy UI patch from replacing the newly created classification workspace.
10. When a JTS recommendation is present, the center decision area points to that choice and demotes `改用手动建方案` to a secondary action, avoiding competing primary buttons.

## User Result

- A first-time user can answer `能否继续`, `为什么`, and `点哪个按钮` without reading formulas.
- `孔压没有分类结果` no longer automatically means `孔压数据错误`.
- Users who accept Ic can continue immediately; users who care about pore evidence can open affected intervals, water/pressure context, or complete Data Check evidence.
- Real SCPT1 recovery retained 28 unclassified rows out of 7,832 (`0.36%`) as an explicit choice, then completed stratification, parameter interpretation, three output revisions, and refresh recovery.
- Default center evidence shows four representative review intervals; remaining intervals and raw rows stay behind progressive disclosure.

## Verification

- `npm.cmd run build`: passed. The existing Vite large-chunk advisory remains informational.
- JTS-focused final suite: `19/19` passed.
- Full Chromium Playwright regression: `201/201` passed in 3.7 minutes.
- Real Yingkou G5 evidence run: `2/2` passed in 3.2 minutes; the final current-flow rerun passed in 3.0 minutes.
- Real SCPT1 closure: 7,832 classification rows, current committed scheme, eligible parameter package, three current output revisions, and explicit bounded-gap provenance.
- `1440x900` and `1920x1080`: no body, main-workbench, or right-dock horizontal overflow.
- Guided synthetic evidence: exactly one enabled primary action in the JTS tool; advanced and pore detail collapsed by default; zero console/page errors.
- Visual review: `P0=0 / P1=0`.

## Evidence

- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1440x900.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/ic-fallback-1440x900.png`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/ic-fallback-1920x1080.png`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/pore-detail-1440x900.png`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/advanced-control-1440x900.png`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/browser-check.json`

## Boundaries

This slice does not change JTS formulas, fabricate pore-pressure values, automatically decide major dual-path conflicts, silently adopt stratification, or claim the candidate-grouping window as an official standard threshold. Raw measurements, complete classification evidence, original candidates, and formal-adoption boundaries remain unchanged.
