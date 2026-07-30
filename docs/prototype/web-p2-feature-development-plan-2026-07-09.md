# Web-P2 Feature Development Plan

Date: 2026-07-09

Status: `in progress / Slice 7 closed`

Workspace: `D:\CPT-UIQA-WebPrototype`

## 1. Objective

把当前 Web 原型从“地层分层主页面较完整、其他页面偏占位”推进为一套可操作的浏览器工作台。

目标 workflow：

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

每一步都必须回答：

- 当前对象是什么？
- 当前数据是否可用？
- 是否可以进入下一步？
- 阻塞、警告、复核项在哪里？
- 哪些结果是正式链路，哪些只是只读样例、候选或试算？

## 2. Scope

In scope:

- 使用 `sample_data/` 下本地 JSON/CSV 构建只读样例功能。
- 浏览器内状态管理：当前项目、当前点位、导入批次、检查结果、分层方案、选中层位、参数试算、成果预检。
- 六个主流程页面全部可点击、可检查、可进入下一步。
- 表格、检查器、底部详情、状态门槛和轻量图表。
- Playwright MCP 人类式走查和项目级 Playwright E2E。
- 三个 reusable review agents 的 UI/专业/IA 复查。

Out of scope unless re-confirmed:

- 修改 `D:\CPT-UIQA` 桌面仓库。
- 读写桌面 `app_data`。
- SQLite schema 或数据库持久化。
- 官方 CPT/CPTU 公式、SBTn 正式分类算法、参数正式审定逻辑。
- 真实 PDF/DXF/Excel 导出。
- 后端服务、登录、多用户、权限系统。

## 3. Data Sources

Use these first:

- `sample_data/stratification/yingkou-cpt09-layer-scheme-bundle.v1.json`
- `sample_data/parameters/yingkou-cpt09-parameter-scheme-bundle.v1.json`
- `sample_data/output/adopted-output-package.v1.json`
- `sample_data/manual_walkthrough/manual_cptu_alpha.csv`
- `sample_data/manual_walkthrough/manual_cptu_beta.csv`
- `sample_data/method-lab/*.json`

Data rule:

- UI may explain sample limitations.
- UI must not present sample data as official deliverables.
- Any calculated-looking value must either come from sample data or be clearly marked as sample/mock/preview.

## 4. Product Workflow

### Step 1 - 项目/点位数据

User goal:

- Know current project, current point, available CPTU records, and whether there is enough data to import/check.

Feature scope:

- Project/point summary strip.
- Point list or compact point selector.
- Data coverage: depth range, record count, data version, source files.
- Current point detail inspector.
- Next action: enter `数据导入`.

Acceptance:

- User can identify `营口样例 / CPT09`.
- User can see record/depth/data-version status.
- Right inspector follows selected point.
- No desktop paths or internal runtime state are exposed.

### Step 2 - 数据导入

User goal:

- Understand what sample data is loaded, whether columns are mapped, and what needs checking.

Feature scope:

- Import batch panel using sample CSV/JSON.
- Field mapping table: source field, target field, status, note.
- Preview table for first rows.
- Import warnings/notes.
- Bottom detail for import log.
- Next action: enter `数据检查`.

Acceptance:

- User sees `营口 CPTU 样例表`, not internal filenames as primary UI.
- Mapping state is visible.
- Preview table is compact and readable.
- UI does not claim real file parsing or persistence.

### Step 3 - 数据检查

User goal:

- Decide whether data can enter stratification.

Feature scope:

- Check gate summary: blocking, warning, passed.
- Rule list: depth monotonicity, missing fields, nonpositive values, coverage.
- Issue table using `method-lab/bad-*.json` as sample scenarios where useful.
- Fix suggestion/check explanation panel.
- Next action: enter `地层分层`.

Acceptance:

- User can distinguish blocking vs warning.
- Data check page does not look like logs only.
- Warnings can be selected and inspected.
- If no blocker, the page clearly allows proceeding to stratification.

### Step 4 - 地层分层

User goal:

- Review the current layer scheme, boundary intervals, evidence, and whether it can feed parameter interpretation trial.

Feature scope:

- Keep current Mixpanel/Linear workbench layout.
- Add boundary issue selection from bottom panel to layer/evidence view.
- Add SBTn numeric ticks or stronger non-scale schematic label.
- Improve metric boundary summary wrapping/chips.
- Keep scheme selector in right inspector.
- Keep `参数解译试算` as next action.

Acceptance:

- Review count is consistent everywhere.
- Layer status considers adjacent review boundaries.
- SBTn evidence cannot be mistaken for an official classifier.
- Current scheme, selected layer, and selected boundary are clear.

### Step 5 - 参数解译

User goal:

- Inspect parameter trial candidates based on the selected/read-only layer scheme.

Feature scope:

- Load `sample_data/parameters/yingkou-cpt09-parameter-scheme-bundle.v1.json`.
- Parameter scheme list.
- Selected layer/parameter candidate table.
- Applicability status: usable for trial, needs review, blocked for official chain.
- Charts or compact ranges where sample data supports them.
- Right inspector for selected parameter group.
- Bottom record for trial notes and output blockers.

Acceptance:

- Uses `参数解译` as workflow name.
- Uses `试算` only as mode/status.
- Does not imply official parameter adoption.
- User can return to `地层分层` if boundary review blocks official chain.

### Step 6 - 成果输出

User goal:

- Understand what would be included in outputs and why current prototype cannot formally export.

Feature scope:

- Load `sample_data/output/adopted-output-package.v1.json`.
- Output package checklist: layer result, parameter result, figures, tables, metadata.
- Preflight gate: missing official scheme, missing official parameter chain, export unavailable.
- Preview-only report/table cards.
- Right inspector for selected output item.
- Bottom export precheck details.

Acceptance:

- No real export button unless explicitly disabled by clear status, or represented as preview-only.
- User can see exactly what is missing for formal output.
- Page feels like an output precheck, not a marketing/completion page.

## 5. Implementation Slices

### Slice 1 - App State And Data Foundation

Deliverables:

- Central route metadata.
- Shared sample-data selectors/helpers.
- Browser state for selected project/point/import batch/check issue/scheme/layer/boundary/parameter/output item.
- Basic derived status helpers.

Verification:

- `npm.cmd run build`
- `npm.cmd run test:e2e`

Stop condition:

- Any requirement for real persistence or desktop data access.

### Slice 2 - Project / Point Page

Deliverables:

- Replace placeholder page with point summary, coverage, list/detail, next action.
- Route-aware right inspector.
- Bottom panel details.

Verification:

- Build + E2E.
- Browser screenshot at 1440x900.

### Slice 3 - Import Page

Deliverables:

- Mapping table.
- Preview table.
- Import issue/detail panel.
- Next action into data check.

Verification:

- Build + E2E.
- Browser screenshot and console check.

### Slice 4 - Data Check Page

Deliverables:

- Check rule summary.
- Issues table.
- Issue inspector.
- Status gates into stratification.

Verification:

- Build + E2E.
- Browser check for blocking/warning/pass text.

### Slice 5 - Stratification Deepening

Deliverables:

- Boundary selection.
- SBTn ticks or explicit non-scale schematic treatment.
- Boundary chips in metric row.
- Better 1440/1920 responsive fit.

Verification:

- Build + E2E.
- Playwright MCP screenshots.
- Three reusable agents if visual/professional surface changes materially.

### Slice 6 - Parameter Interpretation Page

Deliverables:

- Parameter scheme screen from sample JSON.
- Trial candidate table.
- Applicability/preflight inspector.
- Bottom trial notes.

Verification:

- Build + E2E.
- Professional wording check.

### Slice 7 - Output Page

Deliverables:

- Output package precheck.
- Preview-only item list.
- Missing formal-chain reasons.
- Output inspector and bottom precheck.

Verification:

- Build + E2E.
- Browser visible-text check ensures no formal export claim.

### Slice 8 - Cross-Flow QA And Agent Review

Deliverables:

- E2E coverage for main workflow.
- Playwright MCP walkthrough:
  - 1440x900 initial and interaction screenshots
  - 1920x1080 interaction screenshot
  - console warnings/errors
  - visible-text forbidden-term check
- Three-agent rereview:
  - Visual Layout Taste Auditor
  - Geotechnical Domain Reviewer
  - Copy IA Mobbin Challenger
- P0/P1 fixes.
- Process closure.

### Slice 9 - Completion Audit And Goal Closure

Deliverables:

- Requirement-by-requirement completion audit against the active Codex goal.
- Evidence inventory:
  - code files changed
  - `plan.md` checklist status
  - `Process.md` and `process_logs/` records
  - build and E2E output
  - Playwright MCP screenshots/check JSON
  - three-agent review notes and P0/P1 closure
- P2 backlog captured in the plan or process log.
- Goal closure only after all evidence is present.

Verification:

- Re-run `npm.cmd run build`.
- Re-run `npm.cmd run test:e2e`.
- Confirm screenshot and agent-review artifacts exist.
- Confirm no stop condition was crossed.

## 6. UI Workflow Contract

Global layout:

- Top nav: brand, current project/point/workflow, search affordance, prototype limit.
- Left sidebar: only workflow navigation.
- Center document: current route's working surface.
- Right panel: selected object inspector.
- Bottom panel: details, issues, logs, precheck records.

Page rule:

- Header answers current object and next safe action.
- Metrics answer status gates.
- Main canvas/table supports inspection.
- Right inspector shows selected object properties.
- Bottom panel shows selected detail, not repeated summaries.

Copy rule:

- Use `地层分层`, not `测试解译`.
- Use `参数解译` as workflow name.
- Use `试算` as a mode/status only.
- Use `原型限制` or `使用限制` for prototype boundaries.
- Reserve `边界` for stratigraphic boundaries.
- Avoid English fixture strings in visible UI.

## 7. Verification Workflow

For every implementation slice:

1. Update `plan.md`.
2. Implement the smallest useful version.
3. Run:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

4. If UI or workflow changed materially, run Playwright MCP:

```text
open app -> select route -> interact with selected item -> screenshot -> console check -> visible-text check
```

5. Record:

- screenshot paths
- browser-check JSON path
- console warnings/errors path
- known residual risks

6. Update `Process.md` and `process_logs/Process0XX.md`.

For major slices:

1. Spawn the three reusable agents.
2. Treat P0 as blocking.
3. Fix P1 in the same slice when within scope.
4. Record P2 as follow-up.

## 8. First Implementation Recommendation

Start with Slice 1, then Slice 2.

Reason:

- The current app has most page content hardcoded inside `App.tsx`.
- Before adding all workflow functions, we need route metadata, data selectors, and selected-object state to avoid duplicating logic across six pages.
- Once Slice 1 is done, Project/Point and Import pages can be built quickly without fighting the existing stratification code.

Implementation may start: yes.
