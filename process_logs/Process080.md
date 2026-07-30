# Process080 - JTS 参数深度曲线补全

Date: 2026-07-13

Status: `closed / implemented / verified / independently reviewed`

## Goal

补齐 JTS 参数向导完成后的深度曲线，使工程师能够从结果页检查每个已计算参数沿深度的变化，而不是只能查看计数和层代表值表。

## Implemented

- 结果页新增参数选择器；有逐深度有效值的方法可点击，未选择、明确不计算、待处理和不可用项灰显且不能生成伪曲线。
- 一次只绘制一个 methodId，曲线标题、单位和层代表值同步切换，不把不同单位叠在同一坐标系。
- 曲线纵轴深度向下，地层背景与代表值表联动；点击代表值层可突出对应层带。
- JTS 曲线按完整分类行序列构造；problem、pending、unavailable、不适用和缺失行均作为 null 断线，不补零、不跨接短缺口。
- Su 横轴从 0 kPa 起；所有 JTS 参数显示域不允许因 padding 出现物理误导性的负下界。
- 当前参数代表值全部显示，不再静默截断 48 层；1440 将单位移入标题，稳定保留层、n、中位数和范围四列。
- 超过 60 层时，小于屏幕 10px 的薄层聚合为浅灰密集区；选中层及可辨层仍单独显示，工程层数据没有合并或删除。
- 全部方法状态和不计算原因移入默认折叠审计区，保留来源与理由但降低首屏干扰。
- 按 run 使用 `useMemo` 建立 methodId 到有效值与代表值的索引；只挂载当前曲线，交互点限制 120，真实 44,816 个值切换约 94.7ms。
- 非 JTS G2、参数向导回填、高级手动设置、自定义公式和成果流程保持不变。

## Verification

- `npm.cmd run build`: passed。
- JTS 曲线、向导、参数包与非 JTS G2 定向回归通过。
- 新增断线验收：单点 problem 形成两段曲线，且不存在补零值。
- 真实 Yingkou SCPT1：44,816 个有效参数值、116 层；参数切换约 94.7ms，小于 500ms 门禁。
- `1440x900`、`1920x1080`：曲线与当前参数代表值首屏可见，无 body/main/right-panel 水平溢出。
- 单次完整 Chromium Playwright：`208/208` passed，约 `3.5 min`。
- Visual、Geotechnical、Copy/IA 三个只读代理第二轮均为 `P0=0 / P1=0 / safe-to-close=yes`。

## Evidence

- `process_logs/playwright-mcp/jts-parameter-curves/jts-parameter-curve-su-1440x900.png`
- `process_logs/playwright-mcp/jts-parameter-curves/jts-parameter-curve-su-1920x1080.png`
- `process_logs/playwright-mcp/jts-parameter-curves/jts-parameter-curve-rerun-1920x1080.png`
- `process_logs/playwright-mcp/jts-parameter-curves/flow-run.json`
- `process_logs/playwright-mcp/yingkou-real-workflow/current-jts-parameter-curve-1440x900.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/current-jts-parameter-curve-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`

## Boundaries And Residuals

- 曲线是当前浏览器原型试算证据，不代表正式工程采纳或设计值。
- 参数选择器在 1440 下仍约三行；所有状态均可见且曲线已在首屏，因此作为低优先级密度精修保留。
- 密集层仅在显示层聚合为灰带，原始层、代表值和下游修订均保持完整。
- 主 bundle 仍大于 500kB；本轮已解决隐藏参数绘图和重复大数组扫描，路由拆包留待独立切片。
