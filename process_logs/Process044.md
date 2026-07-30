# Process044 - Flow 1 Random CPTU Implementation

Date: 2026-07-09

Theme: seed-driven random CPTU Flow 1 implementation and Playwright acceptance

Status: closed / implemented / verified

## Scope

Implemented the approved Flow 1 direction:

```text
随机生成 CPTU 点位数据
  -> 确认随机案例
  -> 核对导入批次、字段和预览
  -> 运行数据检查
  -> 查看一个仅提示项
  -> 确认可进入地层分层
```

## Changes

- Added seed-driven random CPTU data generation in `src/workflowData.ts`.
- Added random Flow 1 case objects:
  - `SyntheticCase`
  - `Point`
  - `ImportBatch`
  - `FieldMapping`
  - `PreviewRows`
  - `CheckRun`
  - `IssueEvidence`
- Updated `src/App.tsx` so Flow 1 starts on `项目/点位数据`.
- Added visible Flow tags:
  - `Flow 1`
  - `F1-RANDOM-<seed>`
  - `步骤 1/3`
  - `步骤 2/3`
  - `步骤 3/3`
  - `当前交接物`
- Reworked the three Flow 1 pages:
  - `项目/点位数据`: random case, selected point, coverage, point tools.
  - `数据导入`: random import batch, required field mapping, unit/depth preview, precheck.
  - `数据检查`: rule groups, issue evidence, selected notice detail, right-dock recommendation.
- Updated right functional dock roles:
  - project dock: point tools and coverage filter.
  - import dock: batch, mapping, precheck readiness.
  - check dock: rule filter, issue locator, recommendation, continue action.
- Updated Playwright E2E to simulate the human Flow 1 path and write evidence.
- Updated Vite watch config to ignore Playwright/process evidence directories.

## Verification

Commands:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Results:

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Flow 1 Playwright path passed with seed-driven random data.
- Browser console errors: `[]`.
- Page errors: `[]`.
- Overflow count: `0`.
- The Flow 1 UI path did not show fixed Yingkou/CPT09 text.

## Evidence

- `process_logs/playwright-mcp/flow-1-random-case/flow-run.json`
- `process_logs/playwright-mcp/flow-1-random-case/flow-1-project-1440x900.png`
- `process_logs/playwright-mcp/flow-1-random-case/flow-1-import-1440x900.png`
- `process_logs/playwright-mcp/flow-1-random-case/flow-1-check-selected-issue-1440x900.png`
- `process_logs/playwright-mcp/flow-1-random-case/flow-1-check-selected-issue-1920x1080.png`

Latest `flow-run.json` summary:

- seed: `60646675`
- case: `F1-RANDOM-60646675`
- point: `AUTO-CPTU-46675`
- clicked issue: `check-water-depth-source`
- check counts: `0` issue, `2` notice, `3` passed
- final route: `stratification`

## Boundary

- No desktop repo files were modified.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No real file upload, real import parsing, real repair, or formal output was implemented.
- Later pages still consume existing copied sample fixtures unless they are part of a future Flow slice.

## Next

Review the Flow 1 screenshots and decide whether the next Flow should continue from:

```text
数据检查 -> 地层分层
```

or first broaden Flow 1 with additional random scenarios such as missing field or non-increasing depth.
