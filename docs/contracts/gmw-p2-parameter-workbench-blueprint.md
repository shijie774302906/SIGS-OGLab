# GMW-P2A 参数解译工作台蓝图

日期：2026-06-30

适用范围：`GMW-P2A：参数解译页信息架构和参数槽蓝图`

相关前置：

- `docs/method-workflow-generalization-plan.md`
- `docs/gmw-p1-stratification-workbench-blueprint.md`
- `docs/gmw-p1-layer-scheme-data-contract.md`
- `docs/ux-v5-vscode-like-workbench-contract.md`

## 1. 定位

`参数解译` 是主流程中的工程参数结果消费页，不是 Method Lab，也不是某个公式的专属页面。

它回答四个问题：

1. 当前参数解译基于哪套 `LayerScheme`？
2. 每类层位、每个参数使用什么方法？
3. 曲线结果、层代表值和无效区间是什么？
4. 哪些参数槽因为输入、土类、方法状态或权限不足而不能运行或不能保存？

它不回答：

- 某个方法如何安装、调试、查看 stdout/stderr。
- 所有候选方法的完整 JSON。
- 未经采纳的 MethodRun 能否直接进入正式成果。
- 新工程参数公式是否成立。

## 2. 当前实现边界

当前产品已有一个参数功能基线：

- 页面：`InterpretationPage` 的 `parameters` route / 参数 tab。
- 服务：`CptuParameterInterpretationService`。
- 当前保存表：`ParameterInterpretationRuns`、`ParameterInterpretationValues`。
- 当前参数：`PhiDeg`、`SuKpa`。
- 当前来源：最新完成的 `CPTU-RW-Ic-FirstPass`。
- 当前输入：`Ic`、`Qtn`、`QnetKpa`、`Nkt` 等。

P2A 不改变以上实现。P2A 只定义下一阶段如何把这些能力抽象成通用工作台。

历史设计文档：

- `参数解译设计说明.md`：记录 `φ'` / `Su` 首批参数、公式来源、适用性和旧 UI 切片。
- `参数持久化与导出设计说明.md`：记录 `ParameterInterpretationRuns` / `ParameterInterpretationValues` 的历史持久化决策。

这些文档是 P2A 的兼容输入，不是新的通用对象合同。后续 `ParameterScheme` 不能直接等同于当前数据库里的 `ParameterInterpretationRun`，除非未来切片显式设计 schema 或 adapter 合同。

## 3. 设计计划

### 3.1 色彩 token

工作台 shell 继续使用 VSCode-like token，不新增参数页主题色：

| Token | Hex | 用途 |
| --- | --- | --- |
| `VSCodeActivityBar` | `#333333` | Activity Bar |
| `VSCodeTitleBar` | `#DDDDDD` | 顶部菜单/command chrome |
| `VSCodeSideBar` | `#F3F3F3` | Explorer / Side Bar |
| `VSCodeEditor` | `#FFFFFF` | Editor 主背景 |
| `VSCodeLine` | `#E5E5E5` | 1px 分隔线 |
| `VSCodeAccent` | `#007ACC` | 状态栏、选中强调 |

语义色只表示状态，不作为主题强调色：

- success：可运行、已保存、输入通过。
- warning：可试算、需复核、部分层适用。
- error：阻断、缺输入、不能保存、不能输出。

### 3.2 字体

- UI：`Segoe UI`。
- 数值、深度、run id、method id、路径：系统等宽字体。
- 参数符号保留工程记号：`φ'`、`Su`、`γ`、`OCR`、`Dr`、`M`、`K0`、`Vs`、`Gmax`。

### 3.3 布局概念

参数解译页落在 VSCode-like Editor document 内：

```text
Top Context Row
  Point | LayerScheme input | ParameterScheme | Run | Save | Export eligibility

Left Pane
  ParameterScheme 列表

Center Editor
  参数曲线轨道 + layer background + 参数槽配置 / 层统计

Right Details
  当前参数槽 / 当前层参数 / 方法输入要求 / provenance 摘要

Bottom Panel
  方法可用性 / 日志 / 参数方案对比 / 输出预检
```

默认工程视图先看结果和阻断项；方法配置、公式来源、完整 warning 和研究对比按需展开。

## 4. 核心对象

### 4.1 ParameterScheme

`ParameterScheme` 是参数解译页的主对象。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `parameterSchemeId` | 稳定 id |
| `name` | 显示名 |
| `pointId` | CPT/CPTU 点位 |
| `sourceLayerSchemeId` | 使用的分层方案 |
| `sourceLayerSchemeStatus` | `Adopted / Draft / Candidate / Review / Invalid` |
| `mode` | `Official / Trial / Research / Draft` |
| `status` | `Draft / Runnable / Completed / Blocked / Archived` |
| `parameterSlots[]` | 参数槽 |
| `resultSeries[]` | 曲线结果 |
| `layerStatistics[]` | 层统计 |
| `preflight` | 输入和保存预检 |
| `sourceRunRefs[]` | 来源 run、method、data hash |
| `createdAt` / `modifiedAt` | 时间 |
| `isExportSelected` | 是否进入成果输出 |

原则：

- `ParameterScheme` 不等于 `MethodRun`。
- 一个 `ParameterScheme` 可以包含多个参数槽。
- 保存为正式成果前必须有清楚的 `sourceLayerSchemeId` 和权限状态。

### 4.2 ParameterSlot

`ParameterSlot` 表达“某类层位上的某个参数用什么方法”。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `slotId` | 稳定 id |
| `parameterKey` | `PhiDeg / SuKpa / Gamma / OCR / Dr / ...` |
| `parameterSymbol` | `φ' / Su / γ / OCR / Dr / ...` |
| `targetLayerFilter` | 目标层过滤 |
| `selectedMethodId` | 当前方法 |
| `availableMethods[]` | 过滤后的可选方法 |
| `requiredInputs[]` | 必需输入 |
| `settings` | 方法参数 |
| `outputMode` | `Curve / LayerRepresentative / Both` |
| `validationState` | `Ready / MissingInput / NeedsReview / NotApplicable / Blocked` |
| `runState` | `NotRun / Running / Completed / Failed / Stale` |
| `provenance` | 公式来源、版本、run id |

`targetLayerFilter` 不应只写死参数名，应能表达：

```text
engineeringSoilGroup in sand/clay/mixed/unknown
LayerScheme status
depth interval
manual override state
project rule
```

### 4.3 ParameterSeries

`ParameterSeries` 是深度连续或离散曲线结果。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `seriesId` | 稳定 id |
| `slotId` | 来源参数槽 |
| `parameterKey` | 参数 |
| `unit` | 单位 |
| `points[]` | 深度和值 |
| `invalidIntervals[]` | 无效或不适用区间 |
| `methodId` / `methodVersion` | 方法来源 |
| `sourceInputRefs[]` | 输入字段来源 |

### 4.4 ParameterLayerStatistic

`ParameterLayerStatistic` 是按 `LayerScheme` 汇总后的层代表值。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `layerId` | 对应层 |
| `parameterKey` | 参数 |
| `validPointCount` | 有效点数 |
| `invalidPointCount` | 无效点数 |
| `representativeValue` | 推荐代表值 |
| `min` / `max` / `mean` / `median` | 统计 |
| `methodId` | 方法来源 |
| `qualityFlag` | `Ok / Sparse / Mixed / Blocked / NeedsReview` |

### 4.5 MethodAvailability

`MethodAvailability` 是方法选择器和 Bottom Panel 的输入，不是方法列表装饰。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `slotId` | 对应参数槽 |
| `methodId` | 候选方法 |
| `capabilityId` | 方法能力 |
| `engineeringUseLevel` | `OfficialCandidate / Reference / Experimental / DebugOnly` |
| `isInstalled` | 是否可运行 |
| `requiredInputsState` | `Ok / Missing / Invalid / Stale` |
| `applicableLayerState` | `Ok / Partial / NeedsReview / Blocked` |
| `canSelect` | 是否可选 |
| `canRunTrial` | 是否可试算 |
| `canRunOfficial` | 是否可正式运行 |
| `blockingReasons[]` | 阻断原因 |
| `warningReasons[]` | 非阻断警告 |

### 4.6 InputBlocking

`InputBlocking` 统一表达缺输入、过期、土类不适用和权限不足。

建议字段：

| 字段 | 含义 |
| --- | --- |
| `blockingId` | 稳定 id |
| `scope` | `Scheme / Slot / Layer / Series / Export` |
| `severity` | `Error / Warning / Info` |
| `reasonCode` | 机器可测 code |
| `message` | 用户可读短句 |
| `requiredAction` | 用户下一步 |
| `linkedObjectId` | 可联动对象 |

阻断必须进入右侧详情和 Bottom Panel；不能只隐藏按钮。

## 5. LayerScheme 输入权限矩阵

P2A 的核心规则：参数解译必须显式消费一个 `LayerScheme`。

| LayerScheme 状态 | 可用于试算 | 可用于正式参数解译 | 可进入成果输出 | UI 表达 |
| --- | --- | --- | --- | --- |
| `Adopted` | yes | yes | yes, after ParameterScheme saved | 默认工程输入 |
| `Draft` | yes | only if saved and reviewed | no, until adopted/reviewed | 草稿/需审查 |
| `Candidate` | yes | no | no | 试算候选 |
| `Review` | yes | no | no | 工程整理候选，只读 |
| `projectionOnly=true` | yes, if preflight allows trial | no | no | 只读投影/试算 |
| `Invalid` | no | no | no | 阻断 |

规则：

- `Candidate`、`Review` 不能静默进入正式参数解译。
- `Review` 可以用于科研/工程试算，但保存结果必须标记 `Trial` 或 `Research`。
- `projectionOnly=true` 的 `LayerScheme` 不能进入 official/export 链路，即使曲线和层统计看起来完整。
- `Official ParameterScheme` 默认只能基于 `Adopted LayerScheme`，或显式审查通过的 `Draft`。
- 如果 `LayerScheme.Preflight.CanUseForOfficialParameterRun=false`，`Save official` 必须禁用。
- 如果 `LayerScheme.Preflight.EngineeringSoilGroupStatus` 不通过，方法选择器只允许人工复核或研究试算路径。

## 6. 土类与参数槽过滤

参数方法选择器必须按能力过滤，不显示所有方法。

### 6.1 基本过滤链

```text
selected LayerScheme
  -> target parameter
  -> target layers / engineeringSoilGroup
  -> required inputs
  -> method capability
  -> engineeringUseLevel
  -> run/save permission
```

### 6.2 常见参数槽

| 参数槽 | 默认目标层 | 当前或未来方法类型 | 阻断条件 |
| --- | --- | --- | --- |
| `φ'` | sand | Qtn/Ic based drained methods | 非砂类、缺 Qtn、LayerScheme 未确认 |
| `Su` | clay | Nkt/qnet based undrained methods | 非黏性、缺 qnet、Nkt 无效 |
| `γ` | all or project-selected | unit weight correlations / manual values | 缺必要输入或项目规则未确认 |
| `OCR` | clay or method-specific | OCR correlations | 缺适用土类、缺公式输入 |
| `Dr` | sand | relative density correlations | 非砂类、缺 Qtn 或应力输入 |

### 6.3 mixed / transition / unknown 层

| 工程分组 | 默认行为 |
| --- | --- |
| `sand` | 可进入砂类参数槽 |
| `clay` | 可进入黏性参数槽 |
| `mixed` | 默认 `NeedsReview`，可配置 split、manual override 或 research trial |
| `unknown` | 默认阻断正式参数解译 |
| `transition` | 不自动套用砂或黏方法，需人工选择或显示双方法试算 |

### 6.4 方法假定与输入来源

参数方法不能把默认设置显示成场地标定值。

必须显式标记：

- `Nkt=12` 这类默认值是 method assumption，不是场地试验标定。
- 水位、单位重、应力修正来自项目输入或当前默认设置时，必须显示来源。
- 超出方法适用范围的输出不得参与正式层统计。
- 缺 `formulaRef`、`methodId`、`methodVersion`、`sourceInputRefs`、`sourceLayerSchemeId` 的结果不得进入 official 链路。

## 7. 页面区域

### 7.1 Top Context Row

用途：当前点位、输入分层、参数方案和运行状态。

内容：

- point selector / point label
- `LayerScheme` selector
- `ParameterScheme` selector
- `Run` button
- `Save as Draft` button
- `Save official` button
- `Export eligibility` indicator

规则：

- `LayerScheme` selector 必须显示状态：`Adopted / Draft / Candidate / Review / Invalid`。
- 当选中 `Review` 或 `Candidate` 时，`Save official` 禁用，`Run trial` 可用。
- 不在顶部放完整公式说明。

AutomationId 建议：

- `ParameterPointSelector`
- `ParameterLayerSchemeSelector`
- `ParameterSchemeSelector`
- `ParameterRunButton`
- `ParameterSaveDraftButton`
- `ParameterSaveOfficialButton`
- `ParameterExportEligibilityText`

### 7.2 Left Pane: ParameterScheme 列表

列表项字段：

- scheme name
- source LayerScheme
- mode/status
- slot count
- valid/blocked slot count
- latest run/save time
- export selected state

排序建议：

1. official/export selected
2. latest completed
3. runnable draft
4. trial/research
5. archived

交互：

- 点击 scheme：切换中间曲线、槽配置、右侧详情和 Bottom Panel。
- 更多菜单：复制为试算、复制为草稿、归档、查看来源。

AutomationId 建议：

- `ParameterSchemeList`
- `ParameterSchemeListItem_{parameterSchemeId}`

### 7.3 Center Editor: 结果优先视图

中间区域分为两个纵向区：

```text
Result Tracks
  depth | layer background | φ' | Su | selected parameter tracks

Slot / Layer Table
  tabs: 参数槽配置 / 层统计 / 无效区间
```

默认首屏优先级：

1. 参数曲线轨道。
2. 当前 `LayerScheme` 背景。
3. blocked / needs review 区间。
4. 参数槽配置摘要。
5. 层统计。

曲线轨道规则：

- 深度轴必须和选定 `LayerScheme` 对齐。
- 参数曲线不应该用方法名作为主视觉分组，而应该按参数分组。
- 同一参数的多方法对比默认不展开，进入 Bottom Panel 的 compare 视图。
- 无效或不适用区间必须可见，不能只靠空白。
- invalid/skipped 区间不得用连续线连接成看似有效的曲线。
- 曲线旁必须能看出 `Official / Trial / Research / Reference / Experimental` 身份。

SBT / 分类证据在参数页只显示摘要：

- 当前层主导行为类型。
- 工程分组。
- 证据点数。
- 冲突/不确定性摘要。
- 打开到 `地层分层` 证据视图的入口。

完整 Robertson / SBT 图不作为参数页默认主图。

AutomationId 建议：

- `ParameterResultTracks`
- `ParameterDepthAxis`
- `ParameterLayerBackgroundTrack`
- `ParameterCurveTrack_{parameterKey}`
- `ParameterSlotTable`
- `ParameterLayerStatisticTable`
- `ParameterInvalidIntervalTable`

### 7.4 ParameterSlot 配置表

列：

| 列 | 内容 |
| --- | --- |
| 参数 | `φ' / Su / γ / ...` |
| 目标层 | sand / clay / mixed / selected layers |
| 方法 | selected method |
| 输入状态 | ok / missing / needs review / blocked |
| 输出 | curve / representative / both |
| 状态 | not run / completed / stale / failed |
| 操作 | choose method / settings / run slot |

方法选择器弹出内容：

- 只显示符合 `MethodCapability` 的方法。
- 每个方法行显示：display name、engineeringUseLevel、required inputs state、公式来源、版本。
- 不显示安装路径、stdout、完整 JSON。
- 缺输入的方法可以显示但不可选，除非用户切到 research mode。

### 7.5 Right Details

右侧面板随当前对象变化。

`ParameterSlot` detail：

- parameter
- target layer filter
- selected method
- formula ref
- required inputs
- settings
- validation state
- blocked reason
- provenance

`Layer parameter` detail：

- layer id / depth range
- engineering group
- selected parameter values
- representative value
- representative type：`mean / median / percentile / manual-selected / project-rule`
- valid point count
- invalid reason summary
- source method

层代表值规则：

- 默认只叫“代表值”或“统计值”，不得叫“设计值”。
- `manual-selected` 或 `project-rule` 必须显示来源。
- 试算或 projection-only 来源的代表值不能进入成果输出。

`Method` detail：

- capability
- required inputs
- applicable soil groups
- output mode
- engineeringUseLevel
- known limitations

不默认展示：

- 完整 JSON
- stdout/stderr
- license 长文本
- 过长方法论文摘要

AutomationId 建议：

- `ParameterDetailsPanel`
- `ParameterSlotDetail`
- `ParameterLayerValueDetail`
- `ParameterMethodRequirementDetail`

### 7.6 Bottom Panel

默认折叠或低高度，只在需要时展开。

Tab：

| Tab | 内容 |
| --- | --- |
| 方法可用性 | 每个 slot 的可运行/阻断原因 |
| 运行日志 | run id、状态、warning、error |
| 参数方案对比 | 多个 ParameterScheme 的曲线/统计差异 |
| 输出预检 | 是否可进入成果输出 |

规则：

- 工程默认只展开阻断和预检，不展开完整研究对比。
- 对比默认限制 2-4 个方案。
- 点击 blocked item 应联动到参数槽或缺失输入。

AutomationId 建议：

- `ParameterBottomPanel`
- `ParameterAvailabilityTab`
- `ParameterRunLogTab`
- `ParameterCompareTab`
- `ParameterExportPreflightTab`

## 8. 交互流程

### 8.1 工程默认流程

```text
打开参数解译
  -> 默认选择 adopted LayerScheme
  -> 加载当前 official/draft ParameterScheme
  -> 检查参数槽输入
  -> 展示曲线和层统计
  -> 用户运行或保存
  -> 可进入成果输出预检
```

若无 adopted LayerScheme：

- 显示阻断：`需要先在地层分层中采纳分层方案`。
- 可以提供 `打开地层分层` 操作。
- 允许选择 Candidate/Review 做 trial，但必须标记为 trial/research。

### 8.2 科研试算流程

```text
选择 Candidate/Review LayerScheme
  -> 创建 Trial ParameterScheme
  -> 允许运行可用 slot
  -> 结果标记 Trial/Research
  -> 不进入正式成果输出
```

### 8.3 方法选择流程

```text
点击 slot 方法
  -> 按参数和 layer group 过滤方法
  -> 显示输入状态和公式来源
  -> 选择方法
  -> slot validation 刷新
  -> 若输入完整则可运行
```

## 9. Preflight

### 9.1 LayerScheme preflight

必须检查：

- layer scheme exists
- layer scheme status
- input freshness
- interval order
- overlap
- engineering soil group mapping
- can use for trial
- can use for official

### 9.2 ParameterSlot preflight

必须检查：

- target layers exist
- method selected
- method capability matches parameter
- method applicable soil groups match layers
- required CPT/CPTU inputs exist
- settings valid
- source LayerScheme permission

### 9.3 Save/export preflight

正式保存必须检查：

- source LayerScheme official permission
- all required slots ready or intentionally excluded
- no blocking unknown/mixed layer without review
- method sources and settings recorded
- result freshness matches current data

成果输出必须检查：

- saved completed `ParameterScheme`
- source `LayerScheme` adopted or reviewed
- export selected flag
- required report fields available

## 10. 后续切片

### GMW-P2B：ParameterScheme / ParameterSlot mock 数据对象

目标：

- 新增 mock/projection 数据合同。
- 用 JSON 或只读 projection 表达 `ParameterScheme`、`ParameterSlot`、`ParameterSeries`、`ParameterLayerStatistic`。
- 至少覆盖 `φ'`、`Su`、`γ`、`OCR` 的槽位样例；后两者可以是 blocked/missing，不要求公式实现。
- 引用 `sourceLayerSchemeId`，并记录 `projectionOnly`、`canUseForTrialParameterRun`、`canUseForOfficialParameterRun`。
- 不改 SQLite schema。
- focused check 验证：source LayerScheme、slot permissions、blocked unknown/mixed、no official write。

交付：

- `docs/gmw-p2-parameter-scheme-data-contract.md`
- `sample_data/parameters/yingkou-cpt09-parameter-scheme-bundle.v1.json`
- `tools/parameter-check/run-parameter-scheme-mock-check.ps1`

### GMW-P2C：参数配置表和方法选择器静态布局

目标：

- 在参数解译 route 中落地 VSCode-like 页面骨架。
- 显示 `ParameterScheme` 列表、参数槽配置表、方法选择器静态过滤结果。
- 只读 projection，不改公式，不保存新 scheme。
- 当前 `ParameterInterpretationRuns` 只能作为兼容/历史 run 摘要显示，不作为新 `ParameterScheme` schema。

验收：

- UIA 可找到参数槽表、方法选择器、LayerScheme 输入状态。
- 截图显示结果优先，不是方法列表墙。

### GMW-P2D：参数曲线、层统计、方法来源和输入阻断

目标：

- 将当前 `φ'` / `Su` 派生结果映射到通用 `ParameterSeries`。
- 曲线背景使用选定 `LayerScheme`。
- 层统计表按 layer 汇总。
- 阻断/缺输入/不适用区间可视化。
- invalid/not-applicable 区间断开，不画零线，不参与正式代表值。

验收：

- focused check 验证当前 CPT09 的 `φ'` / `Su` series、slot 状态、layer statistics。
- 截图覆盖参数曲线、层统计和 blocked/invalid 状态。

## 11. AutomationId 合同草案

| AutomationId | 含义 |
| --- | --- |
| `ParameterWorkbenchRoot` | 参数解译工作台根 |
| `ParameterWorkbenchPageRoot` | 参数解译工作台根，兼容后续命名 |
| `ParameterCommandRow` | 参数页上下文和命令行 |
| `ParameterPointSelector` | 当前点位 |
| `ParameterLayerSchemeSelector` | 分层方案选择 |
| `ParameterLayerSchemePreflightStatus` | 分层方案输入预检状态 |
| `ParameterSchemeSelector` | 参数方案选择 |
| `ParameterSchemeList` | 左侧方案列表 |
| `ParameterSchemeListItem_{parameterSchemeId}` | 参数方案列表项 |
| `ParameterResultTracks` | 参数结果曲线区 |
| `ParameterCurveBoard` | 参数曲线主板，兼容后续命名 |
| `ParameterLayerBackgroundTrack` | 分层背景轨道 |
| `ParameterCurveTrack_{parameterKey}` | 参数曲线轨道 |
| `ParameterSeriesTrack_{parameterKey}` | 参数曲线轨道，兼容后续命名 |
| `ParameterSlotTable` | 参数槽配置表 |
| `ParameterSlotRow_{slotId}` | 参数槽行 |
| `ParameterMethodPicker_{slotId}` | 方法选择器 |
| `ParameterSlotInputState_{slotId}` | 参数槽输入状态 |
| `ParameterMethodCandidateList` | 方法候选列表 |
| `ParameterMethodCandidateRow_{methodId}` | 方法候选行 |
| `ParameterLayerStatisticTable` | 层统计表 |
| `ParameterLayerStatisticsTable` | 层统计表，兼容后续命名 |
| `ParameterLayerStatisticRow_{layerId}_{parameterKey}` | 层统计行 |
| `ParameterInvalidIntervalTable` | 无效区间表 |
| `ParameterDetailsPanel` | 右侧详情 |
| `SelectedParameterSlotToken` | 当前参数槽 UIA token |
| `ParameterSlotDetail` | 参数槽详情 |
| `ParameterSlotDetailContext` | 参数槽详情上下文 |
| `ParameterMethodRequirementDetail` | 方法输入要求 |
| `ParameterBottomPanel` | 底部参数面板 |
| `ParameterAvailabilityPanel` | 方法可用性面板 |
| `ParameterPreflightPanel` | 参数预检面板 |
| `ParameterProjectionSafetyToken` | no-official-write/projection-only 安全 token |
| `ParameterAvailabilityTab` | 方法可用性 |
| `ParameterRunLogTab` | 运行日志 |
| `ParameterCompareTab` | 参数方案对比 |
| `ParameterExportPreflightTab` | 输出预检 |

## 12. 验收标准

P2A 文档切片验收：

- 蓝图明确参数页必须消费 `LayerScheme`。
- 蓝图定义 `ParameterScheme`、`ParameterSlot`、`ParameterSeries`、`ParameterLayerStatistic`。
- 蓝图给出 `Candidate / Draft / Adopted / Review / Invalid` 权限矩阵。
- 蓝图定义砂、黏、混合、过渡、未知层的过滤和阻断规则。
- 蓝图给出 VSCode-like 布局和默认工程视图优先级。
- 蓝图拆分 P2B/P2C/P2D，并定义验证方向。
- 文档 diff check 通过。

后续实现切片验收：

- 必须有 focused checks。
- UI 实现必须有 1920x1080 全物理截图。
- 不得改变公式、schema、导出合同，除非新切片显式确认。

建议 focused checks：

- `parameter-scheme-mock-check`：校验 bundle schema、`projectionOnly=true`、`sourceLayerSchemeId`、slots、series、layer stats、preflight。
- `parameter-no-official-write-check`：页面打开/选择/切换前后 `InterpretationRuns`、`InterpretationResults`、`ParameterInterpretationRuns`、`ParameterInterpretationValues`、`ExportRecords` 行数不变。
- `parameter-method-filter-check`：方法候选按参数、土类、输入、identity 和 engineeringUseLevel 过滤，不能出现“所有方法”列表。
- `parameter-projection-check`：当前 `φ'` / `Su` 可映射为 `ParameterSeries`，invalid/not-applicable 区间断开，layer stats 与 source LayerScheme 对齐。
- `parameter-workbench-runtime-check`：打开 `parameters` route，选择 scheme、slot、method candidate、layer statistic，右侧和 Bottom Panel 同步。

## 13. Agent 审核问题

Product architecture reviewer：

- 是否围绕 `ParameterScheme` / `ParameterSlot`，而不是围绕 `φ'`、`Su` 或某个方法名？
- 后续新增 20 个参数方法时是否仍能进入同一布局？
- `LayerScheme` 权限矩阵是否防止候选结果静默进入成果？

Geotechnical domain reviewer：

- 砂、黏、混合、过渡、未知层的参数适用性是否合理？
- 当前 `φ'` / `Su` 能否作为通用 slot 的首批映射？
- 输入不足、Nkt 无效、土类不适用是否会明确阻断？

UI/layout reviewer：

- 默认界面是否先看曲线、层统计和阻断项？
- 方法配置是否压在合适位置，而不是淹没结果？
- 页面是否符合 VSCode-like 工作台区域语法？

Implementation/QA reviewer：

- P2B/P2C/P2D 是否能按只读 projection 逐步落地？
- AutomationId 和 focused checks 是否足够稳定？
- 文档是否避免承诺未实现的公式、保存或导出能力？
