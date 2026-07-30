# Multi-Agent UI Rereview - IA Copy And Layout Safety

Date: 2026-07-08

Scope: post-implementation review of the Mixpanel-inspired workbench refactor for `地层分层`.

Reviewed evidence:
- `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-1440x900.png`
- `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1440x900.png`
- `process_logs/playwright-mcp/ia-copy-layout-safety/ia-copy-layout-final2-interaction-1920x1080.png`
- `src/App.tsx`
- `src/styles.css`
- `tests/e2e/workbench.spec.ts`

## Reviewers

- Maxwell: layout consistency, spacing, density, clipping.
- Parfit: Mixpanel reference alignment and product fit.
- Rawls: Chinese copy, domain language, prototype boundary wording.
- Kepler: IA and workflow coherence.

## Findings And Closure

### Closed During This Slice

- Global top nav no longer hard-codes `工作流：地层分层`; it follows the active workflow route.
- Project page copy no longer skips directly from `项目/点位数据` to `地层分层`; it points to `数据导入` first.
- Bottom panel content is route-aware instead of always showing the last stratification scheme.
- Right panel no longer presents itself as a Mixpanel query builder; it is now `方案检查` with `方案 / 层位 / 说明`.
- Dangerous prototype wording was removed from visible UI: no `保存草稿`, `采纳为当前分层`, `导出视图`, `正式参数输入`, `只读投影`, `可写`, `后再进入正式流程`.
- `已采纳 / 当前采用` was replaced in visible UI with sample-boundary wording such as `样例当前`.
- SBTn evidence now includes lightweight zones, guide lines, selected-layer evidence highlighting, and a visible legend.
- The right scheme list is no longer clipped.
- The 1920 evidence panel no longer stretches into a large blank card.
- The 1440 viewport keeps both the evidence profile and the layer table visible.

### Residual P2 Notes

- The shell is still a hybrid: Mixpanel-inspired top/report/right-panel treatment plus a VSCode-like workflow rail. This is intentional for this engineering workbench.
- Several future flows still need purpose-built screens: data import mapping, data checks, parameter trial, and output preflight.
- The SBTn zones are still illustrative for prototype review, not an official classification implementation.

## Verification

- `npm run build`: passed.
- `npm run test:e2e`: passed.
- Playwright MCP 1440 and 1920 walkthrough: passed.
- Final browser check:
  - forbidden visible terms: none
  - console warnings: 0
  - console errors: 0
  - right scheme list: no clipping
  - layer table visible in viewport

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official algorithm, persistence, or export behavior was touched.
- The prototype still uses copied sample data only.
