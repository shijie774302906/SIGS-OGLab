# Process046 - 数据导入异常与模板 P0

Date: 2026-07-09

Status: `closed / implemented / verified`

## Scope

Current slice:

```text
数据导入异常与模板 P0
```

Primary contract:

- `docs/prototype/数据导入异常与模板合同.md`

Covered events:

- DI-E01: 模板入口和待选择状态。
- DI-E02: 不支持文件。
- DI-E03: Excel 已选择但需要后续解析器。
- DI-E04: 空文件或不可解析 CSV。
- DI-E05 / DI-E06 / DI-E07 / DI-E08: 缺必需字段。
- DI-E09: 建议字段缺失提示。
- DI-E10: 点位与当前点位不一致。
- DI-E12: 非数字单元格。
- DI-E13: 深度不递增。
- DI-E14: 深度超过最终孔深。
- DI-E16: 检查后导入变更导致旧检查失效。
- DI-E18: 从检查问题返回导入定位。

## Implementation

- Upgraded `docs/prototype/数据导入异常与模板合同.md` from stored reference to active implementation contract.
- Rewrote `plan.md` for this slice and marked closure after verification.
- Added template actions in `数据导入`:
  - 下载空模板。
  - 下载示例模板。
  - 复制标准表头。
- Extended the browser import draft model with:
  - `problems`
  - `version`
  - `filePointNames`
  - `pointDecision`
- Changed CSV parsing so missing fields preserve headers and raw preview instead of becoming a generic parse failure.
- Added visible problem cards in the center surface and matching right dock actions.
- Added point mismatch decision actions:
  - 作为新点位草稿。
  - 替换当前点位。
  - 取消导入。
- Added import precheck problems for:
  - required fields
  - non-numeric cells
  - non-increasing depth
  - depth exceeding final depth
- Added stale check behavior:
  - data check stores the checked draft version
  - uploading or resolving a new draft version marks old check as `需重新检查`
  - stale check disables continuing to `地层分层`

## Verification

Commands:

```powershell
npm.cmd run build
npm.cmd run test:e2e
```

Results:

- `npm.cmd run build` passed.
- `npm.cmd run test:e2e` passed: 4 tests.

Playwright coverage:

- Normal generated CSV upload flow.
- Template download action.
- Excel pending parser state.
- Unsupported file state.
- Missing `DepthM`.
- Non-increasing depth.
- Depth exceeding final depth.
- Point mismatch and recovery through `作为新点位草稿`.
- Stale check after uploading a new draft.
- Rerun check recovery.

Evidence:

- `process_logs/playwright-mcp/flow-1-upload-action/flow-run.json`
- `process_logs/playwright-mcp/flow-1-import-exceptions/flow-run.json`
- `process_logs/playwright-mcp/flow-1-import-exceptions/missing-depth-1440x900.png`
- `process_logs/playwright-mcp/flow-1-import-exceptions/nonmonotonic-depth-1440x900.png`
- `process_logs/playwright-mcp/flow-1-import-exceptions/point-mismatch-resolved-1440x900.png`
- `process_logs/playwright-mcp/flow-1-import-stale-check/flow-run.json`
- `process_logs/playwright-mcp/flow-1-import-stale-check/import-needs-recheck-1440x900.png`
- `process_logs/playwright-mcp/flow-1-import-stale-check/check-stale-1440x900.png`

## Boundary

- No desktop repo files were changed.
- No desktop `app_data`, SQLite schema, official formula, persistence, or export behavior was touched.
- Excel parsing is not implemented; it remains a visible pending-parser state.
- Multi-point file splitting is only detected and held for confirmation; no batch split implementation was added.
- Template download is prototype CSV generation only, not formal export.

## Next

- Decide whether to implement P1 unit confirmation and field remapping UI next.
- Decide whether multi-point split should become a dedicated flow or stay as an import exception.
- Consider adding a clear-draft confirmation dialog once replacement/clear behavior becomes user-facing.
