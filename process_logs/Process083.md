# Process083 - 浏览器本机保存失败诊断与恢复

Date: 2026-07-13

Status: `closed / implemented / verified`

## Goal

把无法行动的“本机项目保存失败”泛化提示改成可诊断、可恢复的浏览器本机存储状态，同时保证失败期间当前页面修改不丢失、不被误报为已保存。

## Implemented

- 保留原有一次自动重试，并明确告诉用户自动重试已经发生。
- 新增保存失败分类：浏览器配额不足、存储不可用/权限限制、多标签冲突、项目结构检查失败和临时 IndexedDB 写入异常。
- 写入错误不再丢弃 IndexedDB 技术详情；普通用户默认只看原因和推荐动作，技术详情按需展开。
- 浏览器支持 `StorageManager` 时显示本站已用空间、可用配额和使用比例；接近配额上限的模糊 `AbortError` 会升级为空间不足提示。
- 警告条始终说明当前更改是否仍在本页、是否已经自动重试以及刷新/关闭风险。
- 可重试错误仅保留一个主要动作“重试保存”；多标签冲突和结构问题不显示无效重试，改为“查看解决方法”。
- 解决说明采用三步渐进展开；默认警告条保持紧凑，可选择“稍后处理”。
- 重试始终从当前内存工作区触发；成功后警告清除，现有数据库读回测试验证最新修订已写入。
- 系统不会自动删除项目、历史修订、原始测量或浏览器数据。

## Verification

- `npm.cmd run build`: passed。
- 存储诊断与地层保存恢复专项：`11/11` passed。
- 多标签冲突、项目持久化与错误分类回归：`11/11` passed。
- 最终完整 Chromium Playwright：`214/214` passed，约 `5.8 min`。
- 盈口真实工作流和损坏/旧格式文件恢复包含于最终全量并通过。
- `1440x900`、`1920x1080` 下摘要、用量、按钮、展开步骤和技术详情完整可读。

## Evidence

- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-failed-save-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-failed-save-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-recovered-save-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f-06-recovered-save-1920x1080.png`

## Boundaries And Residuals

- IndexedDB 失败可能来自浏览器环境；应用可以诊断和保护当前内存状态，但不能替用户释放系统磁盘或修改浏览器策略。
- 本轮不提供只能下载、无法恢复的伪备份。完整项目备份与恢复需作为独立切片同时实现。
- 用户看到失败提示时仍应先保留当前页面；重复失败时按新提示检查空间、普通窗口/站点权限或多标签冲突。
