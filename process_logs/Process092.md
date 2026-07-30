# Process092 - 地层共轴图表与薄层整理指南

Date: 2026-07-14

Status: `closed / implemented / verified / independently reviewed`

## Goal

让工程师始终在同一深度坐标下对照 qc、fs、u2 与分层柱，并在初始候选生成后通过一个保守、可预览、可撤销的指南整理工程意义不足的薄层。默认筛选厚度为 0.50 m，但它只是可调筛选条件，不是自动删除规则。

## Implemented

- qc、fs、u2、深度刻度、候选边界、选中区间和分层柱共享同一个深度范围、有效绘图区和坐标转换，避免左右图看似等高但实际错位。
- 地层总流程增加“候选薄层检查”，首次生成规则或 JTS 候选后自动进入；手动方案不强迫进入，但可随时重新检查。
- 独立三步子向导：设置筛选厚度、逐项确认处理、预览并一次应用。默认 0.50 m，可修改；输入无效时不能继续。
- 每次只显示一个候选，并同步展示该深度范围的 qc、fs、u2。高级证据默认折叠，可查看上层、薄层、下层的各通道中位数与判断理由。
- 自动预选仅适用于内部薄层、上下建议土组相同、qc/fs 证据充足、各可用通道三段两两比较无方向冲突且处理范围不重叠的情形。
- 异类、重要夹层、证据不足、曲线冲突、孔顶/孔底薄层和重叠候选默认保留或要求工程师选择；缺失 u2 保持不可用，不补零。
- 固定选择为保留、合并到上层、合并到下层和适用时的系统建议。合并方向保留目标邻层身份与属性；普通手动合并仍遵循既有“较厚层继承”规则。
- 一次应用形成一个原子命令和一个撤销单元；支持撤销、重做、刷新恢复、陈旧源拒绝、失败重试和审计记录。上传原始行及 JTS 行级证据不修改。
- 首次未检查时中心只保留一个主要操作；右侧不再重复同一入口。完成后回到既有逐层确认和最终生成修订流程。

## Verification

- `npm.cmd run build`: passed.
- Chromium final coverage: the serial full run passed the first `248/250`; its only remaining real-Yingkou test was updated to follow the new guide, then `FLOW-G5-01` and `FLOW-G5-02` both passed. Equivalent final coverage: `250/250`.
- The initial 4-worker full run exposed shared IndexedDB test pollution; the custom-formula suite passed `4/4` in isolation. Browser-local persistence flows are therefore closed with one worker.
- Thin-layer domain adversarial coverage: safe same-group merge, opposite trends, different groups, edge layers, insufficient evidence, important layers, missing u2, stale plans, overlaps, target-neighbor inheritance and one-step undo all passed.
- PROCESS092 UI flow passed: threshold validation, cancel without mutation, one atomic apply, source rows `101 -> 101`, layers `3 -> 1`, undo `1 -> 3`, redo `3 -> 1`, reload persistence and shared-axis pixel assertions.
- Real Yingkou CPT09: `4282` rows, `16` thin-layer candidates, analysis `65 ms`; full real workflow, point switching, reload, parameter handoff and broken-Excel recovery passed.
- 1440x900 and 1920x1080: plot top/bottom error `0 px`, effective SVG height and layer-column height both `474 px`, no horizontal overflow, console/page errors `[]`.
- Known Problem Gate: KPB-001/002/003/004/006/007/008/009/011/012/013 dispositioned; `knowledge:gate` passed.

## Independent Review

- Visual Layout Taste Auditor: PASS, P0=0, P1=0, P2=0.
- Geotechnical Domain Reviewer: PASS, P0=0, P1=0, P2=0 after independent channel-conflict and target-neighbor inheritance fixes.
- Copy / IA / Performance Reviewer: PASS, P0=0, P1=0. The two copy findings were also resolved by using “属于总流程第 4 步” and “候选 1 / N”.

## Evidence

- `process_logs/playwright-mcp/process092-thin-layer-guide/threshold-1440x900.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/threshold-1920x1080.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/review-safe-suggestion-1440x900.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/review-safe-suggestion-1920x1080.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/preview-1440x900.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/preview-1920x1080.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/aligned-workbench-1440x900.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/aligned-workbench-1920x1080.png`
- `process_logs/playwright-mcp/process092-thin-layer-guide/browser-check.json`
- `process_logs/playwright-mcp/process086-guided-generation/flow-run.json`
- `process_logs/knowledge-reviews/Process092.json`

## Boundaries And Deferred Polish

- This remains a browser-local prototype. No backend, collaboration, formal engineering adoption or official standard threshold was added.
- 0.50 m is a default user-adjustable screening value; approximately 0.15 m is shown only as a cone-resolution reliability reference.
- Non-blocking P2: the four fixed decisions could later use progressive disclosure, and persistence serialization time could be instrumented separately from the already verified real-data interaction timing.
