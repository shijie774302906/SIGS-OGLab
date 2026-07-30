# Process007 - Ant Design Pro Reference Refactor

Date: 2026-07-08

Status: `closed / verified`

## Scope

- Refactor the Web-P1 `地层分层` content area using Ant Design Pro style patterns while preserving the VSCode-like workbench shell.
- Add a future-callable component candidate list with source links, usage notes, and suggested local paths.
- Keep the prototype isolated from the desktop workspace and production data contracts.

## Design Reference

- Ant Design Pro: https://github.com/ant-design/ant-design-pro
- ProComponents: https://github.com/ant-design/pro-components
- Ant Design Table: https://ant.design/components/table/
- Ant Design component overview: https://ant.design/components/overview/
- shadcn/ui: https://github.com/shadcn-ui/ui
- shadcn/ui docs: https://ui.shadcn.com/docs
- Tabler: https://github.com/tabler/tabler

## Deliverables

- Updated `src/App.tsx`
  - Added Pro-style `PageHeader`, status tags, summary metrics, query bar, scheme list, table toolbar, richer right-panel preflight details, and route/selection scroll reset.
- Updated `src/styles.css`
  - Added Ant Design Pro inspired content tokens, panel treatments, statistic tiles, query fields, ProList/ProTable-like spacing, compact evidence and table density.
- Added `docs/prototype/ui-component-candidates.md`
  - Lists current local component candidates, Ant Design Pro priority references, and other open-source resources with suggested future paths.
- Updated `plan.md`
  - Added current addendum and verification closure.

## MCP Browser Walkthrough

Tool: `mcp__playwright`

Viewport: `1920x1080`

Actions:

1. Opened `http://127.0.0.1:5173`.
2. Clicked workflow nodes: `项目/点位数据`, `数据导入`, `数据检查`, `地层分层`, `参数解译`, `成果输出`.
3. Returned to `地层分层`.
4. Selected `自动分层候选 A`.
5. Selected layer table row `L2`.
6. Switched bottom panel tabs.
7. Checked body text for required terms and forbidden terms.
8. Checked browser console error output.

Findings:

- Initial screenshot showed the document header being pushed above the viewport after MCP scrolled to `L2`.
- Fixed by:
  - resetting the active document scroll on route/scheme change,
  - compressing page header, query bar, layer track, evidence panel, and table density so the main stratification review path fits within the editor viewport at `1920x1080`.

Final browser checks:

- `foundForbidden`: `[]`
- Required visible terms present: `地层分层`, `工程工作台 / CPT09 / 地层分层`, `自动分层候选 A`, `只读投影`, `0.40-0.60 m`
- `document-host` scrollTop after final interaction: `0`
- Console errors: `0`

Evidence:

- Final screenshot: `process_logs/playwright-mcp/web-p1-ant-design-pro-refactor-final-fit.png`
- Snapshot: `process_logs/playwright-mcp/web-p1-ant-pro-refactor-snapshot.md`
- Console log: `process_logs/playwright-mcp/web-p1-ant-pro-refactor-final-console.log`

## Command Verification

```powershell
npm run build
```

Result: passed.

```powershell
npm run test:e2e
```

Result: passed, 2 tests passed.

## Boundary Review

- No files under `D:\CPT-UIQA` were modified.
- No desktop `app_data` was read or written.
- No SQLite schema, production persistence, official formula, or export behavior was changed.
- The prototype still reads copied sample data only.
- The UI still presents projection-only data as `只读投影`; save/adopt/official parameter actions remain disabled.

## Residual Risk

- The refactor borrows Ant Design Pro layout patterns but does not yet use real `antd` or `@ant-design/pro-components`.
- If Web-P2 introduces sorting, filtering, column configuration, forms, or complex CRUD, evaluate installing `antd` first, then `@ant-design/pro-components` through local adapters.

## Next

- Web-P2 can extract local reusable components into:
  - `src/components/workbench/`
  - `src/components/pro/`
  - `src/components/stratification/`
- Use `docs/prototype/ui-component-candidates.md` as the component reference entrypoint before installing external UI packages.

