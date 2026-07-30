# 当前计划：workflow gate 修复与 05 单页设计循环

日期：2026-07-08

活动记录：

- `docs/figma-interface-02-10-batch-review.md`
- `docs/ui-02-10-mainflow-development-handoff.md`
- `docs/ui-05-stratification-default-planning-gate.md`
- `design.md`
- `AGENTS.md`
- `process_logs/Process81.md`

状态：`05 planning gate risk close / ready for 05 Figma drawing`

## 0. 当前目标

先修 workflow 与计划状态，再进入单页设计循环。当前不继续批量画图，不把 `52:*` 节点作为开发依据。

必须先完成：

```text
修 workflow 文档和 plan 状态
-> 把 02-10 降级为 draft
-> 从 05 地层分层默认页开始单页循环
```

后续单页循环顺序固定为：

```text
05 地层分层默认页
-> 05B 地层分层方法选择器
-> 06 参数解译默认页
-> 06A 参数方法选择器
-> 07 成果输出
-> 02 项目/点位数据
```

规则：

- 每次只做一个页面或一个强相关弹窗。
- 通过 workflow gate 后再进入下一页。
- 任意 `blocking` 停止并汇报。
- `risk` 必须记录影响、证据和是否可继续。
- Figma 同步、PNG 导出、自检通过都不等于验收通过。
- 未通过 Planning、UI/layout、Chinese user critique、Implementation/QA 审阅时，不得写开发 handoff。

## 0.1 02-10 状态修正

`02-10` 批次原先一次性生成并同步到 Figma，但未完成独立 agent review，且部分页面是重新手绘相似壳层，不是严格继承已验收版型。因此全部降级为 `draft / blocked for review`。

这些节点只能作为后续单页循环的素材，不得作为开发 handoff：

| 图稿 | Figma 节点 |
| --- | --- |
| `02 项目/点位数据` | `52:2` |
| `05 地层分层默认页` | `52:137` |
| `05A 地层分层对比详情态` | `52:301` |
| `05B 地层分层方法选择器` | `52:1039` |
| `06 参数解译默认页` | `52:412` |
| `06A 参数方法选择器` | `52:1050` |
| `07 成果输出` | `52:548` |
| `08 方法实验室` | `52:680` |
| `09 研究模式` | `52:800` |
| `10 全局状态集` | `52:894` |

## 0.2 02-10 审计结论

Blocking：

- `02-10` 是批量生成，不符合单页循环要求。
- `52:*` 主页面像重新画的相似壳层，未证明严格复制 `01 Workbench shell` 或已验收 `03/04` 版型。
- `docs/ui-02-10-mainflow-development-handoff.md` 名义上像开发 handoff，但审阅未关闭，容易误导后续实现。
- `08 方法实验室`、`09 研究模式`、`10 全局状态集` 不得作为默认主流程页面推进。

Risk：

- `05/06/07` 业务方向可保留，但需要重套已验收壳层并逐页关闭入口、状态、中文用户和实现边界。
- `05B/06A` 方法选择器需要重画为统一弹窗/抽屉，并按能力筛选，而不是按少数方法名堆列表。

## 0.3 当前 active slice：05 地层分层默认页

本轮进入单页循环时只处理 `05 地层分层默认页`。

必须先产出：

- 页面功能定义：当前对象、输入、主结果、状态/阻断、下一步、详情/日志位置。
- 版型继承对照：`01 Workbench shell`、已验收 `03 数据导入`、已验收 `04 数据检查`。
- 功能入口表：`运行分层`、`保存草稿`、`采纳为当前分层`、`用于参数试算`、`进入参数解译`、`方法对比/查看差异` 的落点、状态、失败态、禁用原因和是否改写数据对象。
- 审阅计划：Planning、UI/layout、Chinese user critique、Implementation/QA。

本切片不包括：

- 不修改 WinUI 代码。
- 不推进 `05B/06/06A/07/02`。
- 不把 `08/09/10` 纳入主流程。
- 不写开发 handoff，直到 `05` 单页 review gate 关闭。

## 0.4 05 planning gate 当前状态

已新增 `docs/ui-05-stratification-default-planning-gate.md`。

该文档当前只完成 `05 地层分层默认页` 的功能、布局、入口闭环、状态覆盖和 blocking/risk 定义，不是 Figma 交付物，也不是开发 handoff。

已完成首轮审阅：

- Planning agent `Parfit`：`risk`，要求补 reviewer owner 和质量门状态。
- UI/layout agent `Lagrange`：`risk`，要求补内部网格、BottomPanel 默认态和局部列表边界。
- Chinese user critique agent `Erdos`：`blocked`，指出已采纳方案缺正式 `进入参数解译`。
- Implementation/QA agent `Dirac`：`risk`，要求补当前 WinUI 能力映射、验证路径、可测试谓词和复用清单。

已在 `docs/ui-05-stratification-default-planning-gate.md` 中修复以上 finding，并完成 reviewer re-check。

Re-check 结论：

- `Parfit`：pass。
- `Lagrange`：pass。
- `Erdos`：risk，原 blocking 已关闭，允许进入 Figma 绘制。
- `Dirac`：pass。

Integration owner 决定：`risk close`，允许进入 `05 地层分层默认页` Figma 绘制；不允许写 development handoff。

剩余 risk：

- `05` Figma 图仍需证明 1920x1080 壳层继承、主证据可读和中文工程用户可直达结果。
- 当前 WinUI 仍是 projection-only / official-write disabled，后续开发 handoff 不得把保存草稿/采纳写成已落地能力。

---

# 历史计划：04 数据检查真实 UI 图与开发 handoff

状态：`design reviewer fixes applied`

## 1. 目标

把 `04 数据检查` 从功能描述推进到可交付的真实 UI 设计稿与开发 handoff。

本切片必须回答：

- 数据检查默认页长什么样？
- 阻塞、警告、通过、运行中、无数据、运行失败分别如何展示？
- 哪些入口会启用或禁用？
- 点击问题后如何定位右侧详情；曲线和数据行定位需要什么数据合同？
- 后续 WinUI 实现应该复用哪些现有服务和页面对象？

## 2. 用户问题

当前产品的核心流程是：

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

`数据检查` 的用户价值不是展示内部日志，而是回答工程用户是否可以进入 `地层分层`。

本轮设计按当前代码能力收敛为：

```text
项目级质量门 + 选中点位钻取
```

原因：

- 当前 `DataQualityCheckService.RunChecks()` 是项目级汇总。
- 当前 `DataIssueListItem` 没有稳定的字段、深度区间、行号和曲线证据合同。
- 后续可在项目级质量门下选择某个点位或某条问题，进入点位级证据预览。

默认页必须回答：

- 当前项目/样例是否存在阻塞项？
- 阻塞项属于哪个点位、规则、位置和后续流程？
- 警告是否允许继续？
- 用户下一步应该回到数据导入修正，还是进入地层分层？

## 3. 范围

本切片包括：

- 绘制 Figma `04 数据检查` 主图。
- 绘制 5 个真实状态页：无数据、运行中、警告可继续、通过、运行失败。
- 绘制 `检查规则` 最小只读面板。
- 新增 `docs/ui-04-data-check-development-handoff.md`。
- 新增 `docs/figma-interface-04-data-check-review.md`。
- 更新 `Process.md` 与 `process_logs/Process79.md`。

本切片不包括：

- 不修改 WinUI 代码。
- 不修改 SQLite schema。
- 不修改 `DataQualityCheckService` 的检查规则。
- 不新增自动修复、标记已处理、正式数据写入或成果导出能力。
- 不把内部 runner、registry、draft package、长日志放到默认页。

## 4. Figma 交付物

| 页面 | Figma 节点 | 截图 |
| --- | --- | --- |
| `04 数据检查` | `37:2` | `app_data/temp/figma-04-data-check-main.png` |
| `04-1 数据检查-无数据空状态` | `40:2` | `app_data/temp/figma-04-1-data-check-empty-state.png` |
| `04-2 数据检查-运行中状态` | `40:369` | `app_data/temp/figma-04-2-data-check-running-state.png` |
| `04-3 数据检查-警告可继续状态` | `40:733` | `app_data/temp/figma-04-3-data-check-warning-state.png` |
| `04-4 数据检查-通过状态` | `40:1133` | `app_data/temp/figma-04-4-data-check-passed-state.png` |
| `04-5 数据检查-运行失败状态` | `40:1506` | `app_data/temp/figma-04-5-data-check-run-failed-state.png` |
| `04-6 数据检查-检查规则面板` | `43:14` | `app_data/temp/figma-04-6-data-check-rules-panel.png` |

## 5. 页面布局

必须继承 `01 Workbench shell`：

- 顶部：中文菜单、命令路径、窗口控制。
- 左侧：资源管理器工程树，`数据检查` 选中。
- 中央：数据检查主工作区。
- 右侧：当前检查对象、问题详情、影响和下一步。
- 底部：`问题 / 预检 / 检查记录`，默认不显示内部长日志。
- 底部状态栏：当前文档、工程、点位、SQLite 本地模式和质量状态。

默认阻塞页中央区域：

- 顶部状态摘要：阻塞项、警告项、已通过规则、当前点位、分层准入状态。
- 左侧问题列表：按阻塞/警告/字段/深度组织。
- 中央数据定位预览：曲线、警告/阻塞深度带、定位数据行。
- 右侧问题详情：编号、字段、深度、判断说明、影响、建议动作。

实现约束：

- 当前 WinUI 最小实现只能可靠展示项目级汇总、问题列表、位置、消息、建议和状态。
- 曲线、深度带和定位数据行属于目标交互；必须先补 `IssueEvidence` 数据合同，或降级显示问题详情，不得假造曲线预览。
- 当前服务支持的通道是 `qc / u2 / qt / Fr`；默认设计不得要求不存在的 `fs` 字段。

## 6. 交互与启停规则

- `重新检查`：默认可用；运行中禁用。
- `检查规则`：打开只读检查规则面板；若 WinUI 切片暂不实现，则按钮必须禁用。
- `进入地层分层`：
  - 阻塞项大于 0：禁用。
  - 运行中：禁用。
  - 运行失败：禁用，并保留上次结果状态。
  - 无阻塞但有警告：启用，警告记录保留。
  - 全部通过：启用。
- 点击问题：同步选中问题、曲线深度带、定位数据行、右侧问题详情。
- `定位到数据行`：跳转或滚动到数据预览/导入记录中的对应行。
- `返回数据导入`：打开 `03 数据导入`，用于修正原始数据。

可进入条件：

```text
hasProject
&& TestPointCount > 0
&& CptuRecordCount > 0
&& !runFailed
&& ErrorCount == 0
```

`WarningCount > 0` 不阻塞进入 `地层分层`；`InfoCount` 和 `NoOpenIssues` 不得被当作阻塞项。

## 7. 开发对象

后续实现应优先复用：

- `OffshoreGeotechWorkbench/Pages/DataCheckPage.xaml`
- `OffshoreGeotechWorkbench/Pages/DataCheckPage.xaml.cs`
- `OffshoreGeotechWorkbench/Services/DataQualityCheckService.cs`
- `OffshoreGeotechWorkbench/Models/DataCheckSummary.cs`
- `OffshoreGeotechWorkbench/Models/DataIssueListItem.cs`

不应在本页面重新实现导入解析、提交语义或数据检查规则。

必须补清或显式降级的数据合同：

- 当前范围：项目级 / 选中点位。
- 问题归属：TestPointId、PointName、规则、严重级别、位置。
- 证据定位：字段名、深度区间、行号区间、可视化通道。
- 结果截断：若继续使用 `LIMIT 50`，UI 必须显示 `显示前 50 条 / 共 N 条`。
- 无数据判断：不能依赖 `NoOpenIssues`；必须用项目测点数和 CPTU 行数判断。

## 8. 验证证据

Figma 导出截图尺寸：

```text
figma-04-data-check-main.png = 1920x1080
figma-04-1-data-check-empty-state.png = 1920x1080
figma-04-2-data-check-running-state.png = 1920x1080
figma-04-3-data-check-warning-state.png = 1920x1080
figma-04-4-data-check-passed-state.png = 1920x1080
figma-04-5-data-check-run-failed-state.png = 1920x1080
figma-04-6-data-check-rules-panel.png = 760x560
```

文档校验：

```powershell
git diff --check -- plan.md Process.md docs/ui-04-data-check-development-handoff.md docs/figma-interface-04-data-check-review.md process_logs/Process79.md
```

## 9. 关闭门槛

本切片关闭前必须具备：

- Figma 主图与 5 个状态图已创建。
- 截图已导出并验证为 1920 x 1080。
- 开发 handoff 说明页面责任、状态、入口和开发对象。
- review 记录说明 VSCode-like、中文 UI、布局对齐、功能入口闭环和实现边界。
- 未修复 `blocking` finding 前不得进入 WinUI 实现。

## 10. Reviewer 分工与当前结论

- Slice owner：main agent。
- Integration owner：main agent。
- Planning/contract reviewer：Carver。
- Engineering critique reviewer：Bohr。
- UI Chinese user reviewer：Bernoulli。

初审 blocking：

- 缺 owner / closure gate：已在本节补齐。
- `检查规则` 入口悬空：已新增 Figma `04-6 数据检查-检查规则面板`，并将按钮文案改为 `检查规则`。
- 项目级服务与点位级 handoff 冲突：已收敛为 `项目级质量门 + 选中点位钻取`。
- 曲线/数据行定位缺数据合同：已明确为目标交互；未补 `IssueEvidence` 前必须降级。

剩余风险：

- 当前设计仍是 Figma/handoff，不证明 WinUI 已实现。
- 后续实现必须先确认 `IssueEvidence` 是否进入本切片；若不进入，中央证据预览必须采用降级态。

## 11. 下一步候选

1. 对 `04 数据检查` 设计稿进行 reviewer agent 审查并修复 blocking/risk。
2. 若设计关闭，进入 `04 数据检查 WinUI 实现`。
3. 或继续绘制 `05 地层分层` 的真实 UI 图与 handoff。
