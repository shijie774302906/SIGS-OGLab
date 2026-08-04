# Process148 - 使用当前分层

Date: 2026-08-03

Status: `closed / implemented / verified`

## Goal

在专业地层分层的整理方法中提供“使用当前分层”，让工程师能够明确保留已经生成的层和边界并继续逐层确认，而不是用“暂不整理”混淆有效决定与问题留置。

## Result

- 整理方法弹窗保留“按土类大类合并”和“按薄层厚度筛选”，并增加普通次级按钮“使用当前分层”。
- 点击后不合并、不筛选，也不修改层、边界、土类或原始 qc、fs、u2；系统仅记录一条独立的 `keep-current` 结构确认。
- 关闭弹窗改为“取消”，只关闭本次选择，不推进流程、不写入确认。
- 使用当前分层后，指南完成“整理分层”并进入既有逐层确认；返回上一步会撤销该确认并重新要求选择整理方式。
- 确认记录复用现有编辑快照、撤销、串行持久化和 IndexedDB 恢复链路；刷新后层数、边界和确认状态保持一致。
- 没有伪造薄层处理记录或大类合并记录，后续工程审计可以区分“保持当前结构”和“执行过整理”。

## Verification

- `npm.cmd run build`：通过。
- 地层分层相关回归：35 passed、1 个依赖私有营口文件的用例按设计跳过、0 failed。
- 新增 domain 验证：层和边界对象在确认前后逐项相等；undo 后确认记录移除而工程结构不变。
- 新增 JTS 用户流程：取消、使用当前分层、刷新、返回上一步、再次确认和最终提交均通过。
- 现有 PROCESS093 43 层高密度工作台、PROCESS100 大类合并、PROCESS092 薄层整理、FLOW-F-06 保存失败恢复均通过。
- 1440×900 与 1920×1080：按钮完整可见、弹窗完整、横向溢出 0、浏览器错误 0。

## Evidence

- `process_logs/playwright-mcp/process148-keep-current-layers/evidence-manifest.json`
- `process_logs/playwright-mcp/process148-keep-current-layers/browser-check.json`
- `process_logs/playwright-mcp/process148-keep-current-layers/method-choice-1440x900.png`
- `process_logs/playwright-mcp/process148-keep-current-layers/method-choice-1920x1080.png`
- `process_logs/playwright-mcp/process148-keep-current-layers/current-layers-confirmed-1440x900.png`
- `process_logs/playwright-mcp/process148-keep-current-layers/current-layers-confirmed-1920x1080.png`
- `process_logs/knowledge-reviews/Process148.json`

## Boundaries

- 本切片没有调整其他“暂不处理”“暂时保留”或问题留置逻辑。
- 本切片没有修改分类方法、合并算法、薄层阈值、工程公式、单位换算或原始测量。
- “使用当前分层”只确认当前结构可以进入逐层确认，不代表各层土类已经由工程师最终确认。
- 私有营口文件没有进入代码或精选证据；相应用例按设计跳过。
- 本切片未执行生产部署。
