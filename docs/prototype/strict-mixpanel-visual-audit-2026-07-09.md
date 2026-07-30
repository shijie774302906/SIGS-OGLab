# Strict Mobbin Mixpanel Visual Audit

Date: 2026-07-09

Status: audit complete / no implementation

Scope: `D:\CPT-UIQA-WebPrototype`

## 1. Evidence

Current UI evidence:

- `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-default-1920x1080.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-stratification-interaction-1440x900.png`
- `process_logs/playwright-mcp/strict-mixpanel-audit/current-browser-check.json`
- `src/App.tsx`
- `src/styles.css`

Mobbin Mixpanel references:

- [Mixpanel report screen](https://mobbin.com/screens/fe3a72f4-3c32-4f26-9f4b-82771cb63268)
- [Mixpanel saved report screen](https://mobbin.com/screens/fa5b6186-fa90-4744-a4e6-fd6bc73717b1)
- [Mixpanel legend interaction screen](https://mobbin.com/screens/f7c92462-c174-44ea-8f02-7616de46b0fd)
- [Mixpanel date picker screen](https://mobbin.com/screens/f097d25f-a8b4-414a-8b85-370bd45ca9ec)
- [Mixpanel annotation filter screen](https://mobbin.com/screens/ed7afa25-3ac4-414f-bb8d-00d07bb81729)
- [Mixpanel segment selection screen](https://mobbin.com/screens/e83ef8ac-07c8-49c2-9e64-9ee058263cd2)
- [Mixpanel comparison menu screen](https://mobbin.com/screens/de684694-86ae-4db7-9d13-4ca3dff84363)
- [Mixpanel export toast screen](https://mobbin.com/screens/d17bbb64-507e-4b1d-9e7d-efa4e0e5402a)
- [Creating a report flow](https://mobbin.com/flows/46ced5e4-fdc6-4bd5-b3d2-558ae7861806)
- [Filtering a report flow](https://mobbin.com/flows/119b245f-160d-4308-bbb4-04403ceaf5a7)

Browser check:

- Console errors: `0`
- Page errors: `0`
- Current structural flags: `hasGlobalTopNav=true`, `hasEditorTabs=true`, `hasBottomPanel=true`
- Current 1440 layout rects:
  - `.global-top-nav`: `1440 x 42`
  - `.explorer`: `224 x 858`, starts at `y=42`
  - `.editor-tabs`: `916 x 34`
  - `.document-host`: `916 x 728`
  - `.right-panel`: `300 x 858`, starts at `y=42`
  - `.bottom-panel`: `916 x 96`

## 2. Overall Judgment

The current UI is functionally coherent for the geotechnical workflow, but visually it is still a hybrid of VSCode-like workbench, enterprise admin page, and Mixpanel-inspired report canvas. It is not yet close enough to Mixpanel as a strict visual template.

The biggest gap is structural, not decorative. Mixpanel's screens are organized as a product analytics shell: full-height sidebar, center report canvas, right query/chart/annotation panel. The current prototype adds a global top nav, editor tab row, and permanent bottom panel, which creates an IDE/workbench feeling and reduces the center canvas from a report surface into a nested document area.

Current Mixpanel closeness score: `2.4 / 5`.

## 3. Score Matrix

| Dimension | Score | Judgment |
| --- | ---: | --- |
| Shell layout | 2 | Too many bands: global top nav, editor tab, bottom panel. |
| Sidebar | 2 | Starts below top nav, lacks `+ 新建分析`, overuses status labels. |
| Header/actions | 2 | Page title and action hierarchy are split across top nav, tab, content header. |
| Palette | 2 | Purple exists, but blue selected states and green/red nav statuses dilute it. |
| Cards/borders/radii | 2 | Too many framed bands and near-identical card layers. |
| Typography/density | 3 | Compact, but Chinese font weight and badge density feel admin-like. |
| Charts/tables | 3 | Domain evidence is useful, but visual grammar is less refined than Mixpanel. |
| Right panel | 2.5 | Inspector is useful, but not yet Mixpanel's Query/Chart/Annotations builder. |
| Business fit | 4 | The engineering workflow and prototype boundaries are clear. |

## 4. P0 Findings

### P0-1. The shell structure still blocks the Mixpanel target

Current behavior:
- The app uses a full-width top nav across all columns.
- The sidebar starts below that nav.
- The center has an editor tab row.
- The bottom panel is permanently visible.
- Browser evidence confirms `hasGlobalTopNav=true`, `hasEditorTabs=true`, and `hasBottomPanel=true`.

Why this fails:
- Mixpanel's primary rhythm is a report-builder shell, not an IDE shell.
- The extra rows make the product feel like a development workspace rather than an analytics workbench.
- At 1440x900, the document host is only `728px` tall, while the permanent bottom panel takes `96px`.

Mixpanel lesson:
- In the referenced Mixpanel report screens, the user sees sidebar + report canvas + query panel as the dominant composition.
- Interaction details appear as popovers, right-panel controls, or toasts, not as a permanent bottom workbench panel.

Suggested adjustment:
- Move to a strict three-pane layout: sidebar, center report canvas, right query/inspector panel.
- Remove the editor tab row from the default view.
- Remove the permanent bottom panel from the default view.
- If a top product bar is retained, make it Mixpanel-like and integrated with product navigation; do not keep the current workflow/context top strip.

### P0-2. The current page still reads as "tool chrome around a document", not "report canvas"

Current behavior:
- The center area begins with a tab, then breadcrumbs, badges, chips, warning strip, metrics, chart, table, and bottom detail.
- The visual hierarchy is a stack of operational UI bands.

Why this fails:
- Mixpanel's report canvas is simpler: title/actions, control row, visualization, then breakdown table.
- The current design asks the user to parse many small UI strips before the analysis surface becomes primary.

Mixpanel lesson:
- Mixpanel separates report definition into the right panel and keeps the center canvas focused on the chart/table result.

Suggested adjustment:
- For every route, use one consistent center pattern:
  `document header -> control row -> main visualization/table -> lower result table`.
- Move secondary detail, filters, and annotations to the right panel or contextual popovers.

## 5. P1 Findings

### P1-1. Sidebar does not yet carry Mixpanel's product rhythm

Current behavior:
- Sidebar is a workflow navigator with status words on every route.
- There is no prominent `+ 新建分析`.
- Footer repeats status text.
- `成果输出` shows red text in the nav.

Why this fails:
- Mixpanel's sidebar is a product home: project switch, `+ Create New`, search, nav groups, pinned boards.
- Status words in every nav item make the left rail noisy and less product-like.

Suggested adjustment:
- Add a primary sidebar action `+ 新建分析`.
- Group nav into `Data / Analysis / Output`.
- Replace full status text with subtle dots or counts only when necessary.
- Move footer status into route-specific right-panel or result summary.

### P1-2. Palette is close in intention but not disciplined

Current behavior:
- Primary purple is `#5b43e6`.
- Selected color is blue `#e8f2ff`.
- Success/warning/danger appear in nav, badges, rows, warning strips, and table states.
- CSS contains several near-neutrals: `#f3f5f8`, `#f7f8fa`, `#f5f6f8`, `#e7eaf0`, `#eceaf3`.

Why this fails:
- Mixpanel's purple is a controlled product accent, not one of many competing semantic colors.
- Current blue selected states conflict with the purple target.
- Green/red nav statuses make the sidebar look operationally noisy.

Suggested adjustment:
- Use one neutral system:
  - app background `#F7F7F8`
  - canvas `#FFFFFF`
  - muted surface `#FAFAFB`
  - border `#E8E8EC`
  - strong border `#DADAE2`
- Replace blue selected state with purple-soft.
- Restrict purple to primary action, active nav mark, active query tab, and one chart/evidence series.
- Keep semantic colors local to warnings and blocking decisions, not default nav labels.

### P1-3. Card and border layers are too numerous

Current behavior:
- The page has many framed units: metrics strip, warning strip, chart panel, table area, right query cards, bottom detail cards.
- Several containers use 5-6px radii and light borders, creating a grid of boxes.

Why this fails:
- Mixpanel uses light dividers and flat surfaces more than card stacking.
- Too many boxes make the UI feel like a component demo rather than a mature analytics product.

Suggested adjustment:
- Reduce card count.
- Use full-width canvas sections separated by single hairline dividers.
- Keep small radii, but apply one radius rule consistently.
- Do not place small cards inside bigger cards unless the grouping is semantic.

### P1-4. Right panel is useful but not Mixpanel-like enough

Current behavior:
- Right panel title says `检查器`.
- It presents route-specific properties, current boundary, current layer, and parameter entry.
- It does not visually present the Query / Chart / Annotations grammar seen in Mixpanel.

Why this fails:
- Mixpanel's right panel is the control model of the report: Metrics, Filter, Breakdown, chart type, annotations.
- Our right panel often reads as a detail inspector after the fact.

Suggested adjustment:
- Add right-panel tabs: `检查 / 图表 / 注释` or `查询 / 图表 / 注释`.
- Structure sections as:
  `对象 +`, `过滤 +`, `分解/复核 +`, `输出边界 +`.
- Keep detail rows compact and line-based.
- Avoid repeating center-table data.

### P1-5. Typography is compact but not polished enough

Current behavior:
- Font stack starts with `"Microsoft YaHei UI"` before `system-ui`.
- H1 is 18px and bold.
- Many badges and chips are 12px, creating visual crowding.

Why this fails:
- Mixpanel relies on compact but crisp typography, with a calmer relationship between title, controls, chart labels, and table text.
- YaHei-first rendering can look heavier and wider on Windows, especially in dense Chinese UI.

Suggested adjustment:
- Reorder font stack to:
  `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei UI", Arial, sans-serif`.
- Keep page titles 14-16px in the report shell.
- Use 11-12px labels and 12px table text with tabular nums.
- Reduce status chips around the title.

### P1-6. Chart/table surface needs a more mature analytics-product grammar

Current behavior:
- The SBTn evidence panel is domain-relevant but visually heavier than Mixpanel's line chart and breakdown table.
- Soil blocks, dashed boundary markers, warning chips, legend, table, and bottom review items all compete in one viewport.

Why this fails:
- Mixpanel lets the chart own the top half and the breakdown table own the lower half.
- The current visual field has too many highlighted elements at once.

Suggested adjustment:
- Treat the geotechnical visualization as the report chart.
- Put one toolbar above it.
- Use subtler gridlines and fewer simultaneous highlights.
- Let selected layer/boundary be the only strong highlight.
- Make the table below feel like Mixpanel's breakdown table: compact rows, low-contrast header, consistent selected row.

### P1-7. Button hierarchy is not yet Mixpanel-like

Current behavior:
- Top nav has search/tools.
- Page header has `进入参数解译试算`.
- Sidebar has no create action.
- Right panel has small plus-like section actions in some areas but not a unified model.

Why this fails:
- Mixpanel uses `+ Create New` in sidebar and `Save` or report action in the document header.
- Current action locations are split across UI layers.

Suggested adjustment:
- Sidebar: `+ 新建分析`.
- Document header top-right: one page-specific primary action.
- Right panel: small `+` per section.
- Remove action-like status text that is not clickable.

## 6. P2 Findings

### P2-1. Radius scale needs a lock

Current behavior:
- Radius values vary across 3px, 4px, 5px, and 6px.

Suggested adjustment:
- Use 4px for chips/inputs/buttons, 6px for only larger bounded panels, or choose one rule and enforce it.

### P2-2. Hover/selected states should stop mixing blue, grey, and purple

Current behavior:
- Hover can be grey, purple-soft, blue-ish, or white depending on area.

Suggested adjustment:
- Use neutral hover for passive rows.
- Use purple-soft for active/selected only.

### P2-3. Domain colors need to become data colors, not container colors

Current behavior:
- Soil colors occupy large blocks and compete with UI states.

Suggested adjustment:
- Keep soil colors for data marks and thin fills.
- Avoid making them read like UI cards or status backgrounds.

## 7. Refactor Priority

Priority 1: Shell refactor.
- Three-pane layout.
- Sidebar full height.
- Remove editor tab row.
- Remove permanent bottom panel.
- Move document title/actions into center header.

Priority 2: Sidebar and action model.
- Add `+ 新建分析`.
- Re-group nav.
- Remove status text from every nav item.
- Put page action in content-header top-right.

Priority 3: Token and palette recalibration.
- Neutral greys.
- Purple-soft selected state.
- Semantic colors only for local status.
- One radius rule.

Priority 4: Right panel as query/inspection builder.
- `检查 / 图表 / 注释` tabs.
- Compact section rows with small plus actions.
- Avoid property-card stacking.

Priority 5: Center report canvas.
- One control row.
- One main visualization area.
- One lower table area.
- Inline or popover details instead of bottom panel.

Priority 6: Chart/table polish.
- Reduce simultaneous highlights.
- Refine SBTn evidence style.
- Align table density and selected-row treatment to Mixpanel.

## 8. Recommended Next Slice

Recommended implementation slice:

```text
Strict Mixpanel Shell Refactor
1. Convert root grid to sidebar / center canvas / right panel.
2. Remove default editor tabs and bottom panel.
3. Move current route title and primary action into center document header.
4. Add sidebar + 新建分析 and grouped nav.
5. Add right-panel tabs: 检查 / 图表 / 注释.
6. Recalibrate neutral/purple selected tokens.
7. Verify at 1440x900 and 1920x1080.
```

Do not implement this slice until approved.

## 9. Residual Risks

- Some Mixpanel references include a purple top product bar while others use a white top edge. The implementation decision should not be "top bar yes/no" mechanically; the key is whether the shell reads as a unified analytics product rather than IDE chrome.
- The geotechnical visualization cannot become a generic Mixpanel line chart. It should inherit Mixpanel's surface discipline while preserving engineering evidence semantics.
- `+ 新建分析` must remain browser-local/prototype-safe unless persistence is explicitly confirmed.
