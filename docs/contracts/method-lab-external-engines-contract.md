# Method Lab 外部方法引擎兼容合同

日期：2026-06-29

状态：`draft-locked-for-planning`

适用范围：Groundhog、pyCPT 以及后续类似开源/外部 CPT 方法引擎的接入规划。

## 1. 当前共识

用户已确认产品方向：

```text
做一个便捷的开源 CPT 方法接入平台，把 Groundhog、pyCPT 等外部工具作为方法引擎接入，用同一份 CPT/CPTU 数据快速跑多种方法，生成对比结果，服务于工程师参考和方法验证。
```

核心原则：

- 现有正式解译链不被外部方法污染。
- 外部开源方法先作为 `Reference` 或 `Experimental`，不是默认正式成果。
- 现有 SBT 图、曲线剖面、φ'/Su 参数解译页面继续复用，但升级为可承载多方法结果的 evidence viewer。
- Groundhog、pyCPT 的差异通过统一 `MethodRun` 合同抹平，而不是为每个工具复制一套 UI。

## 2. 非目标

当前规划阶段不做：

- 不把 Groundhog GPL-3.0 源码直接复制进主仓库。
- 不把 pyCPT HMRF 代码直接移植进 C#。
- 不把外部结果默认写入正式工程成果。
- 不改变现有数据库 schema。
- 不改变现有正式 Ic/SBTn、φ'/Su 计算结果。
- 不新增 PDF/DXF/IFC 正式导出能力。
- 不实现 VSCode 扩展市场式完整插件生态。
- 不承诺外部引擎结果具备工程审定效力。

## 3. 结果身份模型

所有方法结果必须带身份。

| 身份 | 含义 | 是否可写正式成果 | UI 标记 |
| --- | --- | --- | --- |
| `Official` | 本产品内置、已验证、可审计的正式解释结果 | 是 | `Built-in / Official` |
| `Reference` | 外部引擎或公式 oracle 输出，用于对比和参考 | 默认否 | `Groundhog / Reference / GPL-3.0` |
| `Experimental` | 研究性算法结果，例如 pyCPT 自动分层 | 否 | `pyCPT / Experimental / LGPL-3.0` |

硬规则：

- `Reference` 和 `Experimental` 结果不能与 `Official` 结果用同一视觉状态混在一起。
- 导出正式成果时默认只使用 `Official`。
- 用户若要采纳外部结果，必须经过显式“采纳为方案候选/复制到正式方法”的流程，且记录来源和时间。

## 4. 统一数据合同

### 4.1 MethodEngine

```text
MethodEngine
  engineId
  displayName
  engineType: BuiltIn / PythonExternal / CommandExternal
  license
  version
  installState: NotInstalled / Installed / Broken / Unsupported
  executablePath
  capabilities
  inputRequirements
  outputChannels
```

### 4.2 MethodRun

```text
MethodRun
  runId
  engineId
  methodName
  methodVersion
  status: Pending / Running / Completed / Failed / Cancelled
  resultIdentity: Official / Reference / Experimental
  inputProfileId
  createdAt
  completedAt
  warnings
  provenance
```

### 4.3 MethodRunResult

```text
MethodRunResult
  runId
  outputChannels[]
  layerCandidates[]
  classificationPoints[]
  parameterSeries[]
  summaryMetrics[]
  logs[]
  artifacts[]
```

### 4.4 OutputChannel

```text
OutputChannel
  channelId
  name
  symbol
  unit
  depthSeries
  sourceEngine
  sourceMethod
  identity
  confidence
```

示例：

- Groundhog：`Ic`、`Isbt`、`Qtn`、`Fr`、`Bq`、`φ'`、`Su`、`γt`、`OCR`、`M`、`K0`、`Vs`、`Gmax`。
- pyCPT：`cluster label`、`SBT probability`、`entropy`。

### 4.5 LayerCandidate

```text
LayerCandidate
  candidateId
  runId
  depthFrom
  depthTo
  boundaryType: Hard / Soft / Uncertain
  sourceEngine
  sourceMethod
  sbtType
  probability
  entropy
  identity
```

Groundhog 通常不主要输出自动层界面；pyCPT 的 hard/soft boundary 和 entropy 最适合映射到这里。

### 4.6 ClassificationPoint

```text
ClassificationPoint
  depth
  chartType: SBT / SBTn / Robertson1990 / Robertson2016 / Custom
  x
  y
  label
  sourceEngine
  sourceMethod
  identity
```

用于让现有 SBT 图支持多方法叠加和点位追踪。

## 5. 现有页面兼容规则

| 当前页面/区域 | 新兼容方式 | Groundhog | pyCPT |
| --- | --- | --- | --- |
| 曲线剖面 | 升级为多方法 profile viewer，支持按 engine/method 开关 overlay 或新增 track | 显示 Ic/Qtn/Fr/φ'/Su/γt/OCR/M 等参考通道 | 显示 cluster/entropy 或分层线 |
| SBT 图 | 升级为 classification evidence view，支持 Official/Reference/Experimental 图层 | 显示 Ic/Isbt/Robertson 相关点位 | 显示 cluster、SBT probability、Robertson chart 聚类 |
| φ'/Su 参数解译 | 升级为 parameter channel viewer，显示多方法参数曲线和差异 | 显示 φ'、Su、γt、OCR、M、Vs 等可比通道 | 不进入 φ'/Su，除非后续扩展 |
| 分层索引 | 支持候选层界面和采纳流程 | 可作为辅助公式结果来源 | hard/soft boundary、entropy 是主入口 |
| 右侧 Side Panel | 显示当前方法、license、版本、输入要求、警告、是否正式结果 | 显示 GPL-3.0、函数来源、参数范围 | 显示 LGPL-3.0、迭代参数、不确定性 |
| 底部 Panel | 显示安装状态、运行日志、错误、输出摘要 | Python/pip/runner 日志 | Python/HMRF 运行日志 |

## 6. Method Lab 页面

在 VSCode-like Explorer 中新增候选节点：

```text
当前项目范围
  数据导入
  数据检查
  测试解译
  参数解译
  方法实验室
  成果输出
```

`方法实验室` 页面职责：

1. 检测外部引擎安装状态。
2. 提供安装入口或安装说明。
3. 选择当前测点/数据范围。
4. 选择方法引擎和方法。
5. 运行外部 runner。
6. 读取 JSON 输出。
7. 生成对比摘要。
8. 打开到曲线剖面、SBT 图、参数通道、分层索引中查看。

页面不承担：

- 正式报告导出。
- 公式编辑器。
- 插件市场。
- 外部结果直接入库为正式成果。

## 7. 安装与调用模型

优先采用 VSCode-like 插件体验，但不复制 VSCode 插件市场复杂度。

```text
主程序内置 Adapter
  -> 检查 Python
  -> 检查 engine package
  -> 用户点击安装 / 修复
  -> 外部 runner 执行
  -> JSON 输入输出
  -> 主程序展示结果
```

推荐策略：

- 内置 `GroundhogAdapter` 和 `pyCPTAdapter`。
- 不随主程序内置 Groundhog/pyCPT 源码。
- 用户明确安装后，adapter 调用外部环境。
- runner 输出必须是稳定 JSON。
- 所有外部结果默认标为 `Reference` 或 `Experimental`。

## 8. UI 设计计划

本方向继续服从 UX-V5 VSCode-like 工作台，不另起新视觉系统。

### 8.1 色彩 token

- `VSCodeActivityBar`：`#333333`
- `VSCodeTitleBar`：`#DDDDDD`
- `VSCodeSideBar`：`#F3F3F3`
- `VSCodeEditor`：`#FFFFFF`
- `VSCodeLine`：`#E5E5E5`
- `VSCodeAccent`：`#007ACC`

方法身份标记不替代主题色：

- `Official`：使用现有成功/完成语义绿。
- `Reference`：使用低饱和蓝色文字/边框，强调“参考”而非正式。
- `Experimental`：使用低饱和紫灰或橙色提示，但不能成为全局主题。

### 8.2 排版与密度

- 仍使用 Segoe UI。
- 方法表格和输出通道表使用 tabular numeric。
- 外部引擎卡片不能做大圆角营销卡；使用 VSCode-style list/detail row。
- 右侧信息只显示方法来源、版本、license、输入/输出、警告，不写长说明。

### 8.3 布局

```text
Method Lab Editor
  Header: 当前测点 + 引擎状态摘要
  Left/Top: engine list + install state
  Center: selected method run setup / result comparison table
  Right Side Panel: method metadata + license + warnings
  Bottom Panel: runner logs / errors / output artifacts
```

## 9. 分阶段计划

### R1：合同与数据模型

- 定义 `MethodEngine`、`MethodRun`、`MethodRunResult`、`OutputChannel`、`LayerCandidate`、`ClassificationPoint`。
- 定义 `Official / Reference / Experimental` 身份规则。
- 定义现有页面如何消费外部结果。
- 不改数据库，不写代码。

### R2：Groundhog Formula Oracle 原型

- 输入：当前 CPTU 点位已标准化后的行数据。
- 输出：Groundhog 参考通道 JSON。
- 用途：数值对照，不写正式成果。
- 首批方法：`Ic/Isbt/Qtn/Fr`、`φ'`、`Su`、`γt`。

### R3：pyCPT Auto Stratification Lab 原型

- 输入：`depth, Fr, Qt`。
- 输出：hard/soft boundary、SBT probability、entropy。
- 用途：自动分层候选。
- 与当前 Ic/SBTn 连续分层结果对比。

### R4：Method Lab UI

- 新增 Explorer 节点 `方法实验室`。
- 显示引擎安装状态、可运行方法、运行历史、结果摘要。
- 支持打开结果到现有曲线/SBT/参数/分层视图。

### R5：采纳与审计

- 外部结果可被显式采纳为“方案候选”，但不直接覆盖正式结果。
- 记录 source engine、method、version、license、input hash、createdAt。
- 导出时明确区分正式结果和参考结果。

## 10. 验收红线

以下情况不得关闭实现切片：

- Groundhog/pyCPT 结果与内置正式结果混成同一状态，用户无法区分。
- 外部结果默认写入正式成果。
- SBT 图、曲线剖面、参数页因外部方法接入变得拥挤不可读。
- 方法实验室变成一堆安装按钮，没有和当前测点/曲线/SBT/参数表联动。
- 没有记录 license、版本和 provenance。
- Python runner 失败但 UI 显示为成功。
- 不能禁用或隐藏未安装的外部引擎。

## 11. 当前确认清单

- Goal：建立外部开源 CPT 方法接入与对比层。
- Scope：设计合同、结果身份、统一数据合同、现有页面兼容、Method Lab 页面职责、分阶段路线。
- Non-goals：不立即实现插件市场；不直接嵌入 GPL 代码；不改变正式解释算法和数据库。
- Acceptance criteria：现有曲线/SBT/参数/分层视图可解释如何兼容 Groundhog/pyCPT；外部结果身份清晰；后续实现切片可以按本合同拆解。
- Verification：文档检查、合同审阅、后续 UIA/截图/runner tests。
- Closure review：重点检查是否保护现有正式解译链、是否避免外部结果污染、是否兼容 VSCode-like 工作台。
- Stop conditions：如果需要立即改 schema、直接嵌入 GPL 代码、或把外部结果当正式成果，本规划不可执行。

Implementation may start：`yes`。`R1：合同与数据模型` 已完成；当前活动计划同时纳入 `R2：Groundhog Formula Oracle 原型` 和 `R3：pyCPT Auto Stratification Lab 原型`，但仍不直接把外部结果写入正式成果。
