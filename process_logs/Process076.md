# Process076 - 简洁异常决策与 qc/fs/u2 共享深度证据

Date: 2026-07-12

Status: `closed / implemented / verified`

## Goal

把 JTS 分类后的异常处理改为少选择、理由明确、默认可上手的短决策；同时补齐 qc、fs、u2 共享深度证据，并明确“重新分类”和“建立分层候选”是两个不同动作。

## Implemented

- 分类发现不可分类点后自动打开一次短弹窗，只问“这些异常点怎么处理？”。
- 可忽略状态只显示：`暂不采用`、`查看详情`、推荐的 `忽略并建立候选`；自动平滑只在不能直接忽略且尚未执行时出现，避免重复循环。
- 忽略不删除、不置空、不改原始测量；只把分类空缺记录在本次 JTS 候选方案的来源选择中。
- 域层校验忽略范围：不可分类行占比不超过 5%、合并区间不超过 24 个、单段物理厚度不超过 0.75 m、总影响厚度不超过 2 m。相邻分类不同时仍可在有限范围内建立候选，但明确保留复核提示。
- 建立候选后中心状态改为“已建立新的可编辑候选”，明确原有方案未修改、原始测量保留；分类证据同步改为“空缺已在候选中保留”。
- 中心证据并列显示 qc、fs、u2：共享纵向深度，使用各自数值横轴和单位；u2 缺失显示斜线空带，不画成 0。
- 异常区间在三曲线中使用贯穿深度带和空心点；候选接受后改为保留空缺语义。
- 高级逐行证据、重新运行和原始候选控制继续折叠保留。

## User-Experience Review

- `less is more`：默认弹窗最多一个推荐动作和两个次要选择；安全可忽略时不再展示不必要的自动平滑。
- 新手路径：用户只需读一句理由并做选择，不需要先跳转到数据检查。
- 对象边界：分类运行不会再暗示当前分层方案已经变化；只有“建立候选”才生成新方案。
- 恢复：关闭/暂不采用不修改任何对象，可从右侧“选择如何处理”重新打开。
- 风险：大范围、过厚或过多异常不提供快捷忽略；本轮阈值是原型交互边界，不是正式工程采纳规则。

## Verification

- `npm.cmd run build`: passed。
- 相关 JTS 构建与 UI 用例：20 个覆盖分类、恢复、忽略、取消、重开、候选留痕与原始数据不变。
- 完整 Chromium Playwright：`203/203` passed，约 3.6 min。
- 真实 Yingkou：`2/2` passed，SCPT1 7,832 行完成异常选择、候选、参数、成果和恢复。
- 视口：1440×900 与 1920×1080 均无 body、主画布、右侧或弹窗水平溢出。
- 浏览器：console errors `0`，page errors `0`。
- Review result: `P0=0 / P1=0`。
- 已知非功能提示：Vite 仍提示主 bundle 大于 500 kB，本轮未改变代码拆包策略。

## Evidence

- `process_logs/playwright-mcp/jts-exception-decision/decision-1440x900.png`
- `process_logs/playwright-mcp/jts-exception-decision/decision-1920x1080.png`
- `process_logs/playwright-mcp/jts-exception-decision/candidate-1440x900.png`
- `process_logs/playwright-mcp/jts-exception-decision/candidate-1920x1080.png`
- `process_logs/playwright-mcp/jts-exception-decision/browser-check.json`
- `process_logs/playwright-mcp/jts-exception-decision/input/isolated-jts-anomaly.csv`
- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1440x900.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/guided-jts-pore-choice-1920x1080.png`
- `process_logs/playwright-mcp/yingkou-real-workflow/flow-run.json`

## Boundaries

- 未实现正式工程阈值、逐点大型异常审查工作区、正式采纳/保存、后端协作或桌面端修改。
- 忽略范围属于候选方案的原型治理选择；提交前仍需按保留的复核提示检查分类差异和边界。
