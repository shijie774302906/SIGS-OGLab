# Web Prototype Process Index

This file is the lightweight process index for `D:\CPT-UIQA-WebPrototype`.

Keep detailed notes in `process_logs/`.

## Current - 2026-07-10 Data Import First Look Hierarchy

- Active file: `process_logs/Process051.md`
- Active theme: `data import page first visual anchor and hierarchy`
- Current active slice: `数据导入页 First Look 信息层级`
- Status: `closed / implemented / verified`
- Result:
  - Added `import-first-look` above the import metrics and detail panels.
  - Added empty, ready, issue, and stale First Look states.
  - Moved the central `run-data-check` primary action into First Look for ready/stale states.
  - Added First Look upload action for empty/issue states.
  - Moved template action anchors to First Look and renamed lower detail anchors.
  - Demoted the import metrics row to secondary summary.
  - Updated the import right inspector heading to `导入动作`.
  - Demoted `dock-run-data-check` from primary to normal tool button.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 6 tests.
  - Browser screenshot check passed with one primary action per import state, console errors `0`, page errors `0`.
- Evidence:
  - `process_logs/playwright-mcp/import-first-look-hierarchy/browser-check.json`
  - `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-empty-1440x900.png`
  - `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-ready-1440x900.png`
  - `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-issue-1440x900.png`
  - `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-stale-1440x900.png`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - No CSV parsing behavior or Excel parser behavior was changed.
- Next:
  - Review the second-page screenshots, then apply the same First Look rule to `数据检查` if accepted.

## Previous - 2026-07-10 Right Inspector Collapse And Data Import Hierarchy Plan

- Active file: `process_logs/Process050.md`
- Active theme: `right inspector collapse, hidden Flow metadata, and data import hierarchy plan`
- Current active slice: `右侧检查器收起与数据导入页层级计划`
- Status: `closed / implemented / verified / next plan documented`
- Result:
  - Added a default-open right inspector that can be collapsed and reopened.
  - Added a narrow `检查器` rail control for the collapsed state.
  - Removed the visible top Flow banner from the page hierarchy while preserving it as hidden metadata/test anchor.
  - Updated Playwright to verify inspector collapse/reopen.
  - Updated hidden Flow seed extraction to use `textContent`.
  - Rewrote `plan.md` as the planned `数据导入页 First Look 信息层级` slice.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 6 tests.
  - Browser check passed with Flow visible `false`, inspector state `open -> collapsed -> open`, console errors `0`, page errors `0`.
- Evidence:
  - `process_logs/playwright-mcp/right-inspector-flow-cleanup/browser-check.json`
  - `process_logs/playwright-mcp/right-inspector-flow-cleanup/right-inspector-open-1440x900.png`
  - `process_logs/playwright-mcp/right-inspector-flow-cleanup/right-inspector-collapsed-1440x900.png`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - No `数据导入` behavior was implemented yet.
- Next:
  - Implement the planned `数据导入` First Look hierarchy from `plan.md`.

## Previous - 2026-07-10 Project Page First Look Hierarchy

- Active file: `process_logs/Process049.md`
- Active theme: `project page first visual anchor and hierarchy`
- Current active slice: `项目首页 First Look 信息层级`
- Status: `closed / implemented / verified`
- Result:
  - Added a `project-first-look` task band above metrics and tables.
  - Added a `project-first-flow` workflow strip for `项目创建 -> 数据导入 -> 数据检查 -> 地层分层`.
  - Removed the duplicate header primary button so the page has exactly one strongest primary action.
  - Added ready-data and empty-project first-look states.
  - Demoted metrics and point tables into secondary/detail layers.
  - Added responsive behavior for the first-look band and flow strip.
  - Updated Playwright assertions for first-look hierarchy and empty-project state.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 6 tests.
  - Browser screenshot check passed with console errors `0` and page errors `0`.
- Evidence:
  - `process_logs/playwright-mcp/project-first-look-hierarchy/project-first-look-ready-1440x900.png`
  - `process_logs/playwright-mcp/project-first-look-hierarchy/project-first-look-empty-1440x900.png`
  - `process_logs/playwright-mcp/project-first-look-hierarchy/browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - No data import or data check behavior was changed.
- Next:
  - Review whether this `First Look` rule should become a shared hierarchy pattern for `数据导入` and `数据检查`.

## Previous - 2026-07-10 Data Check Quality Gate And Problem Handling

- Active file: `process_logs/Process048.md`
- Active theme: `data check quality gate, issue filtering, evidence, and rerun history`
- Current active slice: `数据检查质量门与问题处置`
- Status: `closed / implemented / verified`
- Result:
  - Added `docs/prototype/数据检查事件合同.md` with CHK-E01 to CHK-E10.
  - Rewrote and closed `plan.md` for the data-check slice.
  - Added explicit check states: `未检查`, `无问题`, `仅提示`, `存在问题`, and `需重新检查`.
  - Added per-project check run history and selected check filter state.
  - Added center-page and right-dock filters for `全部 / 存在问题 / 仅提示 / 通过`.
  - Added check scope, evidence rows, check history, rerun actions, and version-bound continuation gate.
  - Fixed empty-filter behavior so hidden old check details are not shown.
  - Updated Playwright to cover a random human-like data-check quality-gate flow.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 6 tests.
- Evidence:
  - `process_logs/playwright-mcp/data-check-quality-gate/flow-run.json`
  - `process_logs/playwright-mcp/data-check-quality-gate/check-not-run-1440x900.png`
  - `process_logs/playwright-mcp/data-check-quality-gate/check-notice-evidence-1440x900.png`
  - `process_logs/playwright-mcp/data-check-quality-gate/check-rerun-history-1440x900.png`
- Dev server:
  - `http://127.0.0.1:5174/`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - Check history is browser prototype state only.
- Next:
  - Add a true check-stage `存在问题` sample that is not already blocked by import, or move to `地层分层` with the same event-contract method.

## Previous - 2026-07-09 Project Lifecycle And Project Hub

- Active file: `process_logs/Process047.md`
- Active theme: `project collection, create/open/switch/rename/delete, and independent workflow state`
- Current active slice: `新建项目与项目集合`
- Status: `closed / implemented / verified`
- Result:
  - Added `docs/prototype/新建项目与项目集合事件合同.md` with PRJ-E01 to PRJ-E12.
  - Rewrote `plan.md` for the project lifecycle slice.
  - Added a default project hub at the root path with empty state, new project validation, project list, open, rename validation, and delete.
  - Added `ProjectWorkspace` so each project owns independent workflow state.
  - Kept existing Flow 1 tests compatible by auto-opening a demo project for `flow`, `case=random`, or `seed` URLs.
  - Added left-rail project switching and a return-to-project-hub action.
  - New user projects now open into the fixed six-page workflow with no CPT/CPTU data yet.
- Verification:
  - `npm.cmd run test:e2e` passed: 5 tests.
  - `npm.cmd run build` passed.
- Evidence:
  - `process_logs/playwright-mcp/project-lifecycle/flow-run.json`
  - `process_logs/playwright-mcp/project-lifecycle/project-hub-empty-1440x900.png`
  - `process_logs/playwright-mcp/project-lifecycle/project-renamed-workflow-1440x900.png`
  - `process_logs/playwright-mcp/project-lifecycle/project-hub-after-delete-1440x900.png`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - Project collection is browser state only.
- Next:
  - Decide whether project data should persist to localStorage.
  - Refine `项目/点位数据` as the current project's CPT/CPTU data situation overview.

## Previous - 2026-07-09 Data Import Exception Contract And Template P0

- Active file: `process_logs/Process046.md`
- Active theme: `data import exception contract, template actions, and P0 recovery flow`
- Current active slice: `数据导入异常与模板 P0`
- Status: `closed / implemented / verified`
- Result:
  - Upgraded `docs/prototype/数据导入异常与模板合同.md` into an active implementation contract.
  - Rewrote `plan.md` for the data import exception/template slice.
  - Added template actions: blank template download, example template download, and standard header copy.
  - Extended import draft state with problem lists, draft versions, point decision state, and file point names.
  - Preserved headers/raw preview for missing-field CSVs and surfaced required-field problems in the page.
  - Added visible handling for Excel pending parser, unsupported files, missing required fields, non-numeric values, non-increasing depth, depth exceeding final depth, and point mismatch.
  - Added point mismatch recovery actions and stale-check handling after a new import draft is uploaded.
  - Added Playwright coverage for template and exception flows using generated files.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 4 tests.
- Evidence:
  - `process_logs/playwright-mcp/flow-1-import-exceptions/flow-run.json`
  - `process_logs/playwright-mcp/flow-1-import-exceptions/missing-depth-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-import-exceptions/nonmonotonic-depth-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-import-exceptions/point-mismatch-resolved-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-import-stale-check/flow-run.json`
  - `process_logs/playwright-mcp/flow-1-import-stale-check/import-needs-recheck-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-import-stale-check/check-stale-1440x900.png`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - Excel parsing, production import, multi-point splitting, and formal export remain out of scope.
- Next:
  - Decide whether to implement P1 unit confirmation, field remapping UI, or multi-point split strategy next.

## Previous - 2026-07-09 First Three Pages Upload Action Flow

- Active file: `process_logs/Process045.md`
- Active theme: `user-action-driven first three pages with generated CSV upload`
- Current active slice: `前三页用户动作驱动实现`
- Status: `closed / implemented / verified`
- Result:
  - Added an app-level import draft object shared by `项目/点位数据`, `数据导入`, and `数据检查`.
  - Added browser-side CSV upload parsing without adding dependencies.
  - Kept Excel as an explicit selected-but-needs-parser state instead of pretending it is parsed.
  - Reworked `数据导入` around upload, import draft, field mapping, raw header preview, normalized preview, and `用于数据检查`.
  - Reworked `数据检查` so checks are generated from the active import draft and selected issues can return to import focused on the relevant field.
  - Reworked the right side as action-oriented docks for point tools, field selection, data check, issue return, and continuing to stratification.
  - Updated Playwright to generate a random CSV, upload it through the UI, verify mapping/preview/check/return, and write evidence.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Latest evidence records generated input file, parsed row count, selected issue, final route, console/page errors, and overflow count.
- Evidence:
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-run.json`
  - `process_logs/playwright-mcp/flow-1-upload-action/input/AUTO-CPTU-57529-upload-77057529.csv`
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-1-project-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-1-import-uploaded-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-1-check-selected-issue-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-1-return-import-waterdepth-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-upload-action/flow-1-stratification-1920x1080.png`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - CSV parsing is browser prototype logic only; Excel parsing is not implemented.
- Next:
  - Decide whether to broaden upload scenarios: missing required field, non-increasing depth, depth exceeds final depth, Excel parser dependency, or multiple point files.

## Previous - 2026-07-09 Flow 1 Random CPTU Implementation

- Active file: `process_logs/Process044.md`
- Active theme: `seed-driven random CPTU Flow 1 implementation and Playwright acceptance`
- Current active slice: `Flow 1 - 随机 CPTU 数据准备到数据检查闭环`
- Status: `closed / implemented / verified`
- Result:
  - Added seed-driven random CPTU data generation.
  - Reworked `项目/点位数据`, `数据导入`, and `数据检查` around Flow 1 modules.
  - Added visible Flow labels, step labels, handoff labels, and stable Playwright anchors.
  - Reframed the right side as page-specific functional docks for point tools, import readiness, and issue location/recommendation.
  - Updated Playwright to run a random human-flow case and write `flow-run.json` plus screenshots.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Flow evidence records seed, random point, clicked issue, final route, console/page errors, and overflow count.
- Evidence:
  - `process_logs/playwright-mcp/flow-1-random-case/flow-run.json`
  - `process_logs/playwright-mcp/flow-1-random-case/flow-1-project-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-random-case/flow-1-import-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-random-case/flow-1-check-selected-issue-1440x900.png`
  - `process_logs/playwright-mcp/flow-1-random-case/flow-1-check-selected-issue-1920x1080.png`
- Boundary:
  - No UI persistence, real import parsing, real repair, official formula, or formal output was implemented.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Next:
  - Review screenshots and decide the next Flow slice.

## Previous - 2026-07-09 Flow 1 Functional Research And Random Case Acceptance

- Active file: `process_logs/Process043.md`
- Active theme: `Flow 1 feature modules, random synthetic case, and Playwright acceptance evidence`
- Current active slice: `Flow 1 - 随机 CPTU 数据准备到数据检查闭环`
- Status: `closed / documented`
- Result:
  - Read the relevant planning and handoff files in `D:\CPT-UIQA` without modifying the desktop repo.
  - Created `docs/prototype/flow-1-functional-research-random-case-2026-07-09.md`.
  - Reframed Flow 1 away from fixed Yingkou/CPT09 data and toward seed-driven random synthetic CPTU data.
  - Defined page modules, right functional dock roles, flow handoff objects, current prototype gaps, and acceptance evidence.
- Boundary:
  - Documentation-only update.
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Next:
  - Confirm whether the first random scenario should be `valid-with-notice` before implementation.

## Previous - 2026-07-09 Flow 1 CPT09 Case Design

- Active file: `process_logs/Process042.md`
- Active theme: `Flow 1 case-driven data preparation to data check design`
- Current active slice: `Flow 1 - CPT09 数据准备到数据检查案例闭环`
- Status: `closed / documented`
- Result:
  - Created `docs/prototype/flow-1-cpt09-data-prep-check-design-2026-07-09.md`.
  - Defined Flow 1 as a case-driven product loop rather than a page existence test.
  - Covered case setup, page features, right functional dock responsibilities, visible labels, test labels, human operation path, and Playwright acceptance.
- Boundary:
  - Documentation-only update.
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Next:
  - Confirm the Flow 1 design before UI and Playwright implementation.

## Previous - 2026-07-09 Right Functional Dock Product Decision

- Active file: `process_logs/Process041.md`
- Active theme: `right side as page-specific functional dock`
- Current active slice: `Right Functional Dock Product Decision`
- Status: `closed / documented`
- Result:
  - Rejected the previous `Shared Right Panel Contract` direction.
  - Reframed the right side as a page-specific functional dock, not a fixed status checker.
  - Updated `plan.md` and `docs/prototype/five-feature-zones-functional-blueprint-2026-07-09.md`.
  - Defined the shared dock contract as behavioral, not content-uniform.
- Boundary:
  - Documentation-only decision update.
  - No UI implementation files were changed.
  - No desktop repo files were changed.
- Next:
  - Confirm and implement `Slice B - Right Functional Dock Contract`.

## Previous - 2026-07-09 Slice A IA And Wording Lock

- Active file: `process_logs/Process040.md`
- Active theme: `five-zone IA grouping and wording lock`
- Current active slice: `Slice A - IA And Wording Lock`
- Status: `closed / implemented / verified`
- Result:
  - Kept the current six workflow pages.
  - Grouped them visually and textually into five feature zones.
  - Put `项目/点位数据` and `数据导入` under `数据准备区` without merging pages.
  - Replaced old user-facing issue wording with `问题` language.
  - Reworked `成果输出区` around `成果清单`, `生成条件`, `待补全`, and `需确认`.
  - Updated E2E tests to assert five-zone navigation and retired wording.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Browser screenshot/text check passed with required terms present, retired terms absent, unexpected overflow `0`, console errors `0`, and page errors `0`.
- Evidence:
  - `process_logs/Process040.md`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-default-1440x900.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-default-1920x1080.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-output-1440x900.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-browser-check.json`
- Dev server:
  - `http://127.0.0.1:5174/`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
  - No new dependency was added.
- Next:
  - Recommended next slice: `Slice B - Right Functional Dock Contract`.

## Previous - 2026-07-09 Five Feature Zones Functional Blueprint

- Active file: `process_logs/Process039.md`
- Active theme: `five feature zones functional blueprint and agent review`
- Current active slice: `Five feature zones functional blueprint`
- Status: `closed / documented / agent reviewed`
- Result:
  - Created `docs/prototype/five-feature-zones-functional-blueprint-2026-07-09.md`.
  - Created `docs/prototype/five-feature-zones-agent-review-2026-07-09.md`.
  - Updated `plan.md` with the research output paths, review status, and integrated P1 wording changes.
  - Used Mobbin/Mixpanel references as interaction grammar only: left navigation, center result/evidence canvas, right inspection/view settings, short-choice popovers, and lightweight feedback.
  - Ran the three reusable read-only review agents and integrated their P1/P2 findings.
- Verification:
  - Read back edited documents with explicit UTF-8 handling.
  - Ran keyword scans for old issue wording, formal-output implication, and unwanted analytics terminology.
  - No build was run because this was documentation-only.
- Boundary:
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Next:
  - Start `Slice A - IA And Wording Lock` after confirmation.

## Previous - 2026-07-09 AGENTS Context Slimming

- Active file: `process_logs/Process038.md`
- Active theme: `AGENTS context slimming`
- Current active slice: `AGENTS rule-and-entry cleanup`
- Status: `closed / documented`
- Result:
  - Slimmed `AGENTS.md` into a short hard-rule and entry-point file.
  - Moved detailed product/UI guidance into `plan-total.md`.
  - Kept reusable review-agent specifics pointed to `agents/README.md`.
  - Added a memory note to keep `AGENTS.md` minimal.
  - Reset `plan.md` to the current documentation slice.
- Verification:
  - Read back edited files with explicit UTF-8 handling.
  - No build was run because this was documentation-only.
- Boundary:
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.

## Previous - 2026-07-09 Blue Purple Role Swap

- Active file: `process_logs/Process037.md`
- Active theme: `blue purple role swap`
- Current active slice: `Blue Purple Role Swap`
- Status: `closed / verified`
- Scope:
  - Swap current primary blue and purple roles.
  - Move current brown/olive warning/review/sand roles to light red.
  - Keep brown/olive available as a source palette token but unused by visible semantic roles.
- Result:
  - Primary/action/focus/chart emphasis now uses purple `#bdadff`.
  - Selected/secondary emphasis now uses blue `#35b0f5`.
  - Review/warning/sand and blocked attention now use light red `#fe92a1`.
  - Success/mixed-soil remains teal `#2abf9a`.
  - Existing workbench layout and density remain unchanged.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Browser checklist passed with `allPassed=true`.
  - Browser overflow count: `0`.
  - Console errors: `0`; page errors: `0`.
  - Token checks include `colorPrimary=#bdadff`, `colorSelectedAccent=#35b0f5`, `colorWarningAccent=#fe92a1`, and `oliveNotSemantic=true`.
- Evidence:
  - `process_logs/Process037.md`
  - `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-1440x900.png`
  - `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-1920x1080.png`
  - `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-interaction-1440x900.png`
  - `process_logs/playwright-mcp/blue-purple-role-swap/blue-purple-swap-browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency or component library was added.
  - No layout, workflow, data model, or copy rewrite was made.

## Previous - 2026-07-09 Palette Alignment Refresh

- Active file: `process_logs/Process036.md`
- Active theme: `palette alignment refresh`
- Current active slice: `Palette Alignment Refresh`
- Status: `closed / verified`
- Scope:
  - Recalibrate current UI colors around the agreed palette: `#35b0f5`, `#2abf9a`, `#beae58`, `#fe92a1`, `#bdadff`.
  - Keep the Mixpanel-like three-pane workbench layout and density unchanged.
  - Replace old purple accent leftovers in tokens, selected states, chart guides, soil colors, notices, and output status cards.
- Result:
  - Added named palette tokens and mapped them into primary/action, success, warning, danger, selected, chart, and soil-layer roles.
  - Main action uses blue; valid/success uses teal; review/warning and sand cues use olive; blocked/danger uses rose; selected emphasis uses lavender.
  - Added accessible derived text/ink shades for bright blue controls and small text.
  - Adjusted boundary markers and scatter x-axis labels to remove internal chart overflow.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Browser checklist passed with `allPassed=true`.
  - Browser overflow count: `0`.
  - Console errors: `0`; page errors: `0`.
  - Old purple accent hits: `[]`.
- Evidence:
  - `process_logs/Process036.md`
  - `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-1440x900.png`
  - `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-1920x1080.png`
  - `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-interaction-1440x900.png`
  - `process_logs/playwright-mcp/palette-alignment-refresh/palette-refresh-browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency or component library was added.
  - No layout, workflow, data model, or copy rewrite was made.

## Previous - 2026-07-09 Pre-Work Confirmation And Todo Rule

- Active file: `process_logs/Process035.md`
- Active theme: `pre-work confirmation and todo list rule`
- Current active slice: `AGENTS workflow rule update`
- Status: `closed / documented`
- Result:
  - Added a mandatory pre-work confirmation rule to `AGENTS.md`.
  - Required every task to start with a rough approach and a `[待办N] ...` todo list.
  - Required progress updates to convert completed items to `[完成N] ...`.
  - Added the reusable lesson to `memory.md`.
  - Reset `plan.md` to the current documentation slice.
- Verification:
  - Read back edited files with explicit UTF-8 handling.
  - No build was run because this was documentation-only.
- Boundary:
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.

## Previous - 2026-07-09 Strict Mixpanel Shell Refactor

- Active file: `process_logs/Process034.md`
- Active theme: `strict Mixpanel shell refactor`
- Current active slice: `Strict Mixpanel Shell Refactor`
- Status: `closed / verified`
- Scope:
  - Convert the UI shell to a Mixpanel-like three-pane report builder.
  - Remove default full-width top nav, editor tabs, and persistent bottom panel.
  - Add sidebar `+ 新建分析`, grouped nav, and right-panel `检查 / 图表 / 注释` tabs.
  - Recalibrate neutral/purple tokens and selected states.
  - Update E2E tests to enforce the new shell contract.
- Result:
  - Root grid is now full-height sidebar / center report canvas / right query-inspector.
  - Old `global-top-nav`, `editor-tabs`, and `bottom-panel` are no longer rendered by default.
  - Sidebar starts at `y=0`, includes `+ 新建分析`, and groups workflow nav into `Data`, `Analysis`, and `Output`.
  - Right panel has `检查 / 图表 / 注释`.
  - The stratification metric-row stretch bug at 1920px was fixed.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Browser checklist passed with `allPassed=true`.
  - Browser overflow count: `0`.
  - Console errors: `0`; page errors: `0`.
- Evidence:
  - `process_logs/Process034.md`
  - `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-1440x900.png`
  - `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-1920x1080.png`
  - `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-interaction-1440x900.png`
  - `process_logs/playwright-mcp/strict-mixpanel-shell-refactor/shell-refactor-browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency or component library was added.

## Previous - 2026-07-09 AGENTS Context Cleanup

- Active file: `process_logs/Process033.md`
- Active theme: `AGENTS, plan, plan-total, and memory cleanup`
- Current active slice: `AGENTS context cleanup`
- Status: `closed / documented`
- Result:
  - Rewrote `AGENTS.md` as a concise stable rule file.
  - Corrected the goal to a complete functional browser-based interpretation tool.
  - Made Mobbin/Mixpanel the primary UI target and demoted local desktop screenshots to workflow/domain references.
  - Defined always-active context: `AGENTS.md`, current `plan.md`, and `memory.md`.
  - Added `plan-total.md` for long-term product framework and `memory.md` for recurring lessons.
  - Reset `plan.md` so it records only the current active slice.
- Verification:
  - Read back edited files with explicit UTF-8 handling.
  - No build was run because this was documentation-only.
- Boundary:
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.

## Previous - 2026-07-09 Strict Mobbin Mixpanel Visual Audit

- Active file: `process_logs/Process032.md`
- Active theme: `strict Mobbin Mixpanel visual audit`
- Current active slice: `Strict audit and refactor-priority planning`
- Status: `closed / audit documented`
- Scope:
  - Write the confirmed strict Mixpanel visual-review prompt and workflow into `plan.md`.
  - Collect current UI evidence at `1440x900`, `1920x1080`, and an interaction state.
  - Re-check Mobbin connection and collect Mixpanel web screens/flows.
  - Produce a P0/P1/P2 visual audit and next implementation priority list.
- Result:
  - Created `docs/prototype/strict-mixpanel-visual-audit-2026-07-09.md`.
  - Confirmed current UI is functionally coherent but visually still a hybrid of VSCode-like workbench, enterprise admin, and Mixpanel-inspired report canvas.
  - Rated current Mixpanel closeness at `2.4 / 5`.
  - Identified structural shell mismatch as P0: full-width top nav, editor tab row, and permanent bottom panel.
- Evidence:
  - `process_logs/Process032.md`
  - `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1440x900.png`
  - `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1920x1080.png`
  - `process_logs/playwright-mcp/strict-mixpanel-audit/current-stratification-interaction-1440x900.png`
  - `process_logs/playwright-mcp/strict-mixpanel-audit/current-browser-check.json`
  - `process_logs/playwright-mcp/strict-mixpanel-audit/mobbin-mixpanel-references.json`
- Boundary:
  - Audit/documentation only.
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Await approval for `Strict Mixpanel Shell Refactor`.

## Previous - 2026-07-09 First Page Copy IA De-duplication

- Active file: `process_logs/Process030.md`
- Active theme: `first page copy IA de-duplication`
- Current active slice: `Web-P2 follow-up: copy IA cleanup`
- Status: `closed / verified`
- Scope:
  - Remove repetitive labels such as `下一步`, `当前页`, `后续条件`, and global prototype-boundary copy from shared chrome and the first page.
  - Keep top nav, left nav, page header, right inspector, and bottom panel responsibilities distinct.
  - Update Copy / IA agent rules so duplicate process labels are P1 hard-fails.
- Verification:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - Browser screenshot review passed at 1440x900.
  - Text check found `forbiddenHits=[]` and `overflowCount=0`.
- Evidence:
  - `process_logs/Process030.md`
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-1440x900-final.png`
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-text-check-final.json`
- Boundary:
  - No desktop repo files are changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior is touched.

## Previous - 2026-07-09 Web-P2 Slice 9 Completion Audit

- Active file: `process_logs/Process029.md`
- Active theme: `Web-P2 completion audit`
- Current active slice: `Web-P2 Slice 9: completion audit and goal closure evidence`
- Status: `closed / verified`
- Result:
  - Completed requirement-by-requirement audit against the active Codex goal.
  - Confirmed Yingkou CPTU sample data is the main case.
  - Confirmed Web-P2 Slice 1-9 implementation, verification, screenshots, agents, plan, and process logs are present.
  - Confirmed final agent rereviews have no P0/P1.
  - Confirmed no stop condition was crossed: no desktop repo modification, no desktop `app_data`, no SQLite schema, no official formulas, no formal export/persistence.
- Evidence:
  - `docs/prototype/web-p2-completion-audit-2026-07-09.md`
  - `docs/prototype/web-p2-slice8-agent-rereview-2026-07-09.md`
  - `process_logs/Process028.md`
  - `process_logs/Process029.md`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1920x1080.png`
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Web-P2 goal can be marked complete.

## Previous - 2026-07-09 Web-P2 Slice 8 Full Workflow QA

- Active file: `process_logs/Process028.md`
- Active theme: `Web-P2 full workflow QA and agent rereview`
- Current active slice: `Web-P2 Slice 8: cross-flow QA and three-agent rereview`
- Status: `closed / verified`
- Result:
  - Ran full workflow Playwright MCP route walkthrough.
  - Captured multi-view screenshots and browser-check JSON.
  - Ran reusable visual, geotechnical, and copy/IA agents.
  - Fixed all P0/P1 findings from agents and recorded remaining P2.
- Evidence:
  - `docs/prototype/web-p2-slice8-agent-rereview-2026-07-09.md`
  - `process_logs/Process028.md`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-initial-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-stratification-interaction-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice8-full-workflow/full-workflow-output-1920x1080.png`

## Previous - 2026-07-09 Web-P2 Slice 7 Output Page

- Active file: `process_logs/Process027.md`
- Active theme: `Web-P2 output page`
- Current active slice: `Web-P2 Slice 7: 成果输出 page`
- Status: `closed / verified`
- Result:
  - Replaced the `成果输出` placeholder with a usable output precheck page.
  - Added output checklist, preflight gate, selected-output details, route-specific output inspector, and structured bottom details.
  - Added `返回参数核对` transition.
  - Sanitized output fixture references into user-facing Chinese labels without exposing internal IDs.
  - Updated E2E regression to assert output page content, selected output item synchronization, and return transition.
  - Verified with Playwright MCP screenshot, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice7-output/output-page-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice7-output/output-page-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice7-output/output-page-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice7-output/output-page-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 8: full workflow QA and three reusable agents rereview.

## Previous - 2026-07-09 Web-P2 Slice 6 Parameters Page

- Active file: `process_logs/Process026.md`
- Active theme: `Web-P2 parameter interpretation page`
- Current active slice: `Web-P2 Slice 6: 参数解译 page`
- Status: `closed / verified`
- Result:
  - Replaced the `参数解译` placeholder with a usable parameter interpretation page.
  - Added parameter scheme list, trial candidate table, selected-parameter details, route-specific parameter inspector, and structured bottom details.
  - Added `查看成果预检` transition into output.
  - Translated parameter statuses, method IDs, warning reasons, and layer target IDs into user-facing Chinese.
  - Fixed Playwright MCP-found text overflows in the parameter scheme list and bottom detail.
  - Updated E2E regression to assert parameter page content, selected slot synchronization, and output transition.
  - Verified with Playwright MCP final screenshot, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice6-parameters/parameters-page-final-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice6-parameters/parameters-page-final-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice6-parameters/parameters-page-final-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice6-parameters/parameters-page-final-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 7: build the `成果输出` page from the adopted output package sample.

## Previous - 2026-07-09 Web-P2 Slice 5 Stratification Deepening

- Active file: `process_logs/Process025.md`
- Active theme: `Web-P2 stratification boundary interaction`
- Current active slice: `Web-P2 Slice 5: 地层分层 deepening`
- Status: `closed / verified`
- Result:
  - Added selectable review-boundary chips to the stratification document.
  - Added clickable boundary markers to the layer track.
  - Made bottom review items clickable and synchronized with the right inspector.
  - Added a current-boundary section to the stratification inspector.
  - Added lightweight SBTn schematic ticks while retaining non-official classifier copy.
  - Fixed a Playwright MCP-discovered stale right-inspector bug by adding `selectedBoundary` to the memo dependency list.
  - Updated E2E regression to assert precise boundary-panel updates.
  - Verified with Playwright MCP screenshots at 1440x900 and 1920x1080, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-1920x1080.png`
  - `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice5-stratification-boundary/stratification-boundary-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 6: build the `参数解译` page from the parameter scheme sample bundle.

## Previous - 2026-07-09 Web-P2 Slice 4 Data Check Page

- Active file: `process_logs/Process024.md`
- Active theme: `Web-P2 data check page`
- Current active slice: `Web-P2 Slice 4: 数据检查 page`
- Status: `closed / verified`
- Result:
  - Replaced the `数据检查` placeholder with a usable check page.
  - Added rule summary metrics, issue table, selected-issue detail, route-specific check inspector, and structured bottom details.
  - Added `进入地层分层` transition.
  - Updated E2E regression to assert check rules, selected issue synchronization, bottom details, and the transition into stratification.
  - Verified with Playwright MCP screenshot, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice4-check-page/check-page-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice4-check-page/check-page-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice4-check-page/check-page-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice4-check-page/check-page-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 5: deepen `地层分层` with boundary selection, SBTn ticks/scale treatment, boundary chips, and responsive fit.

## Previous - 2026-07-09 Web-P2 Slice 3 Import Page

- Active file: `process_logs/Process023.md`
- Active theme: `Web-P2 import page`
- Current active slice: `Web-P2 Slice 3: 数据导入 page`
- Status: `closed / verified`
- Result:
  - Replaced the `数据导入` placeholder with a usable import page.
  - Added field mapping table, preview table, source-vs-preview import notes, route-specific import inspector, and structured bottom details.
  - Added `进入数据检查` transition.
  - Updated E2E regression to assert import mapping, preview rows, bottom import details, and the transition into data check.
  - Fixed a 1440px metric overflow found by Playwright MCP.
  - Verified with Playwright MCP final screenshot, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice3-import-page/import-page-final-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice3-import-page/import-page-final-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice3-import-page/import-page-final-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice3-import-page/import-page-final-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 4: build the `数据检查` page with rule summary, issue table, issue inspector, and status gate into stratification.

## Previous - 2026-07-09 Web-P2 Slice 2 Project Point Page

- Active file: `process_logs/Process022.md`
- Active theme: `Web-P2 project/point page`
- Current active slice: `Web-P2 Slice 2: 项目/点位数据 page`
- Status: `closed / verified`
- Result:
  - Replaced the `项目/点位数据` placeholder with a usable Yingkou project/point page.
  - Added point summary metrics, point table, source-vs-preview coverage, and workflow gate details.
  - Added a route-specific project right inspector.
  - Added structured bottom detail for the project page.
  - Updated E2E regression to assert project page content and the `进入数据导入` transition.
  - Verified with Playwright MCP screenshot, browser-check JSON, and console logs.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
  - `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-1440x900.png`
  - `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-browser-check.json`
  - `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-console-errors.md`
  - `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-console-warnings.md`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 3: build the `数据导入` page with field mapping, preview rows, import issue/detail panel, and next action into data check.

## Previous - 2026-07-09 Web-P2 Slice 1 Data And State Foundation

- Active file: `process_logs/Process021.md`
- Active theme: `Web-P2 data and state foundation`
- Current active slice: `Web-P2 Slice 1: app state and sample-data selectors`
- Status: `closed / verified`
- Result:
  - Added `src/workflowData.ts` as the shared Web-P2 data foundation.
  - Centralized route metadata, route titles, route statuses, point scope, and default workflow selection state.
  - Aggregated the Yingkou sample data sources for stratification, parameters, output, method-lab input, and check scenarios.
  - Added selectors for layer scheme, layer, boundary, parameter scheme, parameter slot, output item, project/point summary, import mappings, import preview rows, check issues, and output items.
  - Updated `src/App.tsx` to use the shared data foundation while preserving the current UI behavior.
  - Updated `plan.md` and `docs/prototype/web-p2-feature-development-plan-2026-07-09.md`, including a Slice 9 completion-audit gate for the active Codex goal.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
- Evidence:
  - `npm.cmd run build` passed.
  - `npm.cmd run test:e2e` passed: 2 tests.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Start Slice 2: build the `项目/点位数据` page from the shared Yingkou sample-data selectors.

## Previous - 2026-07-09 Agent P1 IA Copy And Professional Cleanup

- Active file: `process_logs/Process019.md`
- Active theme: `Agent P1 IA/copy/professional cleanup`
- Current active slice: `Web-P1: Mixpanel-inspired workbench P1 cleanup after reusable agent rereview`
- Status: `closed / verified`
- Result:
  - Reduced repeated read-only boundary copy to short badges and one detailed explanation.
  - Standardized `参数解译` as the workflow and `试算` as the mode/status.
  - Reworked the right panel into a single `检查器`.
  - Removed disabled placeholder controls from the main and table toolbars.
  - Renamed stratification review metrics to `分层复核` and `复核边界/区间`.
  - Made layer-row status consider adjacent review-required boundaries.
  - Changed the parameter column to `试算候选项`.
  - Marked SBTn as schematic evidence and dimmed non-selected evidence points.
  - Converted the bottom `复核项` area into boundary-detail rows.
  - Increased the evidence panel height on taller screens.
  - Verified `npm.cmd run build` and `npm.cmd run test:e2e`.
  - Ran Playwright MCP walkthrough and final checks.
  - Ran the three reusable review agents again; final status has no P0/P1 and is safe to close.
  - Fixed the rereview P1 findings around review-count consistency and `边界` terminology conflict.
- Evidence:
  - `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-initial-1440x900.png`
  - `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-interaction-1440x900.png`
  - `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-interaction-1920x1080.png`
  - `process_logs/playwright-mcp/ia-copy-professional-cleanup/final-browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Run the three reusable review agents again against the new screenshots and code.

## Previous - 2026-07-08 Reusable UI Review Agent Playbook

- Active file: `process_logs/Process018.md`
- Active theme: `Reusable UI review agent playbook`
- Current active slice: `Web-P1：agent review workflow documentation`
- Status: `closed / documented`
- Result:
  - Created `agents/README.md`.
  - Created `agents/visual-layout-taste-auditor.md`.
  - Created `agents/geotechnical-domain-reviewer.md`.
  - Created `agents/copy-ia-mobbin-challenger.md`.
  - Updated `AGENTS.md` so future requests for agent-based UI review use these three templates by default.
  - Defined read-only review behavior, evidence package, P0/P1/P2 output format, and Mobbin usage permission for the Copy/IA challenger.
- Boundary:
  - Documentation-only slice.
  - No UI implementation files were changed.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Use these three agents whenever the user asks for agents to review UI.

## Previous - 2026-07-08 IA Copy And 1440 Layout Safety Refactor

- Active file: `process_logs/Process017.md`
- Active theme: `IA copy and 1440 layout safety refactor`
- Current active slice: `Web-P1：Mixpanel-inspired workbench IA/copy/layout safety`
- Status: `closed / verified / multi-agent re-reviewed`
- Result:
  - Removed duplicated workflow tabs and made the top nav route-aware.
  - Kept the left sidebar as the only workflow navigator.
  - Reworked the right side from query-builder language into `方案检查`.
  - Replaced risky prototype copy around save/adopt/export/formal flow.
  - Made the bottom panel route-aware.
  - Added SBTn evidence zones, guide lines, selected-layer highlighting, and legend.
  - Fixed right scheme-list clipping and 1920 evidence-card stretching.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser QA at 1440x900 and 1920x1080.
  - Arranged four-agent rereview and closed the actionable P0/P1 findings.
- Evidence:
  - `docs/prototype/multi-agent-ui-rereview-2026-07-08.md`
  - `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-1440x900.png`
  - `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1440x900.png`
  - `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1920x1080.png`
  - `process_logs/playwright-mcp/ia-copy-layout-safety/final2-browser-check.json`
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Review screenshots.
  - If this direction is accepted, apply similar route-specific layouts to `数据导入`, `数据检查`, `参数解译`, and `成果输出`.

## Previous - 2026-07-08 Multi-Agent UI Layout And Copy Audit

- Active file: `process_logs/Process016.md`
- Active theme: `Multi-agent UI layout and copy audit`
- Current active slice: `Web-P1：Mixpanel-inspired UI audit`
- Status: `closed / audit complete`
- Result:
  - Launched four read-only audit agents: layout consistency, Mixpanel reference alignment, Chinese/domain language, and IA/workflow coherence.
  - Captured DOM layout evidence in `process_logs/playwright-mcp/mixpanel-top-nav/dom-layout-audit.json`.
  - Created `docs/prototype/multi-agent-ui-audit-2026-07-08.md`.
  - Consolidated P0/P1/P2 issues, a copy replacement table, and a recommended refactor order.
  - Recommended next implementation slice: `IA + copy + 1440 layout safety`.
- Boundary:
  - No production UI code changed in this audit slice.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Implement the recommended slice: fix navigation hierarchy, right-panel semantics, Chinese/prototype-boundary copy, and 1440 table visibility.

## Previous - 2026-07-08 Mixpanel Global Top Navigation

- Active file: `process_logs/Process015.md`
- Active theme: `Mixpanel global top navigation`
- Current active slice: `Web-P1：Mixpanel top navigation refinement`
- Status: `closed / verified`
- Result:
  - Added a Mixpanel-style global product top bar.
  - Added product columns `Boards`, `Reports`, `Data`, `Points`, `Outputs`, a centered search field, project context, and utility icons.
  - Shifted Explorer, Editor, and Query panel to the second grid row so the workflow tabs no longer start at the very top.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser QA at `1440x900` and `1920x1080`, including interaction checks, screenshot capture, console checks, forbidden-term checks, and old-chrome absence checks.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Review screenshots.
  - If approved, make the top product columns route or filter actual workbench views in a later slice.

## Previous - 2026-07-08 Mixpanel-Inspired Workbench Refactor

- Active file: `process_logs/Process014.md`
- Active theme: `Mixpanel-inspired workbench refactor`
- Current active slice: `Web-P1：地层分层 Mixpanel report workspace`
- Status: `closed / verified`
- Result:
  - Used Mobbin Mixpanel screens and flows as the primary reference.
  - Restyled the app around Mixpanel-like purple accent, white report canvas, product sidebar, compact control chips, chart/evidence area, breakdown table, and right Query panel.
  - Moved `分层方案` selection from the center canvas into the right Query panel.
  - Kept product content focused on `项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出`.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser QA at `1440x900` and `1920x1080`, including selecting `自动分层候选 A`, selecting `L2`, switching to `成果预检`, screenshot capture, console checks, forbidden-term checks, and old-chrome absence checks.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new dependency was installed.
- Next:
  - Review screenshots.
  - Apply the Mixpanel-style Query/filter pattern to `数据导入` and `数据检查` when those flow screens become the next active slice.

## Previous - 2026-07-08 Mobbin Reference Analysis And Theme Phase 1/2 Implementation

- Active file: `process_logs/Process013.md`
- Active theme: `Mobbin reference analysis and visual token/density implementation`
- Current active slice: `Web-P1：UI theme Phase 1 + Phase 2`
- Status: `closed / verified`
- Result:
  - Mobbin MCP access worked after reconnect/login.
  - Created `docs/prototype/mobbin-reference-analysis-2026-07-08.md`.
  - Connected Mobbin references into the theme options and implementation roadmap docs.
  - Implemented Phase 1 + Phase 2 in `src/styles.css`: product tokens, calmer neutral/primary/semantic colors, UI/data font roles, tabular numeric treatment, tighter table/button/status density, and quieter shell surfaces.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser QA at `1440x900` and `1920x1080`, captured screenshots, checked interaction state, console warnings/errors, forbidden terms, and absence of top chrome/activity bar/status bar.
- Boundary:
  - No production desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - No new component dependency was installed.
- Next:
  - Review screenshots.
  - Continue to Phase 3 + Phase 4 if approved: shell surface pass, right inspector grouping, issue/filter table patterns, and bottom issue queue refinement.

## Previous - 2026-07-08 Theme Implementation Roadmap

- Active file: `process_logs/Process012.md`
- Active theme: `Theme implementation roadmap`
- Current active slice: `Web-P1：UI theme implementation planning`
- Status: `roadmap / awaiting implementation approval`
- Result:
  - Turned the recommended hybrid direction into a concrete phase-by-phase roadmap.
  - Created `docs/prototype/ui-theme-implementation-roadmap-2026-07-08.md`.
  - Defined token targets, typography/density targets, shell/evidence phases, dependency decision gate, and verification closure.
  - Recommended the next implementation slice as Phase 1 + Phase 2 only: token refactor plus typography/density pass.
- Boundary:
  - No production UI code changed in this roadmap slice.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Wait for user approval to start Phase 1 + Phase 2 implementation.

## Previous - 2026-07-08 Color And Typography Direction Research

- Active file: `process_logs/Process011.md`
- Active theme: `Color and typography direction research`
- Current active slice: `Web-P1：UI theme direction proposal`
- Status: `proposal / awaiting user decision`
- Result:
  - Used `artifact-design` to frame the color/type review for dense engineering product UI.
  - Researched Ant Design Pro, TDesign Starter, Arco Design Pro, Carbon, Semi Design, and Fluent UI references.
  - Captured screenshots under `process_logs/playwright-mcp/theme-research/`.
  - Created `docs/prototype/ui-theme-options-2026-07-08.md` with candidate options, screenshots, fit assessment, color tokens, font suggestions, and recommendation.
  - Recommended a hybrid direction: TDesign shell discipline + Ant/Pro component semantics + Carbon data density.
- Boundary:
  - No production UI code changed in this research slice.
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- Next:
  - Wait for user to choose the color/type direction, then implement a scoped token refactor and verify with build, E2E, and MCP screenshots.

## Previous - 2026-07-08 Taste Skill UI Audit And Shell Simplification

- Active file: `process_logs/Process010.md`
- Active theme: `Taste skill UI audit and shell simplification`
- Current active slice: `Web-P1：可操作 Web 工作台原型`
- Status: `closed / verified`
- Result:
  - Used `design-taste-frontend / taste-skill` as an audit and anti-template guide, while respecting that the product is dense engineering workbench UI rather than landing-page UI.
  - Removed the left black Activity Bar and the bottom blue Status Bar from React, CSS, and tests.
  - Changed the shell to a three-column, one-row layout with Explorer as the leftmost lightweight resource pane.
  - Updated `plan.md` so current workflow checks no longer require Activity Bar or Status Bar and explicitly verify they are absent.
  - Verified `npm run build` through `npm.cmd` and `npm run test:e2e` through `npm.cmd`.
  - Ran Playwright MCP browser walkthrough, captured final screenshot, and confirmed no console errors/warnings.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - The prototype uses copied sample data only.
- Next:
  - Web-P2 can decide whether to introduce `antd` and targeted ProComponents for real table/form complexity.

## Previous - 2026-07-08 Mature Workbench Visual Refactor

- Active file: `process_logs/Process009.md`
- Active theme: `Mature workbench visual refactor`
- Current active slice: `Web-P1：可操作 Web 工作台原型`
- Status: `closed / verified`
- Result:
  - Added and progressively checked the visual-refactor checklist in `plan.md`.
  - Applied Ant Design Pro / ProComponents workbench semantics without migrating the Vite app to the full Pro template.
  - Replaced the stacked header/stat/query layout with a compact analysis header and metadata bar.
  - Unified color tokens around one primary blue, engineering neutrals, muted soil colors, and semantic status colors.
  - Reworked the scheme list, evidence panel, layer track, layer table, right property inspector, and bottom panel.
  - Fixed the CSS Grid stretch issue that created excessive top whitespace.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser walkthrough and captured final screenshot.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - The prototype uses copied sample data only.
- Next:
  - Web-P2 can decide whether to install `antd` and targeted ProComponents adapters for real table/form capabilities.

## Previous - 2026-07-08 Remove Top Chrome And Flatten Layout

- Active file: `process_logs/Process008.md`
- Active theme: `Remove the rejected top chrome and flatten the workbench content`
- Current active slice: `Web-P1：可操作 Web 工作台原型`
- Status: `closed / verified`
- Result:
  - Removed the global top menu/command chrome after user feedback.
  - Kept Activity Bar, Explorer, Editor Tabs, Right Panel, Bottom Panel, and Status Bar.
  - Flattened central content: less floating-card feel, less strong orange outlining, smaller radii, and cleaner tool-panel styling.
  - Removed visible design-system jargon from app copy.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser walkthrough and captured final screenshot.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - The prototype uses copied sample data only.
- Note:
  - This intentionally moves away from the earlier literal VSCode top chrome requirement. The prototype now keeps VSCode-like side/editor organization but uses a cleaner browser-native top edge.

## Previous - 2026-07-08 Ant Design Pro Reference Refactor

- Active file: `process_logs/Process007.md`
- Active theme: `Web-P1 Ant Design Pro inspired content refactor`
- Current active slice: `Web-P1：可操作 VSCode-like 工作台原型`
- Status: `closed / verified`
- Result:
  - Refactored the `地层分层` content area with Ant Design Pro style page organization.
  - Added Pro-like page header, statistic tiles, query bar, scheme list, layer table toolbar, and right-panel preflight detail.
  - Added route/scheme scroll reset and density fixes so the primary review path fits in a `1920x1080` editor viewport.
  - Added `docs/prototype/ui-component-candidates.md` for future component/library access paths.
  - Verified `npm run build` and `npm run test:e2e`.
  - Ran Playwright MCP browser walkthrough and captured final screenshot.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - The prototype uses copied sample data only.
- Next:
  - Web-P2 can extract local components and consider `antd`/`@ant-design/pro-components` only when table/form complexity justifies it.

## Previous - 2026-07-08 Web-P1 Visual Polish

- Active file: `process_logs/Process006.md`
- Active theme: `Web-P1 visual refinement after Mobbin/public SaaS pattern review`
- Current active slice: `Web-P1：可操作 VSCode-like 工作台原型`
- Status: `polished / verified`
- Result:
  - Attempted Mobbin research; current Mobbin MCP requires a paid plan.
  - Used public dashboard/tool references for practical layout cues.
  - Polished the workbench content area without changing the VSCode-like shell contract.
  - Improved status tiles, scheme list, data table, evidence panel, right panel property groups, and disabled action affordance.
  - Verified `npm run build` and `npm run test:e2e`.
  - Captured a final Playwright MCP screenshot.
- Boundary:
  - No desktop repo files were changed.
  - No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
  - The prototype uses copied sample data only.
- Next:
  - Web-P2 can deepen stratification interactions: boundary selection, evidence linking, and richer layer review states.

## Previous - 2026-07-08 Web-P1 Workbench Prototype Implementation

- Active file: `process_logs/Process005.md`
- Active theme: `Web-P1 VSCode-like workbench implementation`
- Current active slice: `Web-P1：可操作 VSCode-like 工作台原型`
- Status: `closed / polished in Process006`
- Result:
  - Built the Vite + React + TypeScript prototype.
  - Implemented the VSCode-like workbench shell.
  - Implemented workflow navigation for six main pages.
  - Implemented the default `地层分层` document from sample stratification JSON.
  - Ran MCP browser walkthrough and fixed blocking findings.
  - Added Playwright workflow regression.
  - Verified `npm run build` and `npm run test:e2e`.

## Previous - 2026-07-08 Web-P1 Workflow Reset After MCP Availability

- Active file: `process_logs/Process004.md`
- Active theme: `Web-P1 gate-based workflow with MCP + Playwright QA`
- Current active slice: `Web-P1：可操作 VSCode-like 工作台原型`
- Status: `closed / implemented in Process005`
- Result:
  - Reset `plan.md` into a gate-based workflow.
  - Made Playwright MCP exploratory browser QA a required Web-P1 closure gate.
  - Made project-level Playwright E2E regression a required Web-P1 closure gate.
  - Confirmed current Playwright MCP tools are callable in this Codex session.

## Previous - 2026-07-08 Browser Automation Tooling Setup

- Active file: `process_logs/Process003.md`
- Active theme: `Playwright + Playwright MCP setup`
- Current active slice: `Web-P1：浏览器自动化与 MCP 工具准备`
- Status: `closed / tooling installed`
- Result:
  - Installed Node.js LTS with `winget`.
  - Added official Playwright MCP server config to Codex via `C:\Users\ShiJie\.codex\config.toml`.
  - Added wrapper `C:\Users\ShiJie\.codex\playwright-mcp.cmd` so the MCP server can find Node/npm reliably.
  - Initialized npm metadata for this prototype workspace.
  - Installed `@playwright/test`.
  - Installed Playwright Chromium.
  - Added Playwright config and a minimal browser tooling smoke test.
  - Verified `npm run test:e2e` passes.
- Boundary:
  - No desktop repo files were changed.
  - No production UI implementation has started yet.
- Browser MCP was later confirmed callable in the current Codex session.
- Next:
  - Follow the reset workflow in `plan.md`.

## Previous - 2026-07-08 Web-P1 Workflow Definition

- Active file: `process_logs/Process002.md`
- Active theme: `Web-P1 VSCode-like 工作台壳层 workflow`
- Current active slice: `Web-P1：搭建 Vite + React + TypeScript 工作台壳层`
- Status: `closed / superseded by tooling setup`
- Result:
  - Rewrote `plan.md` as a clear Web-P1 workflow.
  - Added delivery, functional, design, data-boundary, build, and browser-operation checks.
  - Confirmed that browser-like QA should be part of Web-P1 closure, preferably via Playwright once Node/npm are available.
- Boundary:
  - No desktop repo files were changed.
  - No web implementation has started yet.
  - No desktop `app_data`, SQLite schema, official algorithm, or export contract is touched.
- Follow-up:
  - Node/npm and Playwright setup completed in `Process003.md`.

## Previous - 2026-07-08 Web Prototype Workspace Initialization

- File: `process_logs/Process001.md`
- Slice: `Web-P0：创建独立原型目录并复制关键资料`
- Status: `closed / ready for Web-P1 scaffold`
