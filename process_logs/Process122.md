# Process122 - 快捷图册参数分类依据说明

Date: 2026-07-23

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 让快速出图用户直接知道参数到底按哪一种土类分类计算。
- 区分参数取值依据、分类对照证据和最终工程分层，避免把三者混为一谈。

## Result

- 参数计算逻辑保持不变：参数按 JTS/T 242—2020 `icClassification.zone` 逐测点计算适用范围；Zone 7–9 为砂性土、Zone 6 为粉土、其余有效 Zone 为黏性土大类。
- 第 10、11、12 页参数图左下角统一加粗显示：`参数土类依据：JTS/T 242—2020 逐测点 Zone 分类。`
- 下一行明确说明 Fuzzy、Modified Robertson 2016、Schneider 2008 只作对照，不参与参数取值；无效或不适用点继续留空，不补零、不跨数据断点连线。
- 第 15 页公式与来源页重复同一依据，并把旧的 φ′ 适用条件修正为实际算法对应的 `JTS 砂性土（Zone 7–9）`。
- 分类依据与对照方法角色由统一常量同时供 Canvas 绘图和机器证据使用，避免文案漂移。
- 参数绘图区向上预留 12 px，依据首行使用 15 px/700 字重，次行使用 12 px，默认预览和原始导出均未遮挡坐标或曲线。

## Verification

- `process_logs/verification/Process122-targeted.json`：通过。
- 目标验证实际执行：domain-fast `51/51`、ui-isolated `17/17`、real-serial `5/5`。
- `npm.cmd run build`：通过；仅保留既有的大包体积提示。
- 营口真实工作簿：4,282 个源行、4,270 个有效派生行、JTS 9 个分区、15 页网页/PDF 图册，双分辨率无横向溢出、浏览器错误为 0。
- Canvas 文字探针记录分类依据绘制 5 次；Playwright 逐页切换第 10、11、12 页并验证图像生成。
- 网页预览与 PDF 继续消费同一个 `QuickPlotPage.canvas`，PDF 保持 15 页。
- Visual、Geotechnical、Copy/IA/Performance 三类只读 Agent 最终均为 `PASS / P0=0 / P1=0`。

## Evidence

- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-10-1440x900.png`
- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-11-1440x900.png`
- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-12-1440x900.png`
- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-10-1920x1080.png`
- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-11-1920x1080.png`
- `process_logs/playwright-mcp/process122-parameter-basis/parameter-page-12-1920x1080.png`
- `process_logs/playwright-mcp/process122-parameter-basis/method-page-15-1920x1080.png`
- `process_logs/playwright-mcp/process122-parameter-basis/ui-browser-check.json`
- `process_logs/playwright-mcp/process122-parameter-basis/real-browser-check.json`
- `process_logs/playwright-mcp/process122-parameter-basis/evidence-manifest.json`
- `process_logs/verification/Process122-targeted.json`
- `process_logs/knowledge-reviews/Process122.json`

## Review Findings Resolved

- 岩土复查发现第 11 页走专用黏土绘图函数，最初遗漏共享依据说明；已统一调用同一说明帮助函数并补充逐页证据。
- 岩土复查发现第 15 页旧文案把 φ′ 写成适用于粉土；已按真实 evaluator 更正为 Zone 7–9，并加入领域测试精确断言。
- 视觉复查发现初版脚注在默认适合页面下过小；已提高字号并为说明留出固定空间。
- Copy/IA 复查确认两行文案简短、职责明确，跨参数页与方法页的重复属于必要强化。

## Known Problems

- KPB-001：真实 Canvas 文本、参数曲线和代表值均有可见证据。
- KPB-004：既有连续失败、保留输入和重试恢复路径回归通过。
- KPB-007：营口 4,282 行真实数据和完整真实工作流回归通过。
- KPB-009：完整、局部及无 u2 路线保持逐点留空、断点不连接和不补零。
- KPB-011：本轮没有新增责任页或修复跳转，不改变原始测量及上游流程。
- KPB-012：验收绑定真实营口数据、工程算法、双分辨率、PDF 和浏览器错误。
- KPB-017：本轮不改变局部异常处置；缺失值继续逐点留空，其他有效点继续计算。
- KPB-018：新增专用页面绕过共享报告说明的问题模式，并用共享函数、逐页切换和双分辨率证据预防复发。

## Boundaries

- 本轮没有把快速出图改为按工程师确认的最终分层计算，也没有新增层平均参数。
- Fuzzy、Modified Robertson 2016、Schneider 2008 仍是分类对照证据，不参与参数适用范围或参数取值。
- 未更改公式、系数、输入流程、Excel 结构、PDF 页数和工程分层逻辑。
