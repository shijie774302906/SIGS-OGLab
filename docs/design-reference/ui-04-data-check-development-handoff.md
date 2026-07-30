# 04 数据检查开发 Handoff

日期：2026-07-04

## 1. 页面目的

`数据检查` 是 `数据导入` 和 `地层分层` 之间的质量门。

本 handoff 的实现边界定为：

```text
项目级质量门 + 选中点位钻取
```

原因是当前 `DataQualityCheckService` 已经按当前项目运行检查并汇总问题，尚未提供稳定的点位级质量门和曲线证据合同。

页面默认要让工程用户直接判断：

- 当前项目/样例能不能进入 `地层分层`。
- 阻塞项属于哪个点位、规则、位置和后续流程。
- 警告项是否允许继续。
- 下一步应该回到 `数据导入` 修正，还是进入 `地层分层`。

默认页不展示内部 runner、registry、draft package、长日志或开发调试信息。

## 2. Figma 交付物

| 页面 | 节点 | 截图 |
| --- | --- | --- |
| 主图：阻塞状态 | `37:2` | `app_data/temp/figma-04-data-check-main.png` |
| 无数据空状态 | `40:2` | `app_data/temp/figma-04-1-data-check-empty-state.png` |
| 运行中状态 | `40:369` | `app_data/temp/figma-04-2-data-check-running-state.png` |
| 警告可继续状态 | `40:733` | `app_data/temp/figma-04-3-data-check-warning-state.png` |
| 通过状态 | `40:1133` | `app_data/temp/figma-04-4-data-check-passed-state.png` |
| 运行失败状态 | `40:1506` | `app_data/temp/figma-04-5-data-check-run-failed-state.png` |
| 检查规则面板 | `43:14` | `app_data/temp/figma-04-6-data-check-rules-panel.png` |

所有状态页都继承 `01 Workbench shell`，只替换中央 Editor、右侧属性和底部面板内容。

## 3. 页面布局

### 顶部区域

- 标题：`数据检查`
- 副标题：当前点位和当前质量结论。
- 操作：
- `重新检查`
- `检查规则`
- `进入地层分层`

### 中央主工作区

默认阻塞状态分三块：

- 顶部状态摘要：
  - 阻塞项
  - 警告项
  - 已通过规则
  - 当前点位
  - 分层准入状态
- 左侧问题列表：
  - 严重级别
  - 问题编号
  - 字段
  - 深度范围
  - 简短说明
- 中央数据定位预览：
  - qc / Fr / u2 关键曲线
  - 阻塞或警告深度带
  - 定位数据行

重要实现边界：

- 曲线、深度带、定位数据行是目标交互。
- 当前模型 `DataIssueListItem` 不包含字段、深度范围、行号或曲线证据。
- 在新增 `IssueEvidence` 合同前，WinUI 最小实现必须降级为问题列表 + 位置 + 消息 + 建议，不得伪造曲线或数据行。

### 右侧属性面板

阻塞状态显示：

- 问题编号
- 字段
- 深度范围
- 判断说明
- 对工作流影响
- 建议处理
- `定位到数据行`
- `返回数据导入`

警告/通过状态显示当前检查状态和 `进入地层分层`。

运行失败状态显示错误说明、错误代码、`查看检查记录` 与 `重新检查`。

### 底部面板

固定 tab：

- `问题`
- `预检`
- `检查记录`

默认选中 `问题`。底部面板只展示用户可理解的质量记录，不展示内部长日志。

## 4. 状态机

| 状态 | 条件 | 主按钮 | 下一步 |
| --- | --- | --- | --- |
| 无数据 | 当前项目无测点或无 CPT/CPTU 记录 | `进入地层分层` 禁用 | 进入 `数据导入` |
| 运行中 | 正在执行检查 | `重新检查` 禁用，`进入地层分层` 禁用 | 等待结果 |
| 阻塞 | 阻塞项 > 0 | `进入地层分层` 禁用 | 定位问题并回到导入修正 |
| 警告可继续 | 阻塞项 = 0，警告项 > 0 | `进入地层分层` 启用 | 进入 `地层分层`，保留警告记录 |
| 通过 | 阻塞项 = 0，警告项 = 0 | `进入地层分层` 启用 | 进入 `地层分层` |
| 运行失败 | 检查服务失败或数据源不可访问 | `进入地层分层` 禁用 | 查看记录并重新检查 |

## 5. 功能入口闭环

| 入口 | 目标落点 | 当前实现要求 |
| --- | --- | --- |
| `重新检查` | 调用 `DataQualityCheckService.RunChecks()` 并刷新摘要 | 运行中禁用重复点击 |
| `检查规则` | 只读规则说明面板 | 最小实现见 Figma `43:14`；若本轮不实现，按钮必须禁用 |
| `进入地层分层` | 打开 `StratificationPage` | 只在无阻塞且非运行失败时可用 |
| 问题行点击 | 同步右侧详情和曲线定位 | 必须至少同步选中问题与右侧详情 |
| `定位到数据行` | 数据预览或导入记录行 | 若未实现跨页定位，需先定位本页预览 |
| `返回数据导入` | 打开 `DataImportPage` | 用于修正原始数据 |
| `查看检查记录` | 底部 `检查记录` tab | 不显示内部长日志 |

## 6. 现有代码对应

优先复用：

- `OffshoreGeotechWorkbench/Pages/DataCheckPage.xaml`
- `OffshoreGeotechWorkbench/Pages/DataCheckPage.xaml.cs`
- `OffshoreGeotechWorkbench/Services/DataQualityCheckService.cs`
- `OffshoreGeotechWorkbench/Models/DataCheckSummary.cs`
- `OffshoreGeotechWorkbench/Models/DataIssueListItem.cs`

当前服务已经覆盖：

- 缺少最终孔深
- 缺少水深
- 缺少测试点编号
- 缺少 CPTU 记录
- 深度非递增
- 深度超出最终孔深
- qc / u2 / qt / Fr 缺失率
- 孔压突跳
- 无问题状态

本 handoff 不要求新增检查规则。

当前服务/模型限制：

- `RunChecks()` 与 `GetSummary()` 均按当前项目工作，不是单点位质量门。
- `EvaluateProject()` 遍历项目内所有 `TestPoints`。
- 当前无测点项目会落入 `NoOpenIssues` 风险，后续实现必须用项目概览的 `TestPointCount` 和 `CptuRecordCount` 先判断无数据。
- `DataIssueListItem` 只有 `Severity / IssueType / Location / Message / SuggestedAction / Status`，不足以直接支持曲线定位。
- 当前记录模型包含 `QcKpa / U2Kpa / QtKpa / FrPercent`，没有 `fs` 字段；默认 UI 应使用 `Fr`。
- 当前摘要 `OpenIssueCount = ErrorCount + WarningCount + InfoCount`，不得用它判断能否进入下一步。

## 7. 质量门判定

`进入地层分层` 的最小判定应为：

```text
hasProject
&& TestPointCount > 0
&& CptuRecordCount > 0
&& !runFailed
&& ErrorCount == 0
```

说明：

- `WarningCount > 0` 时可以继续，但必须保留警告记录。
- `InfoCount` 不阻塞。
- `NoOpenIssues` 只是提示，不应被当作开放问题阻断。
- 运行失败时保留上次结果，但状态栏和底部文案必须写清 `上次质量`。

## 8. IssueEvidence 目标合同

如果实现曲线定位和数据行定位，需要新增或派生一个证据对象：

```text
IssueEvidence
  IssueId / IssueType
  ProjectId
  TestPointId
  PointName
  Severity
  FieldName
  DepthFromM
  DepthToM
  RowIndexFrom
  RowIndexTo
  Channels: qc / Fr / u2 / qt
  Message
  SuggestedAction
```

在该合同不存在前：

- 中央区域显示问题位置、规则说明和建议动作。
- 不显示伪造曲线。
- `定位到数据行` 可禁用，或仅定位本页问题列表。

## 9. 列表截断

当前 `GetSummary()` 查询前 50 条开放问题。

若实现仍保留该限制，UI 必须显示：

```text
显示前 50 条 / 共 N 条
```

并提供严重级别筛选，避免多点位项目误以为只存在 50 条问题。

## 10. 非目标

- 不做自动修复。
- 不做 `标记已处理`。
- 不写入正式采纳结果。
- 不改导入解析或提交语义。
- 不改 SQLite schema。
- 不引入方法实验室、runner 或 registry 作为默认 UI 内容。

## 11. 实现验收

WinUI 实现切片至少需要：

- 1920 x 1080 物理截图。
- 阻塞、无数据、运行中、警告可继续、通过、运行失败六种状态可被验证；若运行失败无法稳定触发，必须提供测试接缝或记录无法自动化的原因。
- `进入地层分层` 启停逻辑正确。
- 点击问题能更新右侧详情。
- `检查规则` 要么打开只读面板，要么禁用。
- 若未实现 `IssueEvidence`，曲线/数据行定位必须降级，不得假画。
- 默认页不显示内部开发术语。
- 本地 QA 通过，或明确记录失败原因和阻塞项。
