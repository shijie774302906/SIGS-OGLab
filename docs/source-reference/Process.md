# Development Process Index

This file is the lightweight process index for `D:\CPT-UIQA`.

Keep durable details in `process_logs/Process*.md`. Do not turn this file back into a monolithic execution log.

## Current Override - 2026-07-08 Workflow Gate Repair and 05 Single-Page Loop

- Active file: `process_logs/Process81.md`
- Active theme: `workflow gate 修复与 05 地层分层默认页单页循环`
- Current active slice: `05 地层分层默认页 - planning/function/layout gate`
- Status: `05 planning gate risk close / ready for 05 Figma drawing`; no WinUI code or Figma drawing changed.
- Result:
  - Added hard UI/Figma gates to `design.md`.
  - Added UI/Figma handoff cautions to `AGENTS.md`.
  - Changed `plan.md` from the 02-10 batch to the 05 single-page loop.
  - Changed `docs/ui-02-10-mainflow-development-handoff.md` to `draft reference / not implementation input`.
  - Changed `docs/figma-interface-02-10-batch-review.md` to a draft record with 2026-07-08 audit findings.
  - Added `docs/ui-05-stratification-default-planning-gate.md` for the first single-page loop.
  - Ran first reviewer round for 05: Parfit risk, Lagrange risk, Erdos blocked, Dirac risk.
  - Patched 05 planning gate to add formal `进入参数解译`, internal grid constraints, quality-gate states, current WinUI capability mapping, verification path, testable predicates, and reuse list.
  - Ran reviewer re-check: Parfit pass, Lagrange pass, Erdos risk with blocking closed, Dirac pass.
- Active loop order:
  - `05 地层分层默认页`
  - `05B 地层分层方法选择器`
  - `06 参数解译默认页`
  - `06A 参数方法选择器`
  - `07 成果输出`
  - `02 项目/点位数据`
- Blocking / risk:
  - No 02-10 Figma node may be treated as approved handoff until its page-level review gates close.
  - Figma sync and PNG export are evidence only, not approval.
  - `05` may now enter Figma drawing, but not development handoff.
  - Remaining risk: current WinUI is still projection-only / official-write disabled; 05 Figma must not imply implemented formal write behavior.
- Boundary:
  - no WinUI code, Figma drawing change, SQLite schema, import parser, algorithm, method registry, or export contract change in this slice.

## Current Override - 2026-07-04 02-10 UI Draft Batch Generated

- Active file: `process_logs/Process80.md`
- Active theme: `02/05/06/07/08/09/10 后续 UI 设计稿`
- Current active slice: `主流程后续 UI 图稿补齐，Figma 已同步`
- Status: local PNG UI drafts generated and editable Figma frames synced; superseded on 2026-07-08 as `draft / blocked for review`; no WinUI code changed.
- Result:
  - Generated local reviewable UI drafts for `02 项目/点位数据`, `05 地层分层`, `05A 分层对比`, `05B 分层方法选择器`, `06 参数解译`, `06A 参数方法选择器`, `07 成果输出`, `08 方法实验室`, `09 研究模式`, and `10 全局状态集`.
  - Synced editable Figma frames with node ids `52:2`, `52:137`, `52:301`, `52:412`, `52:548`, `52:680`, `52:800`, `52:894`, `52:1039`, and `52:1050`.
  - Source generator: `tools/design/generate_ui_design_drafts.ps1`.
  - Batch review: `docs/figma-interface-02-10-batch-review.md`.
  - Draft reference formerly named development handoff: `docs/ui-02-10-mainflow-development-handoff.md`.
- Latest exported evidence:
  - `app_data/temp/figma-02-project-points.png`
  - `app_data/temp/figma-05-stratification-main.png`
  - `app_data/temp/figma-05b-stratification-method-selector.png`
  - `app_data/temp/figma-05a-stratification-comparison.png`
  - `app_data/temp/figma-06-parameter-interpretation-main.png`
  - `app_data/temp/figma-06a-parameter-method-selector.png`
  - `app_data/temp/figma-07-output-main.png`
  - `app_data/temp/figma-08-method-lab.png`
  - `app_data/temp/figma-09-research-mode.png`
  - `app_data/temp/figma-10-global-states.png`
- Blocking / risk:
  - Agent spawn returned `agent thread limit reached`; independent agent re-check is still required before implementation.
- Boundary:
  - no WinUI code, SQLite schema, import parser, quality-check rules, formula, algorithm, method registry, or export contract change in this slice.

## Current Override - 2026-07-04 04 Data Check UI Handoff Reviewer Fixes Applied

- Active file: `process_logs/Process79.md`
- Active theme: `04 数据检查真实 UI 图与开发 handoff`
- Current active slice: `04 数据检查真实 UI 图与开发 handoff`
- Status: reviewer-agent blocking fixes applied; pending final re-check; no WinUI code changed in this slice.
- Result:
  - Figma now contains real product UI frames for `04 数据检查` default blocking state and key states.
  - Real UI nodes include `37:2`, `40:2`, `40:369`, `40:733`, `40:1133`, `40:1506`, and `43:14`.
  - Development handoff is recorded in `docs/ui-04-data-check-development-handoff.md`.
  - Figma review record is recorded in `docs/figma-interface-04-data-check-review.md`.
  - Reviewer fixes aligned the design to `项目级质量门 + 选中点位钻取`, added the `检查规则` panel, and documented the required `IssueEvidence` contract for curve/data-row positioning.
- Latest exported evidence:
  - `app_data/temp/figma-04-data-check-main.png`
  - `app_data/temp/figma-04-1-data-check-empty-state.png`
  - `app_data/temp/figma-04-2-data-check-running-state.png`
  - `app_data/temp/figma-04-3-data-check-warning-state.png`
  - `app_data/temp/figma-04-4-data-check-passed-state.png`
  - `app_data/temp/figma-04-5-data-check-run-failed-state.png`
  - `app_data/temp/figma-04-6-data-check-rules-panel.png`
- Next decision:
  - run reviewer-agent re-check; if no blocking remains, either implement `04 数据检查` in WinUI or continue drawing `05 地层分层`.
- Boundary:
  - no WinUI code, SQLite schema, import parser, quality-check rules, formula, algorithm, or export contract change in this slice.

## Current Override - 2026-07-04 03 Data Import UI Handoff Ready

- Active file: `process_logs/Process79.md`
- Active theme: `03 数据导入真实 UI 图与开发 handoff`
- Current active slice: `03 数据导入真实 UI 图与开发 handoff`
- Status: design handoff ready; no WinUI code changed in this slice.
- Result:
  - Figma now contains real product UI frames for `03 数据导入` dialogs, panels, and key states.
  - Real UI nodes include `30:2`, `30:32`, `30:79`, `30:125`, `31:2`, `31:425`, `31:864`, `31:1303`, and `31:1736`.
  - Development handoff is recorded in `docs/ui-03-data-import-development-handoff.md`.
  - `03B 数据导入-状态与入口闭环` remains an internal explanation/check board and must not be implemented as a product page.
- Latest exported evidence:
  - `app_data/temp/figma-03-1-import-settings-dialog.png`
  - `app_data/temp/figma-03-2-smart-mapping-panel.png`
  - `app_data/temp/figma-03-3-precheck-detail-panel.png`
  - `app_data/temp/figma-03-4-clear-draft-confirm-dialog.png`
  - `app_data/temp/figma-03-5-empty-state.png`
  - `app_data/temp/figma-03-6-parsing-state.png`
  - `app_data/temp/figma-03-7-blocking-state.png`
  - `app_data/temp/figma-03-8-submit-success-state.png`
  - `app_data/temp/figma-03-9-write-failure-state.png`
- Next decision:
  - implement `03 数据导入` in WinUI, or
  - continue drawing the next real UI screen such as `04 数据检查` / `05 地层分层`.
- Boundary:
  - no SQLite schema, import parser, submit semantics, formula, algorithm, or export contract change in this slice.

## Previous Override - 2026-06-30 R1-A Closed / R2-A Active

- Active file: `process_logs/Process79.md`
- Active theme: `R2-A: main workflow information architecture and per-entry closure loop`
- R0-A closure: Engineering critique re-check `pass`; UI Chinese user critique re-check `pass`; Integration owner decision `pass`.
- R1-A closure: local QA `LOCAL_QA_RESULT=PASS`; Engineering critique `risk` with no blocking; UI Chinese user critique `risk` with no blocking; Integration owner decision `risk close`.
- Current active slice: `R2-A：主流程信息架构与逐页入口闭环`
- R2-A status: planning handoff active in `plan.md`.
- User direction: R1-A shell now reads as VSCode-like, but the app still has page-level clutter, debug wording, weak business status, and unclear next actions; those remaining product problems belong to R2-A / R3.
- Boundary for next implementation patch: visible information architecture, business wording, right/bottom panel responsibility, and UI regression only; no SQLite schema, import semantics, formula, algorithm, export contract, or method registry change.
- Verification for this update:
  - R1-A full local QA, screenshot, focused compatibility fixes, and reviewer findings are recorded in `process_logs/Process79.md`.
- Historical boundary: all entries below, including the previous R0-A/R1-A sections and older `Current Override` sections, are historical records and must not override this top entry plus `plan.md`.

## Previous Override - 2026-06-30 R0-A Plan-total Reset

- Active file: `process_logs/Process79.md`
- Active theme: `R0-A Plan-total reset`
- User direction: archive the previous `Plan-total.md` content, delete the old total-plan body, and reset the total roadmap because the current APP is visually poor, messy, and unclear in function.
- Archive path: `docs/archive/Plan-total-archive-20260630-before-reset.md`
- New route: `Plan-total.md` is now the entry for rebuilding from the current problem baseline toward a result-first, understandable, usable, VSCode-like CPT/CPTU engineering interpretation workbench.
- Current active slice: `R0-A：Plan-total 存档与重置`
- Next candidate slice: `R1-A：VSCode-like 壳体区域与主流程入口最小闭环`
- Boundary: documentation/governance reset only; no product code, UI, SQLite schema, formula, algorithm, export contract, method registry, or QA script change.
- Verification for this slice:
  - `git diff --check -- Plan-total.md plan.md Process.md AGENTS.md`
  - `git diff --check -- docs/archive/Plan-total-archive-20260630-before-reset.md process_logs/Process79.md`
  - `git status --short -- Plan-total.md plan.md Process.md process_logs/Process79.md docs/archive/Plan-total-archive-20260630-before-reset.md AGENTS.md`

## Historical Override Boundary - 2026-06-30

- All older `Current Override` sections below this boundary are historical records.
- They are kept for traceability and must not be deleted in this R0-A governance patch.
- They are not the current active slice and must not override the top `R0-A Closed / R1-A Active` entry.
- The current active source is the top R1-A override plus `plan.md`.

## Current Override - 2026-06-30 Multi-Agent Loop Adoption / GMW-P3Q Active

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3Q: shortened local QA bounded full-chain rerun`
- Governance change: future non-trivial slices must use the fixed multi-agent loop:
  - Planning agent prepares the slice handoff.
  - Code-only agent implements only the handoff.
  - Engineering critique agent reviews ownership, evidence, integration risk, and classifies findings as `blocking` / `risk` / `nit`.
  - UI Chinese user critique agent reviews from a real Chinese engineering-user perspective and challenges UI directness, simplicity, redundancy, engineering-software fit, and result usability.
- Ownership rule: every slice must name exactly one slice owner and exactly one integration owner before closure.
- Review rule: review pass requires concrete evidence; oral pass is not enough.
- Current active slice: `GMW-P3Q：缩短版 local QA 完整链路限时复跑`.
- Patch review correction: Code-only agent only executes the handoff; final `pass` / `risk close` / `blocked` must be decided by the mainline integration owner after engineering critique and UI Chinese user critique evidence, and cannot override unresolved `blocking` findings.
- Diagnostic QA command note: P3Q bounded rerun should use `-SkipGitDiffCheck` while governance docs are dirty; this is diagnostic evidence only and does not replace final clean QA.
- Boundary: documentation/governance update only in this override; no product code, UI, schema, formula, export, or method registry change.
- Immediate verification for this governance update: `git diff --check -- AGENTS.md plan.md Process.md process_logs/Process79.md Plan-total.md`.

## Current Override - 2026-06-30 GMW-P3P Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3P: shortened local QA downstream timeout diagnosis`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3P`.
- Result:
  - `run-local-quality-gate.ps1` now supports `-StepTimeoutSeconds` with default `240`.
  - External QA steps are executed with per-step timeout protection.
  - Timed-out steps write `LOCAL_QA_STEP_TIMEOUT=True;Step=<name>;TimeoutSeconds=<n>` to their log.
  - Timeout failures still produce `result.json` and `summary.md`.
  - Empty `Process.ExitCode` values are normalized to `0` so marker-only successful scripts are not misclassified.
- Verification:
  - parser/source checks passed.
  - forced timeout check produced summary/result and a controlled timeout failure.
  - build passed with 0 warnings / 0 errors.
- Next active slice candidate: `GMW-P3Q: shortened local QA bounded rerun`.
- Boundary unchanged: no SQLite schema change, no formula change, no product UI change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3O Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3O: Method Lab visual runtime check recovery`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3O`.
- Result:
  - `check_method_lab_visual_runtime.ps1` now waits for Method Lab registry, capability, preview, and caption AutomationIds after navigation.
  - Focused Method Lab visual runtime check passes again.
  - A shortened local QA run progressed past the previous Method Lab visual runtime failure and later reached parameter projection and density checks before the outer command timeout.
- Verification:
  - `METHOD_LAB_VISUAL_RUNTIME_PARSE=PASS`
  - `METHOD_LAB_VISUAL_RUNTIME_CHECK=PASS`
  - `METHOD_LAB_VISUAL_RUNTIME_REGISTRY=PASS`
  - `METHOD_LAB_RESULT_OBJECT_CAPABILITIES=PASS`
  - build passed with 0 warnings / 0 errors.
- Next active slice candidate: `GMW-P3P: shortened local QA downstream timeout diagnosis`.
- Boundary unchanged: no SQLite schema change, no formula change, no product UI change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3N Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3N: QA result summary and timing evidence`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3N`.
- Result:
  - Local QA step records now include `elapsedMilliseconds`.
  - Console output now includes `LOCAL_QA_STEP_<name>_MS`.
  - `result.json` now includes total elapsed time, parameter result consumption summary, merged skip summary, and slowest steps.
  - `summary.md` now includes elapsed time, `Parameter Result Consumption`, `Merged Skips`, `Slowest Steps`, and per-step `ElapsedMs`.
  - Early-stop runs mark parameter result checks as `NOT_REACHED`.
- Verification:
  - parser/source checks passed.
  - `parameter-projection-check --no-restore` passed.
  - build passed with 0 warnings / 0 errors.
  - short local QA generated the new summary/result shape but still failed before parameter checks at existing `method-lab-visual-runtime-check`.
- Next active slice candidate: `GMW-P3O: Method Lab visual runtime check recovery`.
- Boundary unchanged: no SQLite schema change, no formula change, no product UI change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3M Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3M: result-consumption QA slimming and duplicate check merge`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3M`.
- Result:
  - Merged parameter result visualization assertions into `check_parameter_scheme_workbench_static.ps1`.
  - Local QA now expects visualization markers from `parameter-scheme-workbench-static-check`.
  - The standalone `parameter-result-visualization-check` is skipped in local QA with an explicit merged message instead of reopening the same parameter workbench.
  - Fixed the local QA parser issue in the method-lab real-point runner condition.
- Latest screenshot: unchanged from prior UI slice; P3M changes QA routing only.
- Next active slice candidate: `GMW-P3N: QA result summary and timing evidence`.
- Boundary unchanged: no SQLite schema change, no formula change, no product UI change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3L Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3L: fast multi-point parameter projection regression`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3L`.
- Result:
  - Added `tools/parameter-projection-check`, a fast non-UI regression tool for runtime ParameterScheme projection.
  - The tool creates an isolated temp project, imports Yingkou sample data, runs first-pass interpretation for `CPT09` and `CPT19`, then checks default plus explicit parameter projections.
  - Verification now proves current projection source, explicit point context, at least two point contexts, `SeriesPointCap=240`, and no `ParameterInterpretationRuns` write.
  - The tool is wired into `tools/local-qa/run-local-quality-gate.ps1` as `parameter-projection-check`.
- Latest screenshot: unchanged from `GMW-P3K`; P3L is non-UI.
- Next active slice candidate: `GMW-P3M: result-consumption QA slimming and duplicate check merge`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3K Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3K: dynamic parameter projection performance and current-point regression`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3K`.
- Result:
  - Runtime ParameterSeries display point cap was reduced to `240` points per parameter.
  - Parameter result tokens now expose `RuntimeProjection=True`, `ProjectionSourceKind=current-parameter-projection`, and `SeriesPointCap=240`.
  - Parameter UIA verifies `ResultCount <= SeriesPointCap`, `PointContextMatch=True`, runtime projection, ready Phi, Gamma blocked/missing runner, OCR blocked, and no official write.
  - Full parameter UIA passed in `54.2` seconds without hanging.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_181353.png`.
- Next active slice candidate: `GMW-P3L: fast multi-point parameter projection regression`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3J Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3J: parameter scheme projection per current point`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3J`.
- Result:
  - Parameter projection now reads by selected/current test point via `ReadBundle(selectedTestPointId)`.
  - Stratification projection can also be read by selected/current test point for parameter source layers.
  - Runtime ParameterScheme projection keeps method catalog/slot templates but replaces point context, source layer schemes, parameter series, and layer statistics with current-point data.
  - Parameter `PointContextMatch` is now required to be `True` in UIA checks.
  - Runtime ParameterSeries display points are sampled to avoid Canvas/UIA overload while layer statistics still use full snapshot rows.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_180347.png`.
- Next active slice candidate: `GMW-P3K: dynamic parameter projection performance and current-point regression`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3I Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3I: result-consumption point-context verification`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3I`.
- Result:
  - Stratification preview/run tokens now expose current point id/name, projection point id, and `PointContextMatch=True`.
  - Parameter preview/run tokens now expose current point id/name, projection point id/name, `PointContextChecked=True`, and `PointContextMatch=<bool>`.
  - Ready Phi, Gamma blocked/missing runner, and OCR blocked paths are verified with point-context fields.
  - Actual current parameter evidence now surfaces the real mismatch: `CurrentPointId=default-yingkou-cpt19`, `ProjectionPointId=CPT09`, `PointContextMatch=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_174545.png`.
- Next active slice candidate: `GMW-P3J: parameter scheme projection per current point`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3H Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3H: method-run explanation cleanup`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3H`.
- Result:
  - Visible method preview/run labels are now compact and result-first.
  - Stratification preview/run labels use short `PREVIEW` / `RUN` forms while UIA retains provenance and blocking details.
  - Parameter preview/run labels use short parameter/input/layer status forms while UIA retains source, slot, blocking, and write-boundary details.
  - Run visual tokens expose `VisibleSummaryMode=Compact`.
  - Parameter UIA now explicitly selects `PhiDeg` before Phi assertions so verification does not depend on previous manual UI state.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_173255.png`.
- Next active slice candidate: `GMW-P3I: result-consumption acceptance cleanup and current-point generalization check`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no new method package.

## Current Override - 2026-06-30 GMW-P3G Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3G: result provenance and blocking explanation`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3G`.
- Result:
  - Stratification run summary now exposes source type, method id, layer count, boundary count, coverage status, and trial/official parameter readiness.
  - Current stratification evidence is from `current-interpretation-result / CPTU-RW-Ic-FirstPass`, with `262` layers and `263` boundaries.
  - Parameter run summary now exposes parameter scheme, source LayerScheme, input state, layer state, target layer count, target groups, blocking detail, and trial readiness.
  - Phi run path proves `InputState=Ok`, `LayerState=Ok`, `TargetLayerCount=1`, and `CanRunTrial=True`.
  - Gamma blocked path proves `InputState=Missing`, `LayerState=Partial`, `BlockingDetail=Missing project unit-weight rule.`, and `CanRunTrial=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_172212.png`.
- Next active slice candidate: `GMW-P3H: method-run explanation cleanup`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Current Override - 2026-06-30 GMW-P3F Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3F: run-result selection/list synchronization`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3F`.
- Result:
  - Stratification run summary now proves scheme/list/object sync with `SelectionSync=True`, `SchemeListSynced=True`, and `SelectedId=scheme-current-ic-sbt`.
  - Stratification selected-object token is verified immediately after run preview.
  - Parameter method candidate list is now single-select and auto-selects the current slot's `SelectedMethodId`.
  - Parameter run summary proves `SelectedSlot`, `SelectedMethodId`, `SlotListSynced`, `CapabilitySlotSynced`, and `CandidateListSynced`.
  - Gamma blocked flow also keeps slot/candidate sync visible with the blocking reason.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_171154.png`.
- Next active slice candidate: `GMW-P3G: result provenance and blocking explanation`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Current Override - 2026-06-30 GMW-P3E Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3E: method-run visual readability enhancement`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3E`.
- Result:
  - Stratification run preview now writes a visible result summary onto `LayerTrackCanvas`.
  - Parameter run preview now writes a visible result/blocking summary onto `ParameterCanvas`.
  - UIA exposes `StratificationRunVisualSummary=True` and `ParameterRunVisualSummary=True`.
  - `PhiDeg` proves `VisualState=Refreshed`; `Gamma` proves `VisualState=Blocked` with the blocking reason.
  - Boundaries remain `CanRunOfficial=False`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_170037.png`.
- Next active slice candidate: `GMW-P3F: run-result selection/list synchronization`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Current Override - 2026-06-30 GMW-P3D Closure

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3D: current-point method run preview entry and result refresh`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P3D`.
- Result:
  - Stratification and parameter method capability panels now expose `Run preview` entries.
  - Ready current-point methods refresh the visible preview and publish run tokens with `PreviewRefreshed=True`.
  - Blocked methods publish blocked/run-missing tokens and do not fabricate results.
  - Boundaries remain `CanRunOfficial=False`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_164620.png`.
- Next active slice candidate: `GMW-P3E: method-run visual readability enhancement`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Current Override - 2026-06-30 GMW-P3D

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P3D：当前点位方法运行入口与结果刷新`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P2F：参数常规方法当前点位预览`.
- Result:
  - Parameter method capability selection now exposes a current-point preview token.
  - `PhiDeg` previews real current parameter curve data with `CanPreview=True` and `PreviewMode=PhiCurve`.
  - `Gamma` and `OCR` remain blocked with explicit reasons; no fake curves are produced.
  - Boundaries remain `CanRunOfficial=False`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_163649.png`.
- Next active slice: `GMW-P3D：当前点位方法运行入口与结果刷新`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P2F

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P2F：参数常规方法当前点位预览`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P1I：地层常规方法 catalog 当前点位预览`.
- Result:
  - Stratification `METHOD CAPABILITIES` rows are now selectable.
  - Selecting `builtin-ic-sbt.LayerScheme` opens the current point `scheme-current-ic-sbt` preview.
  - Method preview token exposes `StratificationMethodResultPreview=True`, selected capability/method, preview mode, selected scheme, and protected output boundary.
  - Boundaries remain `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_162935.png`.
- Closed follow-up: `GMW-P2F`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P1H-hotfix

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P1H-hotfix：地层常规方法可见性与结果导向修正`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P1H-hotfix：地层常规方法可见性与结果导向修正`.
- Result:
  - The registry already contains 13 methods / 20 capabilities; stratification has 5 `LayerScheme` and 5 `ClassificationEvidence` capabilities.
  - The real issue was UI compression: the stratification page displayed only two aggregate capability rows, making common methods look absent.
  - Stratification `METHOD CAPABILITIES` now lists real capability rows with output object, state, method name/use level/install state, and inputs.
  - UIA exposes `VisibleCapabilityRows=10`, `LayerScheme=5`, `ClassificationEvidence=5`, and `PycptLayerScheme=1`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_161959.png`.
- Closed follow-up: `GMW-P1I`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P6B / F12-E

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P6B / F12-E：Draft Scheme 采纳干跑包与审阅记录`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P6A / F12-D：Draft Scheme 对比表与采纳条件合同`.
- Result:
  - Draft Scheme detail now exposes a read-only compare/adopt contract.
  - Contract fields include compare target, baseline summary, draft summary, difference summary, blocker count, required review steps, and adopt readiness.
  - UIA exposes `CompareContract=True`, `AdoptConditionContract=True`, `RequiredReviewSteps=`, `AdoptReady=False`, and `AdoptReadiness=Blocked`.
  - Boundaries remain `CanWriteDraft=False`, `CanAdopt=False`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest draft files:
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_155841389_LayerSchemeDraft_20260630_155841374_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json`
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_155847652_ParameterSchemeDraft_20260630_155847644_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json`
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_155959.png`.
- Closed as historical context; user redirected current work to result-first method visibility.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P6A / F12-D

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P6A / F12-D：Draft Scheme 对比表与采纳条件合同`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P5Z / F12-C：Draft Scheme 差异摘要与采纳前置复核`.
- Result:
  - Draft Scheme detail now exposes stable review fields for object type, source package, candidate, method, output object type, baseline, difference, severity, blockers, JSON path, and Markdown path.
  - Stratification and parameter pages use the same read-only review field structure.
  - UIA exposes `DetailFields=True`, `DifferenceSummary=True`, `PreflightChecklist=True`, `BaselineDifference=`, `BlockerCount=`, `JsonPath=`, and `MarkdownPath=`.
  - Boundaries remain `CanWriteDraft=False`, `CanAdopt=False`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest draft files:
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_154609427_LayerSchemeDraft_20260630_154609413_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json`
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_154615649_ParameterSchemeDraft_20260630_154615641_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json`
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_154907.png`.
- Next active slice: `GMW-P6A / F12-D：Draft Scheme 对比表与采纳条件合同`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P5Z / F12-C

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P5Z / F12-C：Draft Scheme 差异摘要与采纳前置复核`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P5Y / F12-B：Draft Scheme 列表与打开复核`.
- Result:
  - Added a Draft Scheme index reader over `app_data/method_lab/draft_scheme/*.json`.
  - Stratification page now lists recent `LayerSchemeDraft` previews.
  - Parameter page now lists recent `ParameterSchemeDraft` previews.
  - Selecting a draft shows source package, candidate, method, difference, blockers, and JSON/Markdown paths.
  - UIA exposes `DraftSchemeList=True`, `ReviewOpen=True`, `CanAdopt=False`, `ReadOnlyDraftPreview`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Latest draft files:
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_153129124_LayerSchemeDraft_20260630_153129111_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json`
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_153135368_ParameterSchemeDraft_20260630_153135360_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json`
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_153315.png`.
- Next active slice: `GMW-P5Z / F12-C：Draft Scheme 差异摘要与采纳前置复核`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P5Y / F12-B

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P5Y / F12-B：Draft Scheme 列表与打开复核`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed slice: `GMW-P5X / F12-A：Draft Scheme 文件合同与只读模拟保存`.
- Result:
  - Draft/Review package generation now also creates read-only Draft Scheme preview files.
  - Stratification route creates `LayerSchemeDraft`.
  - Parameter route creates `ParameterSchemeDraft`.
  - Draft previews record source package, candidate, baseline difference, blockers, JSON path, and Markdown path.
  - UI tokens expose `DraftSchemePreview=True`, `CanWriteDraft=False`, `CanAdopt=False`, and `ReadOnlyDraftPreview`.
- Latest draft files:
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_151525029_LayerSchemeDraft_20260630_151525018_stratification_methodlab-input-cpt09-run-1_ClassificationEvidence.json`
  - `D:\CPT-UIQA\app_data\method_lab\draft_scheme\20260630_151531058_ParameterSchemeDraft_20260630_151531051_parameters_methodlab-fixture-input-yingkou-cpt09_ParameterSeries.json`
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_151552.png`.
- Next active slice: `GMW-P5Y / F12-B：Draft Scheme 列表与打开复核`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write.

## Previous Override - 2026-06-30 GMW-P5X / F12-A

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P5X / F12-A：Draft Scheme 文件合同与只读模拟保存` (closed)
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Latest completed before this slice: `GMW-P2E-c：参数页常规方法 catalog 可见性补齐`.
- Result:
  - Parameter method visibility is now result-first and slot-first.
  - The method registry now exposes common catalog templates for `φ'`, `Su`, `γ`, and `OCR`.
  - These catalog entries are visible but not faked as runnable results.
  - Gamma/OCR remain blocked with explicit reasons.
- Latest token: `ParameterMethodCapabilities=True;CommonParameterCatalog=True;ParameterCatalogTemplates=4;PhiDeg=3;PhiDegReady=2;SuKpa=3;SuKpaReady=2;Gamma=2;GammaReady=0;OCR=2;OCRReady=0;CanRunOfficial=False;OfficialWrite=False;Adopted=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\physical_screen_1920x1080_20260630_144538.png`.
- Closed follow-up: `GMW-P5X / F12-A`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no fake runnable methods.

## Previous Override - 2026-06-30 GMW-P2E

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P2E-b：参数页运行/预览边界与槽位详情联动` (closed)
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Current diagnosis:
  - The UI previously showed only a few methods because the registry contained a small validation set, not a complete engineering method catalog.
  - Groundhog and pyCPT are implementation sources/adapters; they must not dominate the product information architecture.
  - The main result consumers are `地层分层` and `参数解译`, not `方法实验室`.
- Active plan now focuses on result objects: `LayerScheme`, `ClassificationEvidence`, `ParameterScheme`, and `ParameterSeries`.
- `GMW-P1G-a` result: Method Lab now exposes `ResultObjectCapabilities=True`; focused runtime verification passed with `METHOD_LAB_RESULT_OBJECT_CAPABILITIES=PASS`.
- `GMW-P1G-b` result: Stratification now exposes result-object method entries; focused runtime verification passed with `STRATIFICATION_METHOD_CAPABILITIES=PASS`.
- `GMW-P1H` result: Stratification registry/catalog now exposes common method entries and prevents templates from being counted as runnable ready.
- Latest stratification token: `CommonStratificationCatalog=True;LayerScheme=5;LayerSchemeReady=3;ClassificationEvidence=5;ClassificationEvidenceReady=4;ManualTemplate=1;UserDefinedTemplate=2;RobertsonEvidence=1`.
- `GMW-P2E-a` result: Parameter page now exposes `PARAMETER METHOD CAPABILITIES` by `LayerScheme -> parameter slot`, with `PhiDeg/SuKpa` ready and `Gamma/OCR` blocked rather than fake results.
- Latest parameter token: `ParameterMethodCapabilities=True;Route=parameters;LayerScheme=scheme-engineering-review;PhiDeg=2;PhiDegReady=2;SuKpa=2;SuKpaReady=2;Gamma=1;GammaReady=0;GammaState=Blocked;OCR=1;OCRReady=0;OCRState=Blocked;CanRunOfficial=False;OfficialWrite=False;Adopted=False`.
- Latest screenshot: `D:\CPT-UIQA\app_data\temp\ui-regression\desktop-fullscreen\desktop_fullscreen_20260630_142018.png`.
- Closed follow-up: `GMW-P2E-b` and `GMW-P2E-c`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no fake runnable methods.

## Current Override - 2026-06-30 GMW-P1G

- Active file: `process_logs/Process79.md`
- Active theme: `GMW-P1G：分层/参数方法可见性与结果导向入口`
- User direction: only look at results, keep the purpose clear, and avoid unrelated or low-efficiency work.
- Current diagnosis:
  - The UI shows only a few methods because the current registry only contains a small validation set, not a complete engineering method library.
  - Groundhog and pyCPT were used to validate external method plumbing; they must not dominate the product information architecture.
  - The main result consumers are `地层分层` and `参数解译`, not `方法实验室`.
- Active plan now focuses on result objects: `LayerScheme`, `ClassificationEvidence`, `ParameterScheme`, and `ParameterSeries`.
- `GMW-P1G-a` result: Method Lab now exposes `ResultObjectCapabilities=True`; focused runtime verification passed with `METHOD_LAB_RESULT_OBJECT_CAPABILITIES=PASS`.
- `GMW-P1G-b` result: Stratification now exposes aggregate `Generate LayerScheme` and `Classification evidence` entries; focused runtime verification passed with `STRATIFICATION_METHOD_CAPABILITIES=PASS`.
- Next active slice: `GMW-P2E：参数页面方法入口`.
- Boundary unchanged: no SQLite schema change, no formula change, no official/adopted/export write, no fake runnable methods.

## Current Active Process Log

- Active file: `process_logs/Process78.md`
- Resolved active theme: `GMW-P5W: Draft to Adopted preflight contract` (closed)
- Authoritative active theme: `GMW-P5R：候选扫描排序/过滤` (closed)
- Authoritative detailed design: `plan.md`
- Reference method-workflow plan: `docs/method-workflow-generalization-plan.md`
- Active design rule: current UI work still follows `docs/ux-v5-vscode-like-workbench-contract.md`; method-workflow planning follows `docs/method-workflow-generalization-plan.md`.
- Historical UX-V2/UX-V3/UX-V4 UI directions, custom palettes, completed Method Lab R0-R4c details, GMW-P0 through GMW-P5W details, and older output-page work are archives unless the user explicitly resumes them.

## Latest Index Update - 2026-06-30 GMW-P5W Closure

- `GMW-P5W` is closed.
- Draft/Review package details now expose a read-only Draft -> Adopted preflight contract.
- Stratification and parameter pages both show `ADOPT PREFLIGHT`.
- Token evidence includes `AdoptPreflight=True`, `CanWriteDraft=False`, `CanAdopt=False`, and blockers:
  - `DraftPersistenceNotImplemented`
  - `ManualReviewRequired`
  - `OfficialWriteDisabled`
  - `ExportDisabled`
  - `ResearchOnly`
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_ADOPT_PREFLIGHT=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: Draft Scheme file contract and read-only simulated save.

## Latest Index Update - 2026-06-30 GMW-P5V Closure

- `GMW-P5V` is closed.
- Draft/Review review details are now grouped into SOURCE / DIFFERENCE / REVIEW / PATH.
- Stratification and parameter pages both use grouped detail panels.
- UIA token evidence includes `FieldGroups=True`, `GroupSource=True`, `GroupDifference=True`, `GroupReview=True`, and `GroupPath=True`.
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_FIELD_GROUPS=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: Draft -> Adopted preflight contract.

## Latest Index Update - 2026-06-30 GMW-P5U Closure

- `GMW-P5U` is closed.
- Draft/Review package review details now expand beyond a one-line summary.
- The index service reads `CountLine`, `StateLine`, `CompareLine`, `TrialLine`, `AdoptionPreflightLine`, `BaselineLine`, and derived `MarkdownPath`.
- Stratification and parameter pages both display multi-line review details.
- UIA detail token includes `DetailExpanded=True`, method/source/count/state/baseline/difference/scan/preflight/path fields, and the protected boundary.
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_DETAIL_EXPANDED=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: field grouping and readability optimization for Draft/Review package details.

## Latest Index Update - 2026-06-30 GMW-P5T Closure

- `GMW-P5T` is closed.
- Target workflow pages now read recent Draft/Review package JSON files back from `app_data/method_lab/draft_review/`.
- Stratification and parameter pages both show a compact recent package list and selected package review summary.
- Generating a new package refreshes the list and opens the latest review summary.
- Package list token evidence includes `DraftReviewPackageList`, `ReviewOpen=True`, `DraftStatus=ReviewRequired`, `ReviewRequired=True`, `OfficialWrite=False`, `Adopted=False`, and `Export=False`.
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE_LIST=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
- Candidate list visibility after layout adjustment:
  - `RESEARCH_CANDIDATE_STRATIFICATION_BOUNDS=269x119`
  - `RESEARCH_CANDIDATE_PARAMETER_BOUNDS=253x145`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: Draft/Review package detail expansion and difference reading.

## Latest Index Update - 2026-06-30 GMW-P5S Closure

- `GMW-P5S` is closed.
- Protected Draft/Review entries now generate real review packages under `app_data/method_lab/draft_review/`.
- Stratification and parameter candidates both write JSON/Markdown package artifacts.
- Package token evidence includes `DraftReviewPackage=True`, `PackageWritten=True`, `PackagePath=...`, `OfficialWrite=False`, and `Adopted=False`.
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_PACKAGE=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: Draft/Review package list and open-review UI in the target workflows.

## Latest Index Update - 2026-06-30 GMW-P5R Closure

- `GMW-P5R` is closed.
- Target research candidates now expose scan order:
  - `CandidateScanOrder=True`
  - `RunnableFirst=True`
  - `Sort=SeverityMagnitude`
  - `TopCandidate`, `TopSeverity`, `TopMagnitude`
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_SCAN_ORDER=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: real Draft persistence contract or explicit compare-mode controls.

## Latest Index Update - 2026-06-30 GMW-P5Q Closure

- `GMW-P5Q` is closed.
- Target workbench research candidates now expose protected Draft/Review preview entries:
  - stratification entry: `ProtectedDraftReviewEntry`, `DraftReady=True`, `ReviewRequired=True`, `PreviewGenerated=True`, `OfficialWrite=False`, `Adopted=False`.
  - parameter entry: `ProtectedDraftReviewEntry`, `DraftReady=True`, `ReviewRequired=True`, `PreviewGenerated=True`, `OfficialWrite=False`, `Adopted=False`.
- Verification passed:
  - build `0 warning / 0 error`
  - `RESEARCH_CANDIDATE_DRAFT_REVIEW_ENTRY=PASS`
  - `RESEARCH_CANDIDATE_CONSUMPTION_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Note: UIA scripts that drive the same desktop window must run serially.
- Next candidate: real Draft persistence contract or cross-candidate sorting/filtering.

## Latest Index Update - 2026-06-30 GMW-P5P Closure

- `GMW-P5P` is closed.
- Target workbench research candidate lists now act as cross-candidate difference tables:
  - stratification table: `Rows=24`, `Large=24`, `Review=0`, `Same=0`.
  - parameter table: `Rows=24`, `Large=15`, `Review=9`, `Same=0`.
- Verification passed:
  - build `0 warning / 0 error`
  - `CROSS_CANDIDATE_DIFFERENCE_TABLE=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: protected Draft/Review adoption chain or cross-candidate sorting/filtering.

## Latest Index Update - 2026-06-30 GMW-P5O Closure

- `GMW-P5O` is closed.
- Target workbench candidate panels now include compact selected-candidate difference detail tables:
  - stratification detail: candidate `layers=44`, baseline `layers=253`, `Difference=-209`, `Severity=Large`.
  - parameter detail: candidate `channels=13`, baseline `channels=2`, `Difference=+11`, `Severity=Large`.
- Verification passed:
  - build `0 warning / 0 error`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `CANDIDATE_DIFFERENCE_DETAIL_TABLE=PASS`
  - `STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: cross-candidate difference table or protected Draft/Review adoption chain.

## Latest Index Update - 2026-06-30 GMW-P5N Closure

- `GMW-P5N` is closed.
- Target workbench overlays are now linked to selected research candidates:
  - stratification page defaults to a pyCPT layer/classification candidate and highlights the pyCPT layer overlay.
  - parameter page defaults to a Groundhog `ParameterSeries` candidate and highlights the Groundhog phi/Su overlay.
- Verification passed:
  - build `0 warning / 0 error`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_SELECTION_LINK=PASS`
  - `STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: formal candidate difference detail table or protected Draft/Review adoption chain.

## Latest Index Update - 2026-06-30 GMW-P5M Closure

- `GMW-P5M` is closed.
- Target workbenches now show method result overlays:
  - stratification page `LayerTrackCanvas` overlays pyCPT Experimental layer candidates.
  - parameter page `ParameterCanvas` exposes Groundhog Reference phi/Su overlay counts.
- Verification passed:
  - build `0 warning / 0 error`
  - `METHOD_LAB_EVIDENCE_VIEWER_RUNTIME_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_CHECK=PASS`
  - `TARGET_RESULT_OVERLAY_STRATIFICATION_PYCPT_LAYERS=44`
  - `TARGET_RESULT_OVERLAY_PARAMETER_GROUNDHOG_PHI=3879`
  - `TARGET_RESULT_OVERLAY_PARAMETER_GROUNDHOG_SU=3879`
  - `STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: selected candidate to overlay highlight/linkage, formal difference table, or protected Draft/Review adoption chain.

## Latest Index Update - 2026-06-30 GMW-P5L Closure

- `GMW-P5L` is closed.
- Research candidates now expose baseline difference summaries in target pages:
  - stratification candidate token includes `Difference=-209 vs current layers;Severity=Large`
  - parameter candidate token includes `Difference=-1 vs current channels;Severity=Review`
- Visible UI uses short result summaries; full validation tokens remain in UIA names to avoid redundant long text breaking layout.
- Verification passed:
  - build `0 warning / 0 error`
  - `METHOD_LAB_RESEARCH_CANDIDATE_DIFF=PASS`
  - `RESEARCH_CANDIDATE_DIFF_VISIBLE=PASS`
  - `STRATIFICATION_WORKBENCH_CONTRACT_CHECK=PASS`
  - `PARAMETER_SCHEME_WORKBENCH_STATIC_CHECK=PASS`
- Boundary unchanged: no SQLite schema change, no official/adopted/export write, no formula or algorithm change.
- Next candidate: visual overlay of candidate layer schemes and parameter series in the target workbenches.

## Durable Lessons

- The product goal for method integration is result consumption in the normal workflow, not method-name-specific pages.
- Default engineering pages should show current results, adoption/protection state, and compact differences first.
- Long machine-readable UIA tokens should be placed in `AutomationProperties.Name`; visible UI should use short summaries so lists and workbench panels remain readable.
- UIA scripts that control the same desktop app should run sequentially, not in parallel.
- Mobbin MCP is allowed only as a Figma/design reference flow for UI pattern research and review evidence; it must not become a WinUI runtime dependency or override the VSCode-like workbench contract.
