# Process110 - 参数完成到成果输出的明确交接

Date: 2026-07-20

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 参数向导完成后不自动跳页，在参数工作台明确告诉工程师下一步，并让参数页和成果页使用同一套当前权威条件。
- 保留修改配置与问题处理，但不让它们和“进入成果输出”竞争主操作。

## Result

- 当前参数包仍绑定当前 JTS 分类结果哈希和当前分层修订、且满足 `eligibleForOutput` 时，中央成功提示显示“参数已完成，可以生成成果”和唯一主按钮“进入成果输出”。
- 点击后直接进入既有成果页；成果生成按钮继续由检查、分层、参数和自定义公式的完整门禁控制，不在参数页伪造可导出状态。
- 页头“修改参数配置”降为次操作；系统不自动跳页，工程师可以先看曲线和层代表值。
- 已选参数仍有问题时，页头显示警告“试算已生成 · 待处理”，中央显示“处理 N 项问题”，并直达第一个待处理参数的既有向导。
- 未选择或明确不计算的方法不阻止成果交接；跳过原因仍进入审计和成果声明。
- 不可输出但待处理计数为 0 时，显示“当前没有可用于成果的参数结果 / 调整参数配置”，不再出现“处理 0 项问题”。
- 刷新、进入成果页后返回、重新修改配置均保持权威状态和下一步动作一致。

## Verification

- `npm.cmd run build` - passed。
- `npm.cmd run test:tiers:audit` - 63 个 spec 全部纳入固定层级。
- `npm.cmd run test:domain-fast` - 187/187 passed。
- `npm.cmd run test:ui-isolated` - 最终等价 75/75 passed；一次无关分层用例等待按钮超时，单 worker 精确复跑 1/1 passed。
- `npm.cmd run test:real-serial` - 最终等价 29/29 passed；一次无关新点位检查按钮等待超时，单 worker 精确复跑 1/1 passed。
- Process110 目标回归：参数问题/完成/零问题无结果三态、修改配置、跨页成果交接、刷新恢复、真实曲线和代表值均通过。
- 1440x900 与 1920x1080 的完成态、问题态均无页面或提示条横向溢出；中央主操作各为 1，页头竞争主操作为 0，console/page errors 为 0。
- `npm.cmd run knowledge:gate -- --context plan.md --report process_logs/knowledge-reviews/Process110.json` - passed。

## Review

- Visual Layout Taste Auditor：最终 PASS，无 P0/P1/P2；问题态与完成态颜色、标签和唯一主操作一致。
- Geotechnical Domain Reviewer：PASS，无 P0/P1；当前分类/分层绑定、参数适用与跳过语义、成果门禁可信。
- Copy / IA / Performance Reviewer：最终 PASS，无 P0/P1/P2；三种交接状态清楚且没有“处理 0 项”矛盾。

## Evidence

- `process_logs/playwright-mcp/process110-parameter-output-handoff/parameter-problems-1440x900.png`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/parameter-problems-1920x1080.png`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/jts-parameter-curve-su-1440x900.png`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/jts-parameter-curve-su-1920x1080.png`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/jts-parameter-modify-prefilled-1440x900.png`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/problem-browser-check.json`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/flow-run.json`
- `process_logs/playwright-mcp/process110-parameter-output-handoff/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process110.json`
- `process_logs/verification/Process110-baseline.json`
- `process_logs/verification/Process110-targeted.json`

## Known Problems Covered

- KPB-001、KPB-006、KPB-008、KPB-011、KPB-012、KPB-013。

## Boundaries

- 不自动跳转到成果输出。
- 不改变参数公式、分层结果、Excel/PDF 内容或成果生成逻辑。
- 不新增云端、后台服务、正式工程采纳或新的导出格式。
- 上游修订后成果交接消失由权威选择器和领域回归覆盖；后续可再补一条专门的跨页 UI 防回归用例。
