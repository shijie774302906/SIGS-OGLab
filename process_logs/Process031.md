# Process031 - Mixpanel Template Gap Research

Date: 2026-07-09

Status: closed / research documented

## Trigger

User requested a research-only round using Mobbin or Mixpanel as the template. The focus is visual and layout difference-finding:

- format
- color and palette usage
- typography
- layout
- three-pane structure
- top bar differences
- generic button placement such as create project/new project

## Boundary

- No implementation in this round.
- No component-library migration.
- No formal save/create/export behavior is promised.
- No desktop repo, desktop `app_data`, SQLite schema, official formula, persistence, or export behavior touched.

## Research Inputs

- User-provided Mixpanel-style screenshot.
- Current prototype screenshot:
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-1440x900-final.png`
- Current code references:
  - `src/App.tsx`
  - `src/styles.css`
- Mixpanel official docs:
  - Insights report concepts: metrics, filters, breakdowns, chart types, save/reuse.
  - Reports overview concepts: global filters, inline filters, breakdowns, date range, comparisons.

## Mobbin Status

- Attempted `mcp__mobbin.search_flows` twice.
- Both attempts returned `OAuth authorization required`.
- This process note does not claim Mobbin-returned images or flows were inspected.

## Result

Created detailed research and planning document:

- `docs/prototype/mixpanel-template-gap-analysis-2026-07-09.md`

Main conclusions:

- Current prototype is still structurally closer to a VSCode/workbench hybrid than Mixpanel.
- Mixpanel target should be treated as a three-pane product shell:
  - left sidebar
  - center report canvas
  - right query/inspector panel
- Current full-width global top nav, editor tab row, and persistent bottom panel should not exist in the default Mixpanel-like shell.
- Current palette uses too many blue-grey neutrals and conflicting selected/semantic colors.
- Purple should be restricted to primary actions, active query/nav states, and one evidence/chart series.
- Sidebar should own `+ 新建分析`; formal `+ 新建项目` requires explicit persistence confirmation.
- Top-right document action should not become `保存` until actual save behavior exists.

## Next Implementation Candidate

If approved, next slice should be:

```text
Mixpanel Shell Refactor P0
1. remove full-width top nav from default layout
2. make sidebar full-height
3. add sidebar + 新建分析 button
4. replace editor tabs with document header
5. remove/collapse default bottom panel
6. recalibrate neutral/purple palette
7. map right panel to 检查 / 图表 / 注释 tabs
```

## Verification Needed For Future Implementation

- 1440x900 screenshot.
- 1920x1080 screenshot.
- Browser overflow check.
- Visual checklist against `docs/prototype/mixpanel-template-gap-analysis-2026-07-09.md`.
- Copy/IA agent review for button labels and persistence implications.
