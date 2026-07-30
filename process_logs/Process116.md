# Process116 - 多方法分类对比与九区深度配色

Date: 2026-07-21

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 在既有中文横版快捷图册中，只展示 JTS、Robertson 归一化 SBT 与 Zhang–Tumay Fuzzy 分类曲线/剖面，不生成综合建议或正式工程分层。
- 第 6–7 页 Ic 曲线与分类带按 JTS Zone 1–9 使用一致的高区分颜色。

## Result

- 第 5 页改为 23.5% / 23.5% / 53% 三列共享深度轴：`JTS/T 242（Zone 1–9）`、`Robertson 归一化 SBT（1990，Qt–Fr）`、`Fuzzy 分类`。
- JTS 与 Robertson 使用固定全宽分类带及低噪阶梯轮廓，不再用 Zone 编号控制填充长度；页面明确两种方法的区号不可直接等同。
- Fuzzy 按 HPC/HPM/HPS 原始隶属函数计算，绘图时归一为 100% 组成；不称为统计置信度。
- 第 6–7 页 Ic 曲线和右侧分类带统一使用九区颜色；图例独占一行，第 7 页 Bq、Fr 使用 1%–99% 稳健显示范围，计算值未修改。
- JTS/T 242 与 Robertson 1990 的方法身份、变量和标题已分离；缺失值与真实断点继续留白。

## Engineering Verification

- Robertson 纯函数覆盖 Zone 1–9，并验证 A、B–F、G、H 边界等值归属及 `+epsilon` 跨界。
- Zhang–Tumay Fuzzy 验证 U、HPC/HPM/HPS 原始隶属度、两个封顶阈值及两侧连续性。
- 营口 4,282 行：JTS 有效 4,072、9 区；Robertson 有效 3,826、7 区；Fuzzy 有效 4,270、3 类；真实断点 9。
- PDF 14 页、Excel 3 Sheet、画布 1800×1273；首次生成 1,065 ms、重新生成 951 ms；浏览器错误 0、横向溢出 0。

## Verification

- `npm.cmd run build`：passed。
- `domain-fast`：210/210 passed。
- `ui-isolated`：78/78 passed。
- `real-serial`：30/30 passed。
- `npm.cmd run verify:slice -- --process 116 --mode closure`：passed，66/66 spec 已编排执行。
- 1440×900 与 1920×1080 第 5–7 页证据均已人工检查。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1。
- Geotechnical Domain Reviewer：PASS，无 P0/P1。
- Copy / IA / Performance Reviewer：PASS，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-05-1440x900.png`
- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-05-1920x1080.png`
- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-06-1440x900.png`
- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-06-1920x1080.png`
- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-07-1440x900.png`
- `process_logs/playwright-mcp/process116-classification-comparison/atlas-page-07-1920x1080.png`
- `process_logs/playwright-mcp/process116-classification-comparison/browser-check.json`
- `process_logs/playwright-mcp/process116-classification-comparison/evidence-manifest.json`
- `process_logs/verification/Process116-closure.json`
- `process_logs/knowledge-reviews/Process116.json`

## Known Problems

- Covered：KPB-001、KPB-002、KPB-003、KPB-009、KPB-011、KPB-012、KPB-014。
- Not applicable：KPB-013（本页为固定只读 PDF，不存在中心操作或选择动作）。

## Boundaries

- 三种结果均为逐点分类证据，不是工程师确认地层。
- 本轮不生成综合建议，不改变原始测量、既有 JTS 公式、参数计算、PDF 页数或 Excel 内容。
- JTS Zone 与 Robertson Zone 的编号定义不同；同色只用于各栏内部识别，不表示方法等价。
