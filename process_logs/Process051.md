# Process051 - Data Import First Look Hierarchy

Date: 2026-07-10

Status: `closed / implemented / verified`

## Theme

Rebuild the `数据导入` page hierarchy around a clear First Look task anchor.

## User Problem

The first page hierarchy pattern worked well. The second page still showed upload, templates, field mapping, preview, and problems with similar visual weight. Users needed a clear first look: whether a draft exists, whether it can be checked, and what to do next.

## Scope

- Add `import-first-look`.
- Derive four import states from the current `ImportDraft`.
- Keep exactly one strongest primary action in the import document.
- Demote the metrics row to a secondary summary.
- Keep upload, problem list, mapping, and preview functional.
- Demote right-inspector check action from primary to normal tool button.
- Update Playwright coverage for empty, ready, issue, and stale states.

## Result

- Added `import-first-look` above the import metrics and detail panels.
- Added state copy for:
  - `当前项目还没有导入草稿`
  - `导入草稿已生成，可进入数据检查`
  - `导入草稿存在问题，暂不能检查`
  - `导入草稿已更新，需要重新检查`
- Moved the central `run-data-check` primary action into First Look for ready/stale states.
- Added First Look upload action for empty/issue states.
- Moved template action anchors to First Look and renamed lower detail anchors.
- Kept field mapping, raw header, normalized preview, and full problem list available below.
- Updated the import right inspector heading from `批次选择` to `导入动作`.
- Demoted `dock-run-data-check` from primary to normal button.

## Verification

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 6 tests.
- Browser screenshot check passed:
  - Empty state primary count: `1`.
  - Ready state primary count: `1`.
  - Issue state primary count: `1`.
  - Stale state primary count: `1`.
  - Console errors: `0`.
  - Page errors: `0`.

## Evidence

- `process_logs/playwright-mcp/import-first-look-hierarchy/browser-check.json`
- `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-empty-1440x900.png`
- `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-ready-1440x900.png`
- `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-issue-1440x900.png`
- `process_logs/playwright-mcp/import-first-look-hierarchy/import-first-look-stale-1440x900.png`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- No CSV parsing behavior or Excel parser behavior was changed.

## Next

Review the second-page screenshots. If accepted, apply the same First Look rule to `数据检查`, then continue into `地层分层`.
