# Process085 - 本机工作区完全重置

Date: 2026-07-13

Status: `closed / implemented / verified`

## Goal

把原有的“清除本机项目”从项目列表逻辑置空升级为真正的数据重置，删除当前浏览器中所有项目、点位、原始数据和解释记录，并保证刷新后仍为无项目状态。

## Implemented

- 二次确认文案明确列出将删除项目、点位、原始数据和解释记录，同时说明源码与样例文件不受影响。
- 操作名称改为“清空全部本机数据”，避免把它误解为只删除项目列表。
- 确认后等待尚未结束的提交/保存队列，再删除整个 `sigs-oglab-workspace-v3` IndexedDB。
- 删除全部 manifests、data-blocks、migration-records 和 metadata，而不是提交一个空 manifest 后留下孤立数据块。
- 同时清除 `sigs-oglab.workspace-v3.pointer` 和旧 `sigs-oglab.project-collection.v1` 快照。
- 成功后重启工作区 bootstrap，立即显示 0 个项目；刷新后仍从空工作区启动。
- 进行中禁用确认和取消，防止重复提交。
- 删除或 localStorage 清理失败时不显示成功，保留失败信息和同一确认入口供重试。
- 取消操作保持原项目与记录不变。

## Verification

- `npm.cmd run build`: passed。
- 完整重置专项：`1/1` passed；验证四个 IndexedDB store 计数均为 0、V3 指针为空、V1 快照为空、刷新后仍为空。
- 项目持久化、数据库和保存恢复回归：`9/9` passed。
- `1440x900` 与 `1920x1080` 下重置说明和操作无水平溢出。

## Evidence

- `process_logs/playwright-mcp/project-local-persistence/full-reset-confirmation-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/full-reset-confirmation-1920x1080.png`
- `process_logs/playwright-mcp/project-local-persistence/projects-cleared-1440x900.png`
- `process_logs/playwright-mcp/project-local-persistence/flow-run.json`

## Boundary

- 浏览器数据属于具体浏览器 profile，应用代码不能从另一个 Playwright profile 代替用户点击其正在使用的浏览器。用户需在项目集合右侧点击一次“清空全部本机数据”并确认。
- 多人通过网址访问并共享持久化项目需要云端权威服务；本轮只完成本机数据重置，没有实现云服务。
