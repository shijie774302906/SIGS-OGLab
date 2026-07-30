# Process084 - 新项目点位身份与数据检查原子交接

Date: 2026-07-13

Status: `closed / implemented / verified`

## Goal

解决全新项目上传有效 CPT/CPTU 文件后，系统把展示占位词“待导入点位”保存为正式工程点位的问题。用户只需确认一次真实点位名称，系统随后原子创建点位、绑定导入草稿、运行检查并进入数据检查。

## Root Cause

- 文件无 PointName 列、文件名也不含可信点名时，旧桥接把 UI 展示值“待导入点位”投影成了持久化点位。
- 原测试只验证行数、路由和检查次数，没有断言工程点位身份有效。
- 数据导入页中心与右侧曾同时显示“运行数据检查”，但两处都没有补齐点位身份决定。

## Implemented

- 将“待导入点位”和 `pending-point` 定义为保留名称；创建、重命名、复制和导入目标均不能使用。
- 活动点位、重命名历史、导入身份上下文和删除记录恢复会统一清除保留别名，旧占位词不能再参与后续点位匹配。
- 全新项目上传无可信点名的文件后，先显示短弹窗“这份数据属于哪个点位？”。
- 弹窗只包含文件/有效行摘要、一个点位名称输入、`暂不创建点位` 和唯一主要动作 `创建点位并运行检查`；轻量三步提示说明确认后会自动检查并进入分层。
- 未确认前，解析结果仅保留在当前页面，不写入点位、导入批次、草稿或检查记录。
- `暂不创建点位` 不丢弃解析结果；页面中心保留 `填写点位名称` 恢复入口，右侧只说明文件尚未写入项目。
- 确认后，以一次持久化提交创建正式点位、导入草稿和检查记录；成功后直接进入数据检查。
- 保存冲突或写入失败时不更新页面权威状态，不产生半提交点位；弹窗保留输入并提示重试。
- 已经持久化的旧占位点位会自动打开同一恢复弹窗，改为真实名称后继续检查。
- 移除右侧重复的“运行数据检查”；中心页面保持唯一主要动作。
- 数据检查右侧的三个平滑选项统一降为中性次要操作，不与中心“进入地层分层”竞争主视觉。
- 导入与检查同一次迁移时保留当前检查修订及其问题 ID，避免新点位创建后检查被迁移逻辑清空。
- 真实 Yingkou 长链路的测试预算由 6 分钟调整为 12 分钟；单跑证实完整闭环约 5.2 分钟，性能债务没有被标记为已解决。

## Verification

- `npm.cmd run build`: passed。
- 新项目专项：正常确认、旧占位恢复、多标签保存冲突 `3/3` passed。
- 相关导入、点位生命周期、持久化、工作区和真实 Yingkou 回归：除旧 6 分钟预算外 `34/36` 通过；真实链路单跑在新预算内通过。
- 最终完整 Chromium Playwright：`217/217` passed，约 `5.9 min`。
- 真实 Yingkou 三点位、刷新切换、JTS 分类、分层、参数曲线、三类成果及坏文件恢复均包含于全量并通过。
- `1440x900`、`1920x1080` 下弹窗与检查结果均无 body/main 水平溢出。
- 视觉布局、岩土工程语义、文案/信息架构三位只读 Agent 经两轮复查后均为 `PASS`，最终 `P0/P1/P2 = 0`。

## Evidence

- `process_logs/playwright-mcp/new-project-flow-audit/point-identity-dialog-1440x900.png`
- `process_logs/playwright-mcp/new-project-flow-audit/point-identity-dialog-1920x1080.png`
- `process_logs/playwright-mcp/new-project-flow-audit/point-identity-deferred-1440x900.png`
- `process_logs/playwright-mcp/new-project-flow-audit/point-identity-deferred-1920x1080.png`
- `process_logs/playwright-mcp/new-project-flow-audit/point-created-check-complete-1440x900.png`
- `process_logs/playwright-mcp/new-project-flow-audit/point-created-check-complete-1920x1080.png`
- `process_logs/playwright-mcp/new-project-flow-audit/flow-run.json`

## Boundaries And Residuals

- 当前权威存储仍是浏览器 IndexedDB。真实三点位完整链路约需 5.2–5.3 分钟，说明全量数据块重写仍是明确性能债务。
- 后续本机服务已冻结方向：`WorkspaceRepository` 适配层 → `127.0.0.1` 服务 → SQLite WAL + SHA-256 附件目录 → 增量事务、迁移、备份恢复。
- 六页统一指南与问题责任入口属于下一独立切片，不在本次点位身份修复中混做。
