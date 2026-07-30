# Process045 - First Three Pages Upload Action Flow

Date: 2026-07-09

Theme: user-action-driven first three pages with generated CSV upload

Status: closed / implemented / verified

## Scope

Implemented the confirmed first-three-page action flow:

```text
项目/点位数据
  -> 数据导入
  -> 数据检查
  -> 返回数据导入定位字段
  -> 再次数据检查
  -> 进入地层分层
```

The goal was to stop treating Flow 1 as an internal random-data self-check and make the UI support a human-style upload and review path.

## Changes

- Rewrote `plan.md` as the current active slice only.
- Added an app-level import draft state in `src/App.tsx`.
- Added browser-side CSV parsing without adding a dependency.
- Added explicit Excel selection handling:
  - `.xlsx` / `.xls` files can be selected.
  - The UI reports that a later parser is required.
  - The UI does not claim Excel parsing succeeded.
- Reworked `数据导入`:
  - upload area
  - import draft summary
  - parsed row count
  - field mapping table
  - raw header preview
  - normalized preview table
  - `用于数据检查` action
- Reworked `数据检查`:
  - checks are generated from the active import draft
  - issue list includes required fields, depth, water depth source, Fr range, and continue decision
  - selected issue shows field, depth, row range, source, impact, and next action
  - `返回数据导入并定位字段` focuses the import mapping row and right dock field detail
- Reworked right functional dock behavior:
  - project dock can enter data import
  - import dock can select fields and run data check
  - check dock can return to import or continue to stratification
- Updated `tests/e2e/workbench.spec.ts`:
  - generates a random CSV under `process_logs/playwright-mcp/flow-1-upload-action/input/`
  - uploads it through the browser file input
  - validates mapping, preview, data check, issue location, return-to-import, and final route

## Verification

Commands:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Results:

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Latest Playwright run generated and uploaded:
  - `AUTO-CPTU-57529-upload-77057529.csv`
  - row count: `46`
- Flow reached `地层分层`.
- Overflow count: `0`.
- Console errors: `[]`.
- Page errors: `[]`.

## Evidence

- `process_logs/playwright-mcp/flow-1-upload-action/flow-run.json`
- `process_logs/playwright-mcp/flow-1-upload-action/input/AUTO-CPTU-57529-upload-77057529.csv`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-project-1440x900.png`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-import-uploaded-1440x900.png`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-check-selected-issue-1440x900.png`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-return-import-waterdepth-1440x900.png`
- `process_logs/playwright-mcp/flow-1-upload-action/flow-1-stratification-1920x1080.png`

Latest `flow-run.json` summary:

- seed: `77057529`
- case: `F1-RANDOM-77057529`
- point: `AUTO-CPTU-57529`
- generated file: `AUTO-CPTU-57529-upload-77057529.csv`
- clicked issue: `check-water-depth-source`
- check counts: `0` issue, `2` notice, `3` passed
- final route: `stratification`

## Boundary

- No desktop repo files were modified.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- CSV parsing is browser prototype logic only.
- Excel is not parsed in this slice.
- The UI does not perform formal save, formal import commit, formal adoption, or formal export.
- Later pages still consume existing copied sample fixtures unless they are part of a future confirmed slice.

## Next

Recommended next slice:

```text
数据导入问题场景
```

Suggested scenarios:

- missing required field
- non-increasing depth
- depth exceeds final depth
- Excel parser dependency decision
- multiple uploaded point files and point ownership handling
