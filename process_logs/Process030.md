# Process030 - First Page Copy IA De-duplication

Date: 2026-07-09

Status: closed / verified

## Trigger

User flagged that the first page repeats generic wording such as `下一步`, `当前页`, `后续条件`, `流程`, and prototype-boundary copy across the top nav, document tab, central page, right inspector, and bottom panel.

## Scope

- Reduce repetitive visible copy on the project/point page and shared workbench chrome.
- Keep each workbench region distinct:
  - top nav: project and point scope
  - left nav: route navigation
  - page header: current page object and primary action
  - right panel: inspector details
  - bottom panel: selected detail, logs, and boundaries
- Update the reusable Copy / IA agent prompt so duplicate copy becomes a hard P1 finding.
- Update E2E checks for the revised labels.

## Non-goals

- No desktop repository changes.
- No desktop `app_data`, SQLite schema, official formula, persistence, or formal export behavior.
- No component-library migration.

## Verification Plan

- `npm.cmd run build`
- `npm.cmd run test:e2e`
- Browser screenshot review at 1440x900 for the first page.
- Visible-text check for removed phrases on the active page.

## Changes

- Removed route-specific `工作流：...` and `原型限制/只读样例` repetition from the global top nav.
- Removed `当前文档/当前页` copy from the editor tab strip.
- Replaced generic first-page `下一步` copy with concrete actions or objects:
  - `核对导入`
  - `导入核对`
  - `字段映射待核对`
- Renamed table status `当前点位` to `本轮样例`.
- Changed right-panel `当前对象` to `对象`.
- Changed bottom tabs from generic `状态/后续条件` to `详情/边界`.
- Updated `agents/copy-ia-mobbin-challenger.md` so repeated generic process labels are P1 hard-fails.
- Updated `tests/e2e/workbench.spec.ts` for the revised copy and top-nav responsibility.

## Verification Result

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Playwright screenshot:
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-1440x900-final.png`
- Playwright text check:
  - `process_logs/playwright-mcp/copy-ia-dedup/project-page-text-check-final.json`
- Final browser-check summary:
  - `forbiddenHits=[]`
  - `overflowCount=0`
  - `projectPageActive=true`
  - `conciseTopNav=true`
  - `primaryActionRenamed=true`
  - `statusRenamed=true`
  - `noGenericNextStep=true`
  - `noCurrentPageCopy=true`
  - `noAfterConditionTab=true`

## Residual Risk

- The page still intentionally repeats point scope in the top nav, page header, right inspector, and bottom detail because each region has a different job: global scope, page object, inspector field, and selected-detail record.
- Further reduction may be possible after deciding whether the bottom panel should default collapsed on overview-like pages.

## Notes

- Root cause of the miss: earlier checks emphasized route sync, overflow, formal-export safety, and old chrome removal. The Copy / IA agent had a redundancy checklist, but it lacked a hard fail threshold for repeated process labels.
