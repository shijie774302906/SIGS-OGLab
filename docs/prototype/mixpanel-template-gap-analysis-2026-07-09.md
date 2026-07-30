# Mixpanel Template Gap Analysis And Planning

Date: 2026-07-09

Status: planning / research only

Scope: `D:\CPT-UIQA-WebPrototype`

## 1. Research Inputs

- User-provided Mixpanel-style reference screenshot.
- Current prototype screenshot:
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-1440x900-final.png`
- Current implementation references:
  - `src/App.tsx`
  - `src/styles.css`
- Mixpanel docs:
  - Insights report supports metrics, filters, breakdowns, date range, chart type changes, and saving or reusing metrics/behaviors.
  - Reports overview defines global filters, inline filters, breakdowns, date range, comparisons, and report-level controls.
- Mobbin MCP status:
  - Attempted twice.
  - Current Codex session returned `OAuth authorization required`.
  - This analysis does not claim Mobbin-returned screens were inspected.

## 2. Design Read

Reading this as a dense B2B engineering workbench for domain experts, with Mixpanel-style analytics-product layout language, leaning toward a three-pane product shell and restrained neutral palette.

Target dials:

- Design variance: `4`
- Motion intensity: `1`
- Visual density: `8`

Reasoning:

- This is not a landing page.
- The user should scan and operate, not read explanatory cards.
- Layout should feel like a mature report builder: left navigation, center analysis canvas, right query/inspector panel.

## 3. Main Finding

The current prototype is still structurally closer to a VSCode/workbench hybrid than Mixpanel.

Current shell:

```text
--------------------------------------------------------------+
| global top nav across all columns                           |
+---------------+-------------------------------+--------------+
| left explorer | editor tab + page + bottom     | right panel  |
|               | panel                          |              |
+---------------+-------------------------------+--------------+
```

Mixpanel reference:

```text
+----------------+--------------------------------+-------------+
| sidebar        | document/report header          | actions     |
|                +--------------------------------+-------------+
|                | center report canvas            | query panel |
|                | chart + table                   |             |
+----------------+--------------------------------+-------------+
```

The difference matters:

- Mixpanel has three primary boards: sidebar, analysis canvas, query panel.
- Our UI has five visible zones: global top nav, sidebar, tab bar, document canvas, right panel, bottom panel.
- The extra global top row and bottom panel make the product feel like a development IDE, not an analytics workbench.

## 4. Format And Layout Gap

| Area | Mixpanel Reference | Current Prototype | Gap | Planning Decision |
| --- | --- | --- | --- | --- |
| Shell | 3-pane app shell | Global top row + left + center + right + bottom | Too many structural bands | Move to 3-pane shell; remove full-width top row from default layout |
| Sidebar | Starts at top of app, owns project switch, primary create action, search/nav | Starts below global top row; no primary create action | Sidebar lacks product-app rhythm | Sidebar should own project switch, `+ 新建` action, search, workflow nav, utilities |
| Header | Document/report header sits above canvas, not over sidebar | Top nav spans full app; tab row under it | Two headers compete | Replace tab row with document header inside content area |
| Center | Report canvas: controls, chart, table in one vertical stack | Page header + metrics + cards + bottom detail panel | Content split into cards and bottom drawer | Make center a report canvas: toolbar -> visualization/evidence -> table |
| Right panel | Query panel with tabs and sections: Metrics, Filter, Breakdown | Generic checker with cards | Inspector lacks Mixpanel query-builder grammar | Convert right panel into route-specific query/inspector builder |
| Bottom | No permanent bottom panel in default report view | Persistent bottom panel | IDE residue; steals vertical space | Remove/collapse default bottom panel; move details into center lower table or right panel |
| Primary action | `Save` top-right in document header; `+ Create New` sidebar | Page-level primary buttons in header | Button hierarchy not global | Use consistent sidebar create + top-right document action |

## 5. Color Gap

Current tokens from `src/styles.css`:

- Canvas: `#f3f5f8`
- Surface: `#ffffff`
- Surface subtle: `#f7f8fa`
- Border: `#e7eaf0`
- Selected: `#e8f2ff`
- Primary: `#5b43e6`
- Primary soft: `#f0edff`
- Success: `#16856f`
- Warning: `#9a6507`

Problems:

1. Neutral palette leans pale blue-grey in several places, while Mixpanel reads more neutral white/grey.
2. Selected state uses blue-tinted `#e8f2ff`, while the product accent is purple. This creates a blue/purple conflict.
3. Success/warning labels appear in the sidebar and dense tables too often, making the UI look busier than Mixpanel.
4. Cards use many near-identical borders/backgrounds (`#e7eaf0`, `#eceaf3`, `#f5f6f8`, `#f7f8fa`) without a strict semantic rule.
5. The purple is technically close to Mixpanel, but its usage is not disciplined. It appears as brand mark, selected underline, hover, button, chart outline, selected rows, and pills.

Recommended palette:

| Role | Token | Proposed | Usage |
| --- | --- | --- | --- |
| App background | `--mp-app` | `#F7F7F8` | Sidebar and app frame |
| Canvas | `--mp-canvas` | `#FFFFFF` | Main report surface |
| Muted surface | `--mp-muted-surface` | `#FAFAFB` | Table headers, subtle grouped rows |
| Border | `--mp-border` | `#E8E8EC` | Main dividers |
| Strong border | `--mp-border-strong` | `#DADAE2` | Inputs, active panel boundaries |
| Text | `--mp-text` | `#171719` | Main text |
| Secondary text | `--mp-secondary` | `#6F6F78` | Labels and captions |
| Tertiary text | `--mp-tertiary` | `#9A9AA3` | Hints |
| Accent | `--mp-purple` | `#5B43E6` | Primary action, active query tab, selected nav icon |
| Accent soft | `--mp-purple-soft` | `#F3F0FF` | Selected nav background only |
| Series A | `--series-a` | `#6D5CFF` | Chart/stratification primary evidence |
| Series B | `--series-b` | `#FF6B5A` | Comparison/evidence contrast |

Semantic colors should be muted and local:

- Success should not be the default sidebar status color.
- Warning should appear only where a decision is blocked or requires review.
- Use text-only neutral states in navigation.

## 6. Typography Gap

Current:

- `Microsoft YaHei UI`, `PingFang SC`, `Segoe UI`, Arial.
- H1 around 18px, section titles 12-15px, many labels 12px.

Issue:

- Chinese text is readable but slightly heavy and wide.
- Mixpanel-style UI relies on compact, high-contrast labels with very controlled weights.
- Our headings and table rows feel like generic admin UI, not a refined analytics product.

Planning decision:

- Keep system fonts for now; do not introduce remote fonts.
- Reorder font stack to prefer modern system rendering:

```css
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
"PingFang SC", "Microsoft YaHei UI", Arial, sans-serif
```

Type scale:

| Role | Size | Weight | Notes |
| --- | --- | --- | --- |
| Sidebar nav | 12px | 500 | Active 650 |
| Labels | 11px | 500 | Muted color |
| Body/table | 12px | 400/500 | Numeric tabular |
| Section title | 12px | 650 | No large card titles |
| Page title | 14-16px | 650 | Avoid large admin-page title |
| Primary button | 12px | 650 | One-line |

## 7. Button And Control Placement

Mixpanel reference hierarchy:

- Sidebar top: project switch.
- Sidebar: prominent `+ Create New`.
- Center header: breadcrumb/report title.
- Top-right: link/share, more, primary `Save`.
- Report control row: date range, compare, interval, chart type.
- Right panel: add metric/filter/breakdown via small `+`.

Current hierarchy:

- Global top nav owns project/point/search/tools.
- Page header owns route action such as `核对导入`.
- Sidebar only navigates.
- Bottom panel owns details.

Planning decision:

1. Sidebar primary action:
   - Position: under project switch.
   - Label options:
     - `+ 新建分析` for browser-only report/scheme view.
     - `+ 新建项目` only after persistence is explicitly confirmed.
   - In prototype mode, avoid implying formal desktop project creation.

2. Content header right actions:
   - `分享` icon or link icon.
   - `更多` icon.
   - Primary action:
     - `保存视图` if browser-local view persistence is implemented.
     - `保存` only if actual save behavior exists.
     - Until then, page-specific action may remain, but it should occupy the same top-right slot.

3. Right panel section actions:
   - Small `+` beside `对象/指标`, `过滤`, `分解/复核`.
   - No large action buttons inside cards unless it opens a builder.

4. Report control row:
   - Center canvas top.
   - Route-specific mapping:
     - Project page: point selector, data version, source scope.
     - Import page: batch, mapping status, preview range.
     - Check page: severity filter, rule family, source.
     - Stratification: scheme, depth window, layer/evidence mode.
     - Parameters: parameter scheme, method, layer filter.
     - Output: package scope, artifact type, gate status.

## 8. Route Mapping To Mixpanel Grammar

| Mixpanel Concept | Our Product Equivalent |
| --- | --- |
| Report | Workflow page or analysis view |
| Metric | Key engineering object or result slot |
| Event | CPTU data source, rule, layer, parameter, output artifact |
| Filter | Point, depth range, rule severity, layer group, scheme status |
| Breakdown | Soil group, layer, boundary type, parameter method, artifact type |
| Chart | CPTU evidence visualization, layer track, parameter curve, output map |
| Table | Point list, mapping table, rule table, layer table, parameter table |
| Save | Save view, not formal engineering result unless confirmed |
| Create New | New analysis/view/project depending on confirmed persistence scope |

## 9. Proposed Layout Specification

Target shell:

```text
grid-template-columns: 188px minmax(0, 1fr) 300px
grid-template-rows: minmax(0, 1fr)
```

Inside center + right area:

```text
+----------------+----------------------------------------------+
| sidebar        | document header with breadcrumb/actions       |
|                +-------------------------------+--------------+
|                | report canvas                  | query panel  |
|                | controls                       | tabs         |
|                | visualization/evidence         | sections     |
|                | table/detail area              |              |
+----------------+-------------------------------+--------------+
```

Critical changes:

- Remove default global top nav row.
- Remove default editor tab row.
- Remove default persistent bottom panel.
- Preserve workflow navigation in sidebar, but restyle it as product navigation, not Explorer.
- Put active page title and primary action in document header.
- Put chart/table/detail stack in center.
- Put controls/inspector in right panel.

## 10. Proposed Sidebar Structure

```text
SIGS-OGLab / project switch
+ 新建分析
Search
Home
Data
  项目/点位
  数据导入
  数据检查
Analysis
  地层分层
  参数解译
Output
  成果输出
Pinned
  营口 CPT09
bottom utilities
  app grid / help / settings / collapse
```

Notes:

- Do not show status words on every nav item by default.
- Status can appear as small dots/badges only for blocking/warning counts.
- `成果输出` can show a muted lock/blocked dot, not red text.

## 11. Proposed Center Canvas Structure

Project page:

```text
Header: 营口样例 / 项目/点位数据                         核对导入
Controls: 点位 selector | 数据版本 | 深度范围 | 数据源
Summary row: 4-5 compact metrics, no card look
Main: point table
Lower/detail: selected point data coverage table
```

Stratification page:

```text
Header: 营口样例 / 地层分层                              参数试算
Controls: 方案 | 深度窗口 | 证据类型 | 分层状态
Main: layer track + SBTn/evidence visualization
Lower: layer/boundary table
```

Output page:

```text
Header: 营口样例 / 成果预检                              返回参数核对
Controls: 成果包 | artifact type | gate status
Main: output package map
Lower: preflight gate table
```

## 12. Proposed Right Panel Structure

Right panel tabs:

```text
检查 / 图表 / 注释
```

For pages where Mixpanel `Query` maps better:

```text
查询 / 图表 / 注释
```

Preferred Chinese terms:

- `检查` for domain user clarity.
- `查询` if we want stronger Mixpanel resemblance.

Right panel sections:

```text
对象      +
过滤      +
分解/复核 +
输出边界  +
```

Rules:

- Right panel should not repeat the main table.
- It should define what the center canvas is showing.
- Each section should be line/list based, not card-heavy.

## 13. Implementation Planning, No Code Yet

Phase 1: Freeze visual target

- Save current screenshot.
- Save user Mixpanel reference screenshot into `docs/prototype/references/` if user approves.
- Create side-by-side acceptance checklist.

Phase 2: Token recalibration

- Replace blue-grey neutrals with Mixpanel-like neutral greys.
- Remove `#e8f2ff` selected state or convert it to purple-soft.
- Reduce semantic colors in nav.
- Define explicit usage rules for purple.

Phase 3: Shell restructure

- Change workbench from global-top-row layout to three-pane layout.
- Sidebar spans full height.
- Header moves inside content area, not over sidebar.
- Remove editor tab row.
- Hide/collapse bottom panel by default.

Phase 4: Page remapping

- Project page becomes report canvas.
- Import/check/stratification/parameters/output follow same header/control/main/lower pattern.
- Right panel becomes query/inspection builder.

Phase 5: Verification

- 1440x900 and 1920x1080 screenshots.
- Browser text/overflow check.
- Dedicated visual comparison checklist:
  - three-pane structure visible
  - no full-width top bar
  - primary action in content-header top-right
  - create action in sidebar
  - no permanent bottom panel
  - purple used only for primary/active/series
  - neutral background reads clean, not blue-grey

## 14. Open Decisions Before Implementation

1. Primary template strictness:
   - Option A: strict Mixpanel shell.
   - Option B: Mixpanel shell with a slightly stronger engineering data-table density.
   - Recommendation: B.

2. Sidebar primary action:
   - `+ 新建分析`
   - `+ 新建项目`
   - `+ 新建点位`
   - Recommendation: `+ 新建分析` until persistence/project creation is confirmed.

3. Top-right primary action:
   - `保存视图`
   - page-specific action such as `核对导入`
   - no save action yet
   - Recommendation: page-specific action now; `保存视图` only after browser-local view persistence is real.

4. Right panel tab naming:
   - `查询 / 图表 / 注释`
   - `检查 / 图表 / 注释`
   - Recommendation: `检查 / 图表 / 注释` for domain users, but visually mirror Mixpanel Query tabs.

5. Bottom panel:
   - remove from default
   - collapse into an icon/open drawer
   - keep only on debug/log screens
   - Recommendation: remove from default and retain as hidden diagnostics drawer if needed.

## 15. Acceptance Criteria For The Next Implementation Slice

- At 1440x900, the first impression is a three-pane Mixpanel-style report builder.
- Sidebar starts at the top of the app and owns `+ 新建分析`.
- No full-width top nav spans over the sidebar.
- No editor-tab strip appears by default.
- No persistent bottom panel appears by default.
- Center page starts with a document/report header and control row.
- Right panel uses tabbed query/inspection structure.
- Purple is used for:
  - primary button
  - active right-panel tab
  - active nav mark
  - one chart/evidence series
- Purple is not used for every selected row, hover, pill, border, and icon simultaneously.
- Selected states use one consistent purple-soft background.
- Nav statuses do not use red/green text except true blocking counts.
- Text feels compact and aligned; no large cards inside cards.

