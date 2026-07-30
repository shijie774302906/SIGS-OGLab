# Figma 04 数据检查设计记录

日期：2026-07-04

## 1. 设计目标

按照 `design.md` 的工作流，绘制真实用户可见的 `04 数据检查` UI，而不是说明板。

目标是让后续开发可以直接判断：

- 页面结构如何继承 VSCode-like shell。
- 数据检查默认状态如何展示。
- 质量门如何控制 `进入地层分层`。
- 关键状态如何覆盖。
- 新增入口是否有落点或明确边界。

## 2. 设计来源

- 统一壳层：Figma `01 Workbench shell`，节点 `1:408`。
- 参考图：`数据检查界面-参考`，节点 `4:5`。
- 功能说明：`docs/workbench-functional-design-spec.md`。
- 当前代码能力：
  - `DataCheckPage`
  - `DataQualityCheckService`
  - `DataCheckSummary`
  - `DataIssueListItem`

当前 Figma 按 `项目级质量门 + 选中点位钻取` 设计。曲线和数据行定位是目标交互，后续实现必须先补 `IssueEvidence` 合同，或降级为问题详情。

## 3. Figma 节点

| 页面 | 节点 | 状态 |
| --- | --- | --- |
| `04 数据检查` | `37:2` | 默认阻塞状态 |
| `04-1 数据检查-无数据空状态` | `40:2` | 无可检查数据 |
| `04-2 数据检查-运行中状态` | `40:369` | 检查运行中 |
| `04-3 数据检查-警告可继续状态` | `40:733` | 无阻塞，有警告 |
| `04-4 数据检查-通过状态` | `40:1133` | 全部通过 |
| `04-5 数据检查-运行失败状态` | `40:1506` | 检查服务失败 |
| `04-6 数据检查-检查规则面板` | `43:14` | 只读规则说明 |

## 4. 截图证据

| 截图 | 尺寸 |
| --- | --- |
| `app_data/temp/figma-04-data-check-main.png` | `1920 x 1080` |
| `app_data/temp/figma-04-1-data-check-empty-state.png` | `1920 x 1080` |
| `app_data/temp/figma-04-2-data-check-running-state.png` | `1920 x 1080` |
| `app_data/temp/figma-04-3-data-check-warning-state.png` | `1920 x 1080` |
| `app_data/temp/figma-04-4-data-check-passed-state.png` | `1920 x 1080` |
| `app_data/temp/figma-04-5-data-check-run-failed-state.png` | `1920 x 1080` |
| `app_data/temp/figma-04-6-data-check-rules-panel.png` | `760 x 560` |

## 5. 自检结论

### VSCode-like

Pass.

- 顶部菜单、命令路径、Activity Bar、资源管理器、Editor Tabs、右侧属性、底部面板、状态栏均沿用 `01 Workbench shell`。
- `数据检查` 在 Explorer 和 Tab 中均为选中状态。
- 页面密度保持工作台风格，没有使用大圆角卡片、营销式 hero 或解释型大图。

### 中文 UI

Pass.

- 可见用户文案为中文。
- 保留 `CPT/CPTU`、`qc`、`fs`、`u2`、`SQLite` 等必要技术符号。
- 不使用 `runner`、`registry`、`draft package` 等内部开发词作为默认界面内容。

### 功能直达

Pass.

- 默认阻塞页直接显示阻塞项、警告项、通过规则和分层准入状态。
- 问题列表、曲线定位、数据行、右侧详情形成闭环。
- 警告可继续态清楚显示 `进入地层分层` 可用。
- 运行失败态说明结果未更新，并保留下一步动作。
- 规则入口已从 `全部规则` 收敛为 `检查规则`，并新增只读规则面板。

### 入口闭环

Pass with implementation boundary.

- `重新检查`、`进入地层分层`、问题行点击、`定位到数据行`、`返回数据导入` 均有目标落点。
- `检查规则` 有 Figma 面板 `43:14`。
- `定位到数据行` 和曲线证据依赖 `IssueEvidence`；未实现该合同时必须降级。

### 视觉风险

Risk.

- 通过状态相对留白较多，但已补检查摘要并去掉重复 CTA，当前可接受。
- 主图证据使用 `figma-04-data-check-main.png`；早期同名下载 `figma-04-data-check.png` 被本地查看器占用且不作为证据引用。

## 6. Reviewer Findings 与修复

### Planning/Contract Reviewer

Initial result: `blocking`.

- Finding: closure gate 缺 owner / reviewer evidence。
- Fix: `plan.md` 已补 slice owner、integration owner、Planning/contract reviewer、Engineering critique reviewer、UI Chinese user reviewer。
- Finding: `全部规则` 入口悬空。
- Fix: Figma 已改为 `检查规则`，新增 `04-6 数据检查-检查规则面板`，节点 `43:14`。

### Engineering Critique Reviewer

Initial result: `blocking`.

- Finding: handoff 写成当前点位质量门，但当前服务是项目级汇总。
- Fix: handoff 和 Figma 已收敛为 `项目级质量门 + 选中点位钻取`。
- Finding: 无数据状态会被当前服务 `NoOpenIssues` 误导。
- Fix: handoff 明确无数据必须依据 `TestPointCount` 和 `CptuRecordCount`，不能依赖 `NoOpenIssues`。
- Finding: 曲线定位、字段/深度范围、数据行定位没有当前数据合同。
- Fix: handoff 新增 `IssueEvidence` 目标合同；未补合同时必须降级，不得伪造曲线。

### UI Chinese User Reviewer

Initial result: `risk`, no blocking.

- Finding: 通过态 CTA 重复、留白过多。
- Fix: 通过态保留顶部主入口，中央补检查摘要，右侧改为提示从顶部进入。
- Finding: 运行失败态底部容易误读为当前质量。
- Fix: 失败态状态栏和 Explorer footer 改为 `上次质量` 语义。
- Finding: 曲线缺最小单位。
- Fix: 主图与警告态补 `qc / Fr / u2` 标签和单位。
- Finding: `疑似惯入异常` 用词错误。
- Fix: 改为 `疑似贯入异常`。

## 7. 后续实现注意

- 不要新增 `标记已处理`，当前代码没有此能力。
- 不要把完整日志作为默认底部内容。
- 不要把规则解释做成长说明页；规则入口应是紧凑窗口或筛选配置。
- 不要在数据检查页重新实现导入解析。
- `进入地层分层` 是质量门的核心验收点，必须可测试。
- 不要把项目级 `OpenIssueCount` 直接当作准入条件；应使用 `ErrorCount == 0` 加项目数据存在性和运行状态。
- 不要在没有 `IssueEvidence` 时实现假曲线、假深度带或假数据行。

## 8. 关闭建议

当前设计已根据 reviewer blocking 完成修复。建议进行一次 reviewer re-check；若无 blocking，可作为 `04 数据检查 WinUI 实现` 的输入。
