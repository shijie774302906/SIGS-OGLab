# Process109 - 按需 Excel 参数与地层工作簿

Date: 2026-07-17

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 在成果输出阶段按需生成一个不可变 Excel 工作簿，集中交付逐深度参数、分层代表值和共享深度轴地层长图。
- 文件只在用户点击生成或下载历史修订时创建，不在参数解译阶段维护动态文件状态。

## Result

- `Excel 参数与地层工作簿` 由成果页右侧唯一动作生成，生成中禁用重复提交；失败不会追加成果，重试只追加一次新修订。
- 工作簿包含元数据、测量数据、JTS 分类、地层分层、参数结果、参数代表值、地层图，以及适用时的参数排除和消散试验。
- `参数结果` 冻结逐深度方法值、状态、单位、层归属、来源行和原因；缺失、不计算、普通忽略和强制忽略均不伪造零值。
- `地层图` 按共同深度轴绘制 qc、fs、可用的 u2 和彩色最终分层；缺测与真实深度间断处断线，不跨缺口连接。短孔仅作适读放大并明确说明，不声明工程绝对比例。
- 成果提交前从当前分类、最终分层和参数包重建规范内容，逐项核对测量、分类、分层、逐深度参数和代表值，拒绝重算自身哈希后的内容替换。
- 历史修订只从自身冻结快照重新下载；旧结构缺少逐深度参数时给出明确说明，不使用当前参数回填。
- 成果页收敛为中央“生成依据”和右侧生成/历史下载；历史项区分“当前修订”和“旧修订”并显示生成时间。

## Verification

- `npm.cmd run build` - passed.
- `npm.cmd run test:tiers:audit` - 63 个 spec 全部纳入固定层级。
- `npm.cmd run test:domain-fast` - 186/186 passed.
- `npm.cmd run test:ui-isolated` - 75/75 passed.
- `npm.cmd run test:real-serial` - 29/29 passed.
- 目标输出测试 - 5/5 passed；覆盖缺失/深度间断、长图尺寸、权威内容防篡改、失败重试和无 u2。
- 营口 SCPT1 - 7,832 行、100.30 m、6 处真实深度间断；Excel 约 2.91 MB，生成约 8.28 s，逐深度参数约 25,758 行，地层图 1800×4286。
- 1440×900 与 1920×1080 无页面、工作台或右栏横向溢出；无 console/page errors。
- `npm.cmd run knowledge:gate -- --context plan.md --report process_logs/knowledge-reviews/Process109.json` - passed。

## Review

- Visual Layout Taste Auditor: PASS，无 P0/P1。
- Geotechnical Domain Reviewer: PASS，无 P0/P1；共享深度轴、缺测断线、短孔表达和权威重建可关闭。
- Copy / IA / Performance Reviewer: PASS，无 P0/P1/P2；唯一生成动作、历史下载语义和成果页信息层级可关闭。

## Evidence

- `process_logs/playwright-mcp/process109-excel-output/output-1440x900.png`
- `process_logs/playwright-mcp/process109-excel-output/output-1920x1080.png`
- `process_logs/playwright-mcp/process109-excel-output/sample-stratigraphy.png`
- `process_logs/playwright-mcp/process109-excel-output/flow-run.json`
- `process_logs/playwright-mcp/process109-excel-output/evidence-manifest.json`
- `process_logs/playwright-mcp/yingkou-real-workflow/yingkou-stratigraphy.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`
- `process_logs/knowledge-reviews/Process109.json`
- `process_logs/verification/Process109-final.json`

## Known Problems Covered

- KPB-001, KPB-002, KPB-003, KPB-004, KPB-006, KPB-007, KPB-008, KPB-009, KPB-011, KPB-012, KPB-013。

## Boundaries

- 本成果为原型解译成果，不是设计值或正式工程采纳文件。
- 本轮不新增 CSV、云端存储、动态文件同步或新的 PDF 功能。
- 超过浏览器安全画布上限时明确失败；分段导出不在本轮范围。
- 可选的消散、参数排除和声明仍由正常 UI 生成路径冻结；将其扩展为与五组核心工程内容相同的 canonical authority 比较留作后续硬化。
