# Process022 - Web-P2 Slice 2 Project Point Page

Date: 2026-07-09

Status: `closed / verified`

## User Goal

推进 Web-P2 全流程开发。当前切片完成 `项目/点位数据` 页面，让用户能够以营口 CPTU 样例为主线识别当前工程、点位、数据覆盖、源档案与原型预览边界，并顺畅进入 `数据导入`。

## Scope

- Only modify `D:\CPT-UIQA-WebPrototype`.
- Use Yingkou sample/reference data already copied into this workspace.
- Keep browser-only state.
- Do not access desktop runtime state or implement real import/persistence/export.

## Completed

- Added `ProjectPointDocument` in `src/App.tsx`.
- Added `ProjectRightPanel` in `src/App.tsx`.
- Added structured project bottom details in `BottomPanel`.
- Added project page styles in `src/styles.css`.
- Expanded `getProjectPointSummary()` in `src/workflowData.ts`:
  - current point
  - source record count
  - source depth range
  - preview row count
  - preview depth range
  - sample point list
  - source file labels
- Updated `tests/e2e/workbench.spec.ts` to cover:
  - project page content
  - source-vs-preview distinction
  - bottom detail
  - `进入数据导入` transition
- Updated `plan.md`, `docs/prototype/web-p2-feature-development-plan-2026-07-09.md`, and `Process.md`.

## Verification

```powershell
npm.cmd run build
```

Result: passed.

```powershell
npm.cmd run test:e2e
```

Result: passed, 2 tests.

## Playwright MCP Evidence

- Screenshot: `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-1440x900.png`
- Browser check: `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-browser-check.json`
- Console errors: `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-console-errors.md`
- Console warnings: `process_logs/playwright-mcp/web-p2-slice2-project-page/project-page-console-warnings.md`

Browser-check summary:

- Project document visible: yes.
- Right inspector title: `项目/点位数据`.
- Bottom detail includes current point and next step: yes.
- Source-vs-preview distinction visible: yes.
- Forbidden terms found: none.
- Text overflow findings: none.
- Console errors/warnings: 0.

## Boundary

- No files under `D:\CPT-UIQA` were modified.
- No desktop `app_data` was read or written.
- No SQLite schema or persistence behavior was touched.
- No official CPT/CPTU formula or SBT/SBTn production classifier was implemented.
- No real export behavior was implemented.
- No new dependency was installed.

## Residual Risk

- The page uses source-reference counts for CPT19/SCPT1 as sample archive context; those points are not yet selectable workflow objects in browser state.
- Full visual/IA/professional agent review is deferred to Slice 8/9 unless a later UI slice produces P0/P1-level concerns.

## Next

Start Slice 3: build `数据导入` with mapping table, preview table, import issue/detail panel, and next action into `数据检查`.
