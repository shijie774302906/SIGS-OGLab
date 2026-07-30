# Process077 - 引导式工程判断与地层工作流重构

Date: 2026-07-12

Status: `closed / implemented / verified / independently reviewed`

## Goal

把地层分层改造成“系统整理证据和建议，工程师通过固定选项逐步判断”的流程；默认交互只保留一个下一步，异常与未分类土层能够生成候选但不会误进入参数解译，同时解决 4,281 / 7,832 行案例的常用交互卡顿。

## Implemented

- 标题下新增常驻四步指南：数据依据、生成地层候选、确认边界与土类、设为当前修订。
- 绿色、紫色、红色、黄色和灰色同时配合图标与状态词；未开始不误报为问题。
- 默认生成方式使用固定选项：JTS、现有规则边界 + JTS 土类、手动调整；自由文本只保留为高级备注。
- 规则变化点仅负责边界，JTS 负责区间建议土类；两者可生成同一份可追溯组合候选。
- 不可快捷忽略的异常不再形成死路：可保留区间待确认并生成其余地层，原始测量不变。
- 未确认土类升级为问题：候选允许保存，但参数解译交接被拒绝。
- 建议土类提供独立“接受建议”按钮；也可从砂土、混合土、黏性土中覆盖选择。
- 土类确认与低置信证据复核分离，确认土类不会误清除其他复核提示。
- 领域层校验固定土类白名单，不能通过自由字符串绕过交接门禁。
- 问题行展示具体动作；点击会展开右栏、切到手动工具、选中并滚动到对应层或边界。
- 页面仅保留流程条一个高强调主动作；右侧同阶段入口降为次级详情动作。
- qc、fs、u2 使用共享深度证据；已有方案时不再同时挂载第二套完整中心曲线。
- guidance、曲线准备、异常区间和图表数据使用缓存或 memo；常用层/边界选择改为本地瞬时状态。
- 停止在常用交互中序列化完整 importDraft、check history 和分类工作区；工作区改用轻量指纹。
- 用户文案移除“整理候选”“当前不可分类”等内部术语。

## Verification

- `npm.cmd run build`: passed。
- 完整 Chromium Playwright：`205/205` passed，约 3.7 min。
- 真实 Yingkou：`2/2` passed；SCPT1 7,832 行完成分类、异常决策、分层、参数和成果链路。
- SCPT1 页面常用交互最大 `156.4 ms`；记录到 1 个 `60 ms` 长任务。
- 7,832 行域分类基准约 `398 ms`；缓存后的 100 次 guidance 读取约 `2.9 ms`。
- 1440×900、1920×1080 最新证据无 body、主画布或右栏水平溢出。
- console errors `0`；page errors `0`。
- Visual、Geotechnical、Copy/IA/Performance 三个只读代理终审：`P0=0`。

## Evidence

- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1440x900.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/current-jts-output-1440x900.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/current-jts-output-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`
- `process_logs/playwright-mcp/jts-exception-decision/decision-1440x900.png`
- `process_logs/playwright-mcp/jts-exception-decision/decision-1920x1080.png`
- `process_logs/playwright-mcp/jts-exception-decision/browser-check.json`

## Boundaries And Residuals

- 仍是浏览器原型，不代表正式工程采纳、生产持久化或标准阈值批准。
- JTS 分类本身仍是一次约 398 ms 的同步显式操作；常用复核交互已达标，后续可将分类与哈希迁移到 Worker。
- 主 bundle 仍大于 500 kB；后续应按路由拆包并继续拆分大型右侧容器。
- 当前最长常用交互长任务为 60 ms，已记录并建议持续监控。
