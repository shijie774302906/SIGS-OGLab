# Process102 - 共轴分层边界与 JTS 九分区 SBT 证据图

Date: 2026-07-16

Status: `closed / implemented / verified / independently reviewed`

## Goal

把地层分层主工作面整理成工程师可直接读图、选层和修改的一张共轴图：同一条分界虚线贯穿 qc、fs、u2 与分层柱；全孔视图不再塞入不可读文字；增加基于当前 JTS/T 242-2020 分类运行的九分区 Qtn*–Fr SBT 证据图。

## Selected Design

- 三位评委分别从工程正确性、可读性、交互连续性、性能和维护成本对 A/B/C 三案评分。
- 方案 B“共同父容器唯一边界覆盖层 + 主图下方 SBT”平均 `94.33` 分且无否决项，优于独立双线源和整图重写方案。
- 分类 Zone 继续以冻结运行中的 `selectedClass` 为权威；SBT 只负责展示证据，不按二维位置再次分类。

## Implemented Result

- 每个正式内部边界只生成一个 `SharedBoundaryOverlay` 虚线，横跨 qc、fs、u2 与分层柱；分层柱按钮仅保留命中区、手柄和可访问名称。
- 边界拖动预览实时移动同一条共线，提交后保存，`pointercancel` 回到原深度且不产生提交。
- 全孔概览与全孔展开均不显示层内文字；放大当前层才显示黑色层号、土类和当前层 callout。
- 新增 JTS/T 242-2020 九分区 `Qtn*–Fr` 对数坐标 SBT，固定展示域为 Fr `0.1–10`、Qtn* `1–1000`，九类图例完整。
- Zone 4–9 显示 Ic 分界；Zone 1–3 明示还需结合 qnet，避免把二维位置伪装成完整分类判据。
- 当前层证据点以黑色描边突出；选层后摘要与点集同步更新。层界归属为 `[顶深, 底深)`，仅最后一层包含最终底界。
- null、非有限、零值和负值不进入坐标；标准图外点与无效点分别计数，不补零、不压到图边。
- 只有工作区明确指定的当前 completed JTS 运行可以驱动图表；历史运行只显示 stale，重新分类后恢复。
- 大数据绘制按 Zone 确定性抽样，保留当前层点优先级，避免 4,000+ 个独立 DOM 节点。

## Engineering Conclusions And Boundaries

- SBT 点色表示当前 JTS 分类运行的结果，不是对手册图形的第二套自动判别；尤其 Zone 1–3 仍依赖 qnet。
- 无 u2 时明确标记为 CPT 近似分类，不暗示完整 CPTU 双路径证据。
- 图外和无效点仍保留计数与运行来源，但不能作为图内有效坐标。
- 本切片不修改 JTS 公式、分层生成规则、原始 qc/fs/u2、正式成果采纳、后端或导出能力。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `172/172` passed。
- UI-isolated: `70/70` passed。
- Real-serial: `29/29` passed；营口完整工作流 `10.4 min`。
- 营口收据：源数据 `4,282` 行，分类 `4,281` 行；有效坐标 `4,120`，标准图内 `3,833`，图外 `287`，无效 `161`，图中显示 `691` 点。
- 共轴收据：`67` 层、`66` 条唯一边界；上下/左误差 `0 px`，右误差 `1 px`，重复描边 `0`。
- 文字收据：概览/展开层内文字 `0`；聚焦文字为 `rgb(17, 24, 39)`，无标签碰撞。
- 双视口：1440×900、1920×1080；主图和 SBT 同宽，横向溢出 `0`。
- 性能：三视图切换 P95/最大 `51.1 ms`，long task `0`，工作台 DOM `980`。
- 浏览器 console/page error: `0`。
- Knowledge gate: 8 个重要问题全部 covered，0 个提示。

## Independent Review

- Visual Layout: PASS，P0/P1/P2 均为 0。
- Geotechnical Flow: PASS，P0/P1/P2 均为 0。
- Copy / IA / Performance: PASS，P0/P1 为 0，无必须修改的 P2。

## Evidence

- `process_logs/playwright-mcp/process102-shared-boundary-sbt/yingkou-overview-sbt-1440x900.png`
- `process_logs/playwright-mcp/process102-shared-boundary-sbt/yingkou-overview-sbt-1920x1080.png`
- `process_logs/playwright-mcp/process102-shared-boundary-sbt/yingkou-focus-layer-1440x900.png`
- `process_logs/playwright-mcp/process102-shared-boundary-sbt/yingkou-focus-layer-1920x1080.png`
- `process_logs/playwright-mcp/process102-shared-boundary-sbt/browser-check.json`
- `process_logs/playwright-mcp/process102-shared-boundary-sbt/evidence-manifest.json`
- `process_logs/verification/Process102-final.json`
- `process_logs/solution-reviews/Process102.json`
- `process_logs/reviews/Process102.json`
- `process_logs/knowledge-reviews/Process102.json`
- `process_logs/closure-drafts/Process102.json`

## Known Problems

- Covered: KPB-001, KPB-003, KPB-006, KPB-007, KPB-008, KPB-009, KPB-011, KPB-012。

## Residual P2

- 无当前切片必须处理的 P2。后续若调整图表断点或尺寸，继续保留双分辨率、共轴 1 px 和 SBT 同宽门禁。

## Closure Checklist

- [x] 最高分方案和否决条件有可追溯记录。
- [x] 唯一共线、三视图文字规则、真实九分区 SBT 与 stale/recovery 已实现。
- [x] Build、全量三层 Playwright、真实营口和双视口证据通过。
- [x] 三位独立评委复判 PASS，无开放 P0/P1/P2。
- [x] 知识库处置与更新库双向链接已更新。
- [x] 最终 evidence manifest 绑定归档、代码、测试、知识报告和验证命令。
- [x] 严格关闭 doctor 通过。
