# Multi-Agent UI Layout And Copy Audit

Date: 2026-07-08

Status: audit complete / no UI code changed in this slice

Scope: current Mixpanel-inspired web prototype after `Process015`.

Evidence:

- Current 1440 screenshot: `../../process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1440x900.png`
- Current interaction screenshot: `../../process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-interaction-1440x900.png`
- Current 1920 screenshot: `../../process_logs/playwright-mcp/mixpanel-top-nav/mixpanel-top-nav-1920x1080.png`
- DOM layout audit: `../../process_logs/playwright-mcp/mixpanel-top-nav/dom-layout-audit.json`
- Mixpanel reference screen: https://mobbin.com/screens/10d76bb3-6f65-4805-ad42-30ee24ec78e2
- Mixpanel report screen: https://mobbin.com/screens/55fc4611-f390-44c5-a722-30c74789c6d2

## Agents

- Hubble: layout consistency, geometry, density, responsive behavior.
- Nash: Mixpanel reference alignment.
- Gibbs: Chinese UX copy and domain language.
- Curie: information architecture and workflow coherence.

## Executive Verdict

The current prototype is directionally better than the earlier VS-like shell, but it is not yet coherent.

The center `地层分层` report canvas is the strongest part. The weak points are structural:

- Navigation layers compete with each other.
- The right panel borrows Mixpanel words but functions as an engineering inspector.
- The center chart/table area has unstable height behavior.
- Several Chinese strings either sound like implementation language or imply production save/adopt/export behavior.

The next pass should not be another color polish pass. It should first fix hierarchy and copy.

## P0 - Blocking Inconsistencies

### 1. Navigation Hierarchy Is Over-Stacked

Problem:

- Top bar: `Boards / Reports / Data / Points / Outputs`
- Left sidebar: `项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出`
- Second row tabs: the same workflow items again

Why it hurts:

- Users get three answers to "where am I?"
- `Data / Points / Outputs` in the top bar conflict with workflow concepts.
- Top active state says `Boards`, while the actual active work is `地层分层`.

Fix direction:

- Top bar should only carry brand, project/point scope, search/command, and light utilities.
- Left sidebar should be the only workflow navigation.
- Second row should become actual open-document tabs or a compact current-document bar, not another workflow nav.

### 2. Query Panel Is Semantically Mismatched

Problem:

- The right panel uses `Query / Metrics / Filter / Breakdown / Annotations`.
- The actual content is scheme candidates, selected layer details, preflight, and review notes.

Why it hurts:

- Mixpanel's right panel is a query builder.
- Our product needs an engineering context panel.
- Current `+` buttons imply configurable analytics behavior that does not exist.

Fix direction:

- Rename and restructure as engineering sections:
  - `方案候选`
  - `筛选条件`
  - `当前层位`
  - `复核项`
  - `参数预检`
  - `说明`
- If keeping Mixpanel tabs, localize them: `查询 / 图表 / 批注`.
- Keep selected-layer detail as an inspector section, not as the primary Query Builder substitute.

### 3. 1440x900 Layout Cuts Off The Core Table

Problem:

- The `层位列表` is partially hidden at 1440x900.
- The bottom panel has fixed 112px height.
- The chart row consumes the remaining vertical space.

Evidence:

- `.editor-shell`: `grid-template-rows: 36px minmax(0, 1fr) 112px`
- `.evidence-area`: chart row uses `minmax(250px, 1fr)`
- `.track-area`: `min-height: 292px`

Fix direction:

- Make the bottom panel shorter by default or collapsible.
- Give the chart a bounded height such as `clamp(220px, 34vh, 320px)`.
- Ensure chart + table are both visible at 1440x900.

### 4. Copy Breaks Prototype Boundaries

Problem:

- `保存草稿`
- `采纳为当前分层`
- `导出视图`
- `进入正式参数解译`
- `正式参数输入`
- `可写`

Why it hurts:

These words imply production persistence, adoption, or export, which the prototype explicitly does not support.

Fix direction:

- Use prototype-safe verbs:
  - `查看试算`
  - `生成候选分层`
  - `标记候选`
  - `导出未开放`
  - `正式流程未接入`
  - `不写入正式工程`

### 5. Project And Point Context Is Inconsistent

Problem:

- Top/context uses `营口样例`.
- Center uses `CPT09`.
- Left footer uses `CPT9-19-S1`.

Why it hurts:

Geotechnical users rely on point IDs. Inconsistent point naming damages trust.

Fix direction:

- Define one context spine:

```text
项目：营口样例 / 点位：CPT09（CPT9-19-S1） / 方案：自动分层候选 A / 层位：L2 / 权限：只读样例
```

- Use it consistently in top, center, sidebar, and inspector.

## P1 - High-Value Fixes

### 1. Center Report Has Too Much Before The Chart

Problem:

- Header, actions, controls, warning, metrics all appear before the chart.
- The chart/table relationship is less direct than Mixpanel.

Fix direction:

- Compress controls to one row.
- Move some status/preflight details into the right panel.
- Keep only one lightweight warning or status spine above the chart.

### 2. Depth Axis And Grid Are Visually Wrong

Problem:

- First and last tick labels are clipped.
- Tick positions and grid lines are generated differently.

Fix direction:

- Add axis padding.
- Render grid and ticks from one shared depth/tick model.
- Avoid `top: 0/100%` plus `translateY(-50%)` under `overflow: hidden`.

### 3. Wide Screen Chart Feels Empty

Problem:

- At 1920 width the SBTn area has only three points across a huge canvas.
- At 1440 height the chart compresses the table.

Fix direction:

- Bound chart height and optionally max-width the scatter plot region.
- Add legend and clearer axis/grid treatment.
- Keep layer track strong, but make it feel like part of a professional evidence chart.

### 4. Metrics Row Stretches Unevenly

Problem:

- `质量门` and `复核深度` columns become too wide on 1920.

Fix direction:

- Use stable columns or an `auto-fit` grid with max widths.
- Do not let middle metrics absorb all remaining width.

### 5. Right Panel Density Is Too Loose

Problem:

- Candidate scheme rows are 64px high.
- Important sections such as current layer and preflight move below the fold at 900 height.

Fix direction:

- Use compact rows around 44-52px.
- Show the selected scheme as a summary card.
- Collapse history/secondary schemes.

### 6. Actions Have Similar Weight

Problem:

- `运行分层 / 保存草稿 / 采纳为当前分层 / 进入参数解译` sit together with similar visual weight.

Fix direction:

- Keep one primary next action.
- Move secondary/disabled actions into a menu or right panel.
- Disabled actions need inline reasons.

## P2 - Polish And Consistency

- Top bar is too saturated compared with Mixpanel. Consider a lighter top bar or use purple only for the primary action.
- Left sidebar row density and active state are heavier than Mixpanel.
- Table selected row purple is too strong.
- Borders, radii, and panel semantics are inconsistent: hard panels and rounded cards mix at the same hierarchy level.
- `max-width: 1260px` currently widens the left column to 260px, which worsens narrow layouts.
- Search appears in both the top bar and sidebar. Decide which one is primary.

## Copy Replacement Table

| Current | Recommended |
| --- | --- |
| Boards | 工作台 |
| Reports | 报告 |
| Data | 数据 |
| Points | 点位 |
| Outputs | 成果 |
| Search | 搜索点位、方案或结果 |
| Workflow | 工作流程 |
| Query | 查询条件 |
| Metrics | 方案信息 |
| Filter | 筛选条件 |
| Breakdown | 复核摘要 |
| Annotations | 说明 / 批注 |
| Point | 点位 |
| Restriction | 使用限制 |
| Line | 曲线视图 |
| Compare | 方案对比 |
| 质量门 | 数据检查 |
| 试算入口 | 参数试算 |
| 正式参数输入 | 正式参数流程 |
| 层位轨道与 SBTn 分类证据 | 分层剖面与 SBTn 分类依据 |
| 样例 JSON | 样例数据 |
| 保存草稿 | 暂存到原型 |
| 采纳为当前分层 | 标记为候选方案 |
| 进入参数解译 | 进入参数试算 |
| 导出视图 | 导出未开放 |
| 只读投影 | 只读样例方案 |
| 可写 | 不写入正式工程 |
| 持久化审定 | 已确认并写入正式工程 |

## Recommended Refactor Order

1. Fix IA first:
   - top bar = brand/scope/search/utilities
   - left sidebar = only workflow navigation
   - second row = current document tab, not workflow duplicate
2. Normalize project and point context.
3. Rename the right panel into engineering concepts and remove fake query-builder affordances.
4. Fix 1440 layout:
   - smaller/collapsible bottom panel
   - bounded chart height
   - visible table
5. Fix chart/axis and table density.
6. Apply the copy replacement table.
7. Re-run Playwright screenshots at 1440x900 and 1920x1080.

## Proposed Next Slice

Recommended next implementation slice:

```text
IA + copy + 1440 layout safety
```

Do not start with colors. The main issue is hierarchy.
