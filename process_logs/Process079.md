# Process079 - 参数向导与结果页单一路径

Date: 2026-07-13

Status: `closed / implemented / verified / independently reviewed`

## Goal

完成 JTS 参数向导后直接进入本次试算结果，不再要求工程师重复确认目标层；修改已有配置时保留原参数、方法和排除决定，并明确生成一次新的参数运行。

## Implemented

- JTS 参数页分为待配置、修改配置和本次试算结果三种单一路径状态，旧 G2 目标层确认只保留给非 JTS 工作流。
- 当前参数包严格绑定点位、JTS 分类运行与结果哈希、精确分层修订；陈旧运行不会伪装为当前结果。
- 完成态页头只保留一个“修改参数配置”主操作；开始和续做也只由同一位置承接，右栏不再重复向导按钮。
- 修改配置从当前参数包回填参数范围、方法、Nkt、材料范围、人工来源和明确不计算理由，默认打开最终确认，可按项返回修改。
- 修改态明确提示“已回填当前运行；确认后将生成新的参数运行”，最终动作改为“保存修改并重新运行”。
- 结果页说明适用范围由当前 JTS 分类和分层修订自动匹配，不再声称工程师已逐层确认。
- 状态限定为“本次试算已生成”，并显示“不代表正式工程采纳”和“原型成果预检”边界。
- 层代表值表新增单位、分类运行和分层修订来源；摘要改为“层数 / 参数项数”。
- 1440 与 1920 均保持结果双栏，层代表值在首屏可见；1280 以下才折叠为单栏。
- guided 结果模式不再转换或传入旧 G2 的大行数组，避免无用的结果对象构造。
- 非 JTS G2、自定义公式、高级 JTS 手动设置与孔压消散工具保持原能力。

## Verification

- `npm.cmd run build`: passed。
- 定向回归：参数向导、JTS 参数包、非 JTS G2 `8/8` passed。
- 单次完整 Chromium Playwright：`207/207` passed，约 `3.6 min`。
- `1440x900`、`1920x1080`：无 body/result 水平溢出，主操作和层代表值均在视口内。
- `flow-run.json`: `errors=[]`，修改后运行数为 2，Nkt 更新为 13，明确不计算决定保留，草稿清空。
- Visual、Geotechnical、Copy/IA 三个只读代理经复查核销均为 `P0=0 / P1=0 / safe-to-close=yes`。

## Evidence

- `process_logs/playwright-mcp/parameter-guided-result/parameter-result-complete-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-result/parameter-result-complete-1920x1080.png`
- `process_logs/playwright-mcp/parameter-guided-result/parameter-result-modify-prefilled-1440x900.png`
- `process_logs/playwright-mcp/parameter-guided-result/parameter-result-rerun-1920x1080.png`
- `process_logs/playwright-mcp/parameter-guided-result/flow-run.json`

## Boundaries And Residuals

- 结果仍是浏览器原型试算，不代表正式工程审核、采纳或设计值。
- 高级手动运行继续作为右栏独立工具，不自动覆盖向导配置。
- 方法审计清单长于当前代表值表，已不影响 1440 首屏查看结果；后续可把未选择项折叠为低优先级精修。
- 主 bundle 仍大于 500kB；本轮已消除 guided 页无用大行转换，路由级拆包留待独立性能切片。
