# Process150 — 分层来源一致性与安全回退

Status: `closed / implemented / verified`

Date: `2026-08-03`

## Goal

修复 JTS 自动候选刚生成便返回上一步时，撤销快照与当前方案来源不一致、权威存储拒绝保存的问题；把向导回退和普通编辑撤销分离，并让失败提示准确说明原因。

## Root Cause

- JTS 候选先以 `manual` 来源创建边界和撤销快照，最后才把工作副本、基线及方案改为 `jts-classification`。
- 顶部“返回上一步”把普通边界编辑 `undoStack` 当成了向导阶段历史，零整理、零逐层确认时会恢复到异源快照。
- 旧回归覆盖了薄层整理后或“使用当前分层”后的返回，没有覆盖候选生成后立即返回。

## Implementation

- 在创建任何边界命令和撤销快照前冻结 JTS 来源，使 scheme、working、baseline、undo、redo 同源。
- 向导回退只读取显式整理/确认历史；新候选没有流程历史时整体放弃候选并返回生成方式。
- 返回确认框等待 IndexedDB 持久化成功后才关闭；失败时保留确认框并显示“返回尚未保存”。
- 为 `stratification edit session changed its scheme origin` 增加专项诊断，不再误导用户检查 qc、fs、u2。

## Verification

- `npm.cmd run build`：通过。
- `npx.cmd playwright test tests/e2e/jts-classification-ui.spec.ts tests/e2e/stratification-workflow-ui.spec.ts tests/e2e/jts-classification-stratification.spec.ts tests/e2e/workspace-storage-recovery.spec.ts --project=chromium --workers=1 --reporter=line`：33 passed，1 skipped。
- 双分辨率证据：`process_logs/playwright-mcp/process150-stratification-origin-rollback/`。
- `browser-check.json`：1440×900、1920×1080 无横向溢出；返回后 `schemeCount=0`；`saveAlertCount=0`；`browserErrors=[]`。

## Knowledge

- 新增 `KPB-034`：自动候选在建立撤销快照后改写来源导致回退保存失败。
- Known Problem Gate：9 个重要问题均有证据处置，1 个界面提示已记录。

## Evidence

- `process_logs/playwright-mcp/process150-stratification-origin-rollback/evidence-manifest.json`
- `process_logs/playwright-mcp/process150-stratification-origin-rollback/browser-check.json`
- `process_logs/playwright-mcp/process150-stratification-origin-rollback/return-without-review-1440x900.png`
- `process_logs/playwright-mcp/process150-stratification-origin-rollback/return-without-review-1920x1080.png`
- `process_logs/knowledge-reviews/Process150.json`

## Boundaries

- 未修改 JTS、Fuzzy、Schneider、Robertson 公式、分类区间或工程结论。
- 未修改 qc、fs、u2 原始测量、层合并算法、参数解译或成果输出。
- 未处理历史损坏数据迁移；旧异常记录仍由现有恢复提示保护。
