# Process118 - 第六页五联图视觉样张

Date: 2026-07-22

Status: `closed / concept accepted`

## Goal

- 在不修改网页、CSS、正式 PDF 或其他报告页的前提下，以营口真实数据生成一张独立第六页 PNG 样张。
- 验证 Ic 阈值色带、九区分类色、逐层横条和图外层标签的视觉方向。

## Result

- 生成 1920×1080 白底五联图，qt、Rf、u2 分别使用红、墨绿和蓝色。
- Ic 使用可由指数阈值直接表达的 Z2–Z7 背景区间和黄色曲线；完整 Z1–Z9 色板用于右侧分类图与图例。
- 4,282 行营口数据确定性汇总为 30 个参考层；图外显示层号、推荐土类和主要类别相对占比。
- 用户已确认版式、风格、颜色和配置符合预期。

## Verification

- Python 脚本编译通过。
- PNG 尺寸 1920×1080。
- qt/Rf/u2：4,270/4,270/4,282 个有效值；Ic/JTS Zone：4,072/4,072 个有效值。
- 30 个参考层、30 个图外标签、9 项图例；缺失值保持断线。

## Evidence

- `process_logs/playwright-mcp/process118-page06-concept/page-06-concept.png`
- `process_logs/playwright-mcp/process118-page06-concept/page-06-concept-check.json`
- `process_logs/knowledge-reviews/Process118.json`

## Known Problems

- Covered：KPB-009、KPB-012。
- Not applicable：KPB-004（独立静态渲染，无网页恢复交互）。

## Boundaries

- 本切片只验证视觉样张，不修改生产报告生成器。
- 参考层与相对占比不是工程师确认层或统计置信度。
