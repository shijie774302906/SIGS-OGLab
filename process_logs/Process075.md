# Process075 - JTS 数据异常处理 Flow 调研

Date: 2026-07-12

Status: `closed / researched / product direction confirmed`

## Result

- 对比 Mobbin 数据导入异常、批量修复、忽略与撤销模式，并补充 Power Query、Airtable、Sentry、Datadog 的公开交互模式。
- 冻结“两层交互”：默认短决策弹窗，复杂证据留在中心工作区。
- 明确忽略语义：不删除、不改原始测量，只在本次候选方案中接受对应分类空缺，并保留可追溯选择。
- 明确 qc、fs、u2 使用共享深度、独立数值横轴；缺失通道不得画成 0。
- 研究文档：`docs/research/Process075-JTS-data-exception-flow.md`。

## Handoff

- 用户于 2026-07-12 确认按调研方案继续实施，并要求 `as simple as possible / less is better`。
- 实施进入 Process076。
