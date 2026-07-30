# Process081 - 地层分层逐步指南

Date: 2026-07-13

Status: `closed / implemented / verified / independently reviewed`

## Goal

把地层分层默认流程改成一步一问的工程指南：系统组织证据并推荐下一步，工程师只回答固定问题；完成后一次生成当前分层修订，高级编辑能力保持可用但不干扰默认路径。

## Implemented

- 中心页与全部弹窗共用同一套五步：`确认依据 → 选择方式 → 处理异常 → 确认土类 → 生成修订`，每步显示完成、当前、提示或问题状态。
- 生成方式限制为规则边界 + JTS 土类、JTS 边界 + 土类和高级手动；系统说明推荐理由。
- 土类待确认时一次只处理一层，同屏显示当前深度区间与 qc、fs、u2，只能选择砂土、混合土或黏性土；关闭后保留进度。
- 无系统建议时明确显示“系统未提供建议，请选择”，不把“未分类”伪装成推荐。
- 最终生成前展示层数、边界、提示、边界来源、土类来源，以及逐层名称、深度范围、最终土类和判断来源。
- 每层冻结 `suggestedGroup`、`finalGroup`、决策来源、JTS classification run 引用和决定时间，可区分接受 JTS、覆盖 JTS、无建议人工选择和手动建立。
- 最终动作只生成一次当前分层修订，并明确它用于当前参数试算、不代表正式工程采纳。
- 右栏默认只提示跟随中央指南；规则、JTS 重跑和精细编辑收进默认闭合的“高级手动工具”，选择手动路线时自动展开且保留指南进度。
- 参数结果曲线切片暴露的验收缺口已写入 `memory.md`：验收必须断言真实可见图形与结果，不能只检查完成状态或存储值。

## Verification

- `npm.cmd run build`: passed。
- 规则候选、JTS、Ic 回退、异常决策、手动编辑、多方案、撤销/重做、失效恢复、保存失败重试和参数交接均通过。
- Playwright 直接断言最终来源、逐层深度与土类，并核对持久化 soilDecision。
- `1440x900`、`1920x1080` 的土类向导与最终预览无裁切、横向溢出或隐藏操作。
- 真实 Yingkou 完整工作流包含于最终回归并通过。
- 单次完整 Chromium Playwright：`208/208` passed，约 `3.6 min`。
- Visual、Geotechnical 与 Copy/IA 三个只读代理第二轮均为 `P0=0 / P1=0 / safe-to-close=yes`。

## Evidence

- `process_logs/playwright-mcp/stratification-workflow-ui/stratification-guide-soil-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/stratification-guide-soil-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/stratification-guide-final-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/stratification-guide-final-1920x1080.png`
- `process_logs/playwright-mcp/stratification-guided-flow/final-preview-1920x1080.png`
- `process_logs/playwright-mcp/jts-guided-pore-recovery/`

## Boundaries And Residuals

- 指南、建议和修订均为浏览器原型试算流程，不代表正式工程采纳。
- 系统不替代工程师对证据不足土层的判断，也不开放自由土类文本以免产生不可控类别。
- 主 bundle 仍超过 500 kB；完整 Yingkou 用例已验证功能与交互性能，路由拆包留待独立性能切片。
