# Process082 - 通用 CPT/CPTU 地层分层候选确认指南

Date: 2026-07-13

Status: `closed / implemented / verified / independently reviewed`

## Goal

把地层分层从分散工具改成通用、方法可选、一步一判断的工程指南。系统负责生成并组织候选，工程师只需明确选择方法、批量接受清晰候选、逐层处理真正的问题，最后通过唯一预览动作生成当前分层修订。

## Implemented

- 默认流程统一为 `确认依据 → 选择方法 → 生成候选 → 逐层确认 → 生成修订`；中心页始终显示当前一步、完成状态和下一动作。
- 方法选择明确展示可用性、不可用原因、推荐项和理由，支持 JTS、规则边界 + JTS 土类、规则候选和高级手动，不进行静默替选。
- 候选层同时冻结方法原始分类、具体土类、一级工程分组、分类运行和工程师决定来源；最终预览保留 JTS `Zone` 溯源。
- 候选概览同时显示 qc、fs、u2、深度、厚度、具体土类、工程分组和确认状态；`1440x900` 下不需要横向滚动且数值不裁切。
- 清晰候选可以一次批量接受；普通边界或相邻路径差异作为提示保留，不再强迫工程师机械逐层点击。
- 无法分类、明确证据问题、合并/拆分继承和工程师主动标记仍进入逐层确认；每层首屏只有一个当前主要判断，合并、拆分、调界和改类收进“其他处理”。
- 合并按较厚层继承、等厚继承上层；拆分两层继承原层。两者均保留来源并重新进入确认队列。
- 复核原因按 `分类证据问题 → 合并继承 → 拆分继承 → 工程师标记` 区分；复合状态优先呈现 qc/fs/u2 与分类路径问题。
- 任何待确认候选都不能生成当前修订。离开脏方案时不再提供“提交并前往”旁路：有问题只能继续或放弃，无问题只能先查看最终预览；修订只由最终弹窗的唯一生成动作产生。
- 将全部旧测试与测试夹具迁移到同一用户规则，不再允许自动化测试绕过逐层确认。

## Verification

- `npm.cmd run build`: passed。
- 地层分层专项：`30/30` passed。
- 双视口指南 UI 证据回归：`8/8` passed。
- 旧回归迁移来源：`33/33` passed（最后一项补齐测试导入后单独复验通过）。
- 单次完整 Chromium Playwright：`211/211` passed，约 `6.0 min`。
- 盈口真实流程在最终全量中通过：CPT09、CPT19、SCPT1 共 `16,603` 行，覆盖检查、分类、分层、参数和成果；损坏/旧格式 Excel 恢复也通过。
- 盈口阶段证据：分层单次交互最大约 `145.3 ms`，参数曲线切换约 `94.7 ms`，console/page errors 均为 `0`。
- Visual、Geotechnical、Copy/IA & Performance 三个只读代理最终均为 `P0=0 / P1=0 / safe-to-close=yes`。

## Evidence

- `process_logs/playwright-mcp/stratification-workflow-ui/process082-candidate-overview-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process082-candidate-overview-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process082-layer-decision-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process082-layer-decision-1920x1080.png`
- `process_logs/playwright-mcp/process082-generic-stratification/method-choice-1440x900.png`
- `process_logs/playwright-mcp/process082-generic-stratification/method-choice-1920x1080.png`
- `process_logs/playwright-mcp/process082-generic-stratification/jts-batch-candidate-1440x900.png`
- `process_logs/playwright-mcp/process082-generic-stratification/jts-batch-candidate-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`

## Boundaries And Residuals

- 指南建议和当前分层修订属于浏览器原型试算，不代表正式工程采纳。
- 盈口没有工程师批准的逐层期望答案，因此本轮只证明计算一致性、状态完整性和交互正确，不能宣称真实案例工程分类正确。
- 数据检查页的逐步修复指南仍属于下一独立切片。
- 主 bundle 仍超过 500 kB；当前实测交互满足本轮关闭门槛，路由拆包留待独立性能切片。
