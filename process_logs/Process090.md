# Process090 - 图纸中心的地层分层复核工作面

Date: 2026-07-14

Status: `closed / implemented / verified / independently reviewed`

## Goal

将地层分层从“结果版面 + 问题列表 + 连续弹窗”收敛成工程师熟悉的图纸工作面：完整 qc、fs、u2 与分层柱持续可见，选择土层后在原位完成判断、修改与下一层导航。

## Implemented

- 移除默认工作面中的独立 `JTS 分类结果` 和逐层确认弹窗；JTS 保留为后台分类与审计依据。
- 主工作面同时展示 qc、fs、u2、分层柱、选中深度带和当前土层判断；图中土层、层导航与判断面板共享同一选中对象。
- 固定工程决定为：采用建议、选择/修改土类、暂时保留、合并、拆分、调整边界；处理后自动定位下一待确认层。
- 无系统建议时只显示一个主操作“选择土类”，避免“选择土类/修改土类”重复。
- 暂时保留记录固定原因、备注和时间；刷新后保持，且继续阻止修订、参数交接与成果生成。
- 调整边界后相邻两层重新待确认；合并/拆分按已确认 B 规则继承土类，但新层必须重新确认。
- 参数方法适用性以工程师最终确认的层土类为权威；逐行 JTS 差异只作审计和提示，不覆盖最终决定。
- 高级证据默认折叠，包含分类路径、精确来源运行、公式包、本层行数、异常数、源行范围和异常优先的行级证据。
- 来源运行严格按层 `classificationRunId`，缺失时才按 JTS 方案来源 ID；只做精确匹配，不回退到最新活动运行。
- 连续逐层确认采用合并持久化；选择土层不再深拷贝不可变分类运行，保留真实营口规模下的交互性能。
- 参数配置草稿提升到稳定所有者，避免页面切换后丢失；无效推荐方法可明确选择本次不计算并记录原因。

## Verification

- `npm.cmd run build`: passed.
- Targeted Playwright: `4/4` passed，覆盖唯一主操作、暂时保留刷新恢复、JTS 高级证据与旧层来源运行绑定。
- General Chromium regression: `236/236` passed using normal parallel workers.
- Real Yingkou Chromium regression: `2/2` passed using one isolated worker; 4282-row point and broken/legacy workbook recovery both passed.
- Total final Playwright coverage: `238/238` passed. The performance case is intentionally isolated from the general parallel suite so CPU contention cannot contaminate the `<75 ms` long-task gate.
- Yingkou evidence: selected-layer interaction maximum `177.6 ms`, long-task count `0`, longest task `0 ms`.
- Milestone evidence rerun: `FLOW-F2-01` `1/1` passed; both 1440x900 and 1920x1080 report zero document/editor/table/right-panel horizontal overflow and `browserErrors: []`.
- Known Problem Gate: Process090 matched KPB-001/002/003/004/006/007/011/012/013; all important matches were dispositioned and `knowledge:gate` passed before closure.

## Independent Review

- Visual Layout Taste Auditor: PASS, P0=0, P1=0.
- Geotechnical Domain Reviewer: PASS, P0=0, P1=0; safe to close.
- Copy / IA / Performance Reviewer: initial source-binding P1 was fixed and retested; final PASS, P0=0, P1=0; safe to close.

## Evidence

- `process_logs/playwright-mcp/stratification-workflow-ui/process090-main-workbench-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process090-main-workbench-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process090-layer-decision-1440x900.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/process090-layer-decision-1920x1080.png`
- `process_logs/playwright-mcp/stratification-workflow-ui/flow-f2-01-run.json`
- `process_logs/playwright-mcp/yingkou-real-workflow/minimal-input-run.json`
- `process_logs/knowledge-reviews/Process090-final.json`

## Boundaries And Deferred Polish

- This remains a browser-local prototype; no backend, collaboration, formal engineering adoption, or official formula changes were added.
- Non-blocking P2: high screens can use a taller plot; a few chart micro-labels are near the readability limit; top guide/right recommendation have minor wording repetition; historical modal CSS can be cleaned later.
- The current evidence package proves the primary inline flow. Deferred reload, B-inheritance and parameter-conflict states are covered by automated tests but do not each have a dedicated permanent screenshot.
