# Process040 - Slice A IA And Wording Lock

Date: 2026-07-09

Theme: five-zone IA grouping and wording lock

Status: closed / implemented / verified

## Scope

- Implement the confirmed `Slice A - IA And Wording Lock`.
- Keep the current six workflow pages.
- Visually and textually group the six pages into five feature zones.
- Do not merge `项目/点位数据` and `数据导入` into one page.
- Do not implement deeper business functions, persistence, formal export, or desktop integration.

## User-Confirmed Copy Direction

- Use `已确认` in the UI.
- Do not introduce prototype-heavy parameter/output labels from the earlier plan.
- Use natural product copy in `成果输出区`:
  - `成果清单`
  - `生成条件`
  - `待补全`
  - `可生成`
  - `已生成`
  - `需确认`
- Avoid user-facing action copy such as `正式导出`, `提交成果`, `采纳成果`, and `最终报告`.

## Result

- Left navigation now groups pages as:
  - `数据准备区`: `项目/点位数据`, `数据导入`
  - `数据检查区`: `数据检查`
  - `地层分层区`: `地层分层`
  - `参数解译区`: `参数解译`
  - `成果输出区`: `成果输出`
- Replaced user-facing `阻塞` wording with `问题` wording.
- Replaced `准入` wording with concrete next-step wording such as `进入分层` and `参数解译条件`.
- Reworked output copy around `成果清单`, `生成条件`, `待补全`, and `需确认`.
- Updated E2E tests to assert the five-zone nav grouping and forbid the retired wording.
- Updated `plan.md` and the five-zone blueprint with the final confirmed Slice A wording direction.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 2 tests.
- Browser evidence:
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-default-1440x900.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-default-1920x1080.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-output-1440x900.png`
  - `process_logs/playwright-mcp/slice-a-ia-wording-lock/slice-a-browser-check.json`
- Browser check result:
  - Required five-zone and output terms: present.
  - Retired wording hits: `0`.
  - Unexpected overflow: `0`.
  - Console errors: `0`.
  - Page errors: `0`.

## Dev Server

- Running URL: `http://127.0.0.1:5174/`
- Port `5173` was already in use, so this slice used `5174`.
- PID note is stored in `process_logs/playwright-mcp/slice-a-ia-wording-lock/vite-pid.txt`.

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No new dependency was added.

## Next

- Recommended next slice: `Slice B - Shared Right Panel Contract`.
- Before implementation, provide a confirmation card for right-panel behavior and acceptance checks.
