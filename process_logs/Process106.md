# Process106 - JTS SBT 区间标注与九色辨识

Date: 2026-07-16

Status: `closed / implemented / verified`

## Goal

修正 JTS/T 242-2020 九分区 SBT 图的 Zone 4–9 区间标注，并让九种土体在散点、选中点、图例和分区标注中具有显著且一致的颜色区分。

## Root Cause

- 原 Zone 4–9 标签使用手写的 Fr/Qtn 坐标，没有从 Ic 边界派生；Zone 5–8 的固定 Qtn 实际落入了相邻的错误区间。
- 原色板在 Zone 1–3、Zone 4–6 和 Zone 7–9 内使用相近色阶，同一大类内部难以快速区分。
- 原验收只检查 SBT 图、图例和点数存在，没有数学证明标签属于正确区间，也没有约束九色差异和跨组件映射一致性。

## Implemented Result

- 新增 `calculateJtsSbtRegionLabelPosition`，按各 Zone 的权威 Ic 上下边界计算对数中点。
- Zone 4 使用图域下限与 Ic 2.90，Zone 5–8 使用相邻 Ic 边界，Zone 9 使用 Ic 1.47 与图域上限；不再维护手写 Qtn 标签值。
- Zone 1–3 继续明确显示“结合 qnet 判定”，不虚构二维 Qtn*–Fr 图无法独立给出的细分区间。
- 九种土体改用离散色相和拉开的明度；点云、当前层选中点、图例和 Zone 标签共用同一冻结映射。
- Zone 标签加粗并使用白色描边，点云不透明度适度提高；维持白色工程图底和中性 Ic 边界，不使用大面积分区填色。
- 增加数学测试，验证 Zone 4–9 标签的 Ic 必须处于对应区间；增加九色唯一性与最小 RGB 距离回归。
- 增加营口真实流程 UI 断言，验证六个区间标签、九色图例、标签/图例颜色一致、轴单位、选中点、双分辨率布局和错误日志。

## Engineering Boundaries

- 本切片只改变证据图的派生标签位置与视觉映射，不修改 JTS 分类公式、Ic 边界、分类 run、分层 scheme、原始测量或参数解译结果。
- Zone 1–3 的最终分类仍依赖 qnet；图中颜色表示当前 JTS 分类结果，不按二维散点位置重新分类。
- 高区分色板服务于类别辨认，不表达风险、问题严重度或正式工程采纳状态。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `176/176` passed；Process106 区间和色差测试 included。
- UI-isolated: `72/72` passed。
- Real-serial: `29/29` passed；营口首次 JTS 流程和完整真实工作流均通过。
- Closure verifier: `62/62` specs selected；全部命令和三层 Playwright 运行 exit code 为 0。
- Targeted Process106 checks: domain `15/15`；营口 SBT `1/1`；1440×900 与 1920×1080 均通过。
- Evidence layout: `documentOverflowX=0`、`panelOverflowX=0`、`labelCount=6`、`legendColorCount=9`、`labelsInsideChart=true`、`labelColorsMatchLegend=true`、`browserErrors=[]`。
- Verification baseline was captured after the implementation edit; therefore closure did not rely on its empty change map and instead ran the mandatory full `62/62` spec closure suite plus direct Process106 target tests.

## Evidence

- Directory: `process_logs/playwright-mcp/process106-sbt-zone-clarity`
- `yingkou-sbt-1440x900.png`
- `yingkou-sbt-1920x1080.png`
- `browser-check.json`
- `process_logs/playwright-mcp/process106-sbt-zone-clarity/evidence-manifest.json`
- Verification receipt: `process_logs/verification/Process106-closure.json`
- Knowledge review: `process_logs/knowledge-reviews/Process106.json`

## Known Problems

- `KPB-002`: `covered`。强制关闭回归保留真实首次运行的 running、disabled、完成和恢复顺序。
- `KPB-003`: `not-applicable`。图表只读当前分类与分层对象，不执行上游重算、候选创建或下游失效。
- `KPB-007`: `covered`。营口真实全规模、切换性能和串行持久化测试全部通过。
- `KPB-011`: `not-applicable`。未新增问题处置或跨页恢复流程；既有 empty/stale 恢复和原始测量不变由回归覆盖。
- `KPB-012`: `covered`。数学证明标签区间，真实营口流程证明标签、单位、选中态、错误日志和双分辨率可见结果。

## Review Conclusion

- 岩土语义：PASS。Zone 4–9 与 Ic 带一致；Zone 1–3 未被二维图错误拆分。
- 工程图可读性：PASS。九色显著分离，标签在点云上仍可辨认，白底与边界层级保持克制。
- 维护与验收：PASS。坐标由权威函数派生，颜色单一来源，回归可直接发现错区和近似色退化。
