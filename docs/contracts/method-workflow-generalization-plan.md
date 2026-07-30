# 通用方法工作流规划

日期：2026-06-29

适用产品：`SIGS-OGLab | 海上风电岩土勘察解译`

目的：把当前围绕单个方法的 Method Lab 原型，升级为支持内置方法、外部方法和用户自定义方法的通用 CPT/CPTU 解译工作流。

## 1. 总原则

后续规划不再围绕某个具体方法命名页面。系统只认识“任务”和“输出对象”，方法只是生成这些对象的可替换来源。

核心原则：

1. 是否通用：布局、数据对象和交互必须支持未来更多内置、导入、自定义方法。
2. 是否必要：默认界面只放工程判断必要信息；调试、日志、完整 warning、JSON、provenance 放详情或高级区域。
3. 科研和工程是否需要：工程默认看当前结果和采纳状态；科研展开对比、批量、敏感性和差异分析。
4. 是否直接且不复杂：先显示结果，再按需展开方法细节。

主流程：

```text
项目/点位数据
  -> 数据导入
  -> 数据检查
  -> 地层分层
  -> 参数解译
  -> 成果输出
```

横向能力：

```text
方法实验室
  -> 方法注册
  -> 能力声明
  -> 输入要求检查
  -> 测试运行
  -> 结果预览
  -> 日志/provenance/错误调试
```

## 2. 通用对象模型

### 2.1 Method

表示一个可运行或可选择的方法。

字段：

- `methodId`
- `displayName`
- `provider`
- `version`
- `methodType`
- `capabilities[]`
- `inputRequirements[]`
- `settingsSchema`
- `outputContracts[]`
- `runtimeKind`
- `status`
- `provenancePolicy`

不在主界面默认展示：

- 安装路径
- 完整命令行
- stdout/stderr
- 完整 JSON

这些属于方法实验室或底部日志。

### 2.2 MethodCapability

方法能力声明。UI 根据能力声明决定方法出现在哪里。

能力类型：

```text
LayerSchemeProducer
ClassificationEvidenceProducer
ParameterSeriesProducer
ParameterSchemeProducer
Preprocessor
ComparisonMetricProducer
```

能力字段：

- `capabilityId`
- `outputObjectType`
- `outputParameter`
- `applicableSoilTypes`
- `requiredInputs`
- `optionalInputs`
- `supportsBatch`
- `supportsCurrentPoint`
- `supportsUserSettings`
- `engineeringUseLevel`

`engineeringUseLevel` 建议：

```text
OfficialCandidate
Reference
Experimental
DebugOnly
```

### 2.3 LayerScheme

分层方案，是地层分层页的主对象。

字段：

- `schemeId`
- `name`
- `pointId`
- `sourceMethodId`
- `sourceRunId`
- `status`: `Candidate / Adopted / Draft / Archived`
- `layers[]`
- `boundarySet`
- `evidenceRefs[]`
- `createdAt`
- `modifiedAt`
- `isUsedByParameterScheme`

每个 layer：

- `layerId`
- `depthFromM`
- `depthToM`
- `thicknessM`
- `soilBehaviorType`
- `engineeringSoilGroup`
- `soilClassLabel`
- `soilClassConfidence`
- `sourceType`
- `sourceMethodId`
- `boundaryTopId`
- `boundaryBottomId`
- `uncertaintyKind`
- `uncertaintyMetric`
- `uncertaintyValue`
- `evidenceRefs[]`
- `manualEditState`

语义边界：

- `soilBehaviorType` 是 CPT/CPTU 行为类型证据，不等于正式地质土名。
- `engineeringSoilGroup` 用于参数方法过滤，至少支持 `sand / clay / mixed / unknown`。
- `soilClassLabel` 只有人工或项目确认时才可作为正式土名。
- `uncertaintyValue` 只有统计来源存在时才填值；不能为了界面完整伪造置信度。

### 2.4 ClassificationEvidence

分类证据，不等于分层方案。

用途：

- SBT / SBTn 图
- Robertson 图点云
- Ic/SBT 分类轨道
- 方法输出的分类点

字段：

- `evidenceId`
- `pointId`
- `sourceMethodId`
- `chartType`
- `axisDefinition`
- `normalizationVersion`
- `units`
- `points[]`

每个 evidence point：

- `depthM`
- `x`
- `y`
- `xAxis`
- `yAxis`
- `label`
- `soilBehaviorType`
- `engineeringSoilGroup`
- `labelProbability`
- `entropy`
- `uncertaintyKind`
- `linkedLayerIds[]`

原则：

- SBT 图属于地层分层页的证据视图。
- 参数解译页只引用当前层的分类证据摘要，不默认重复完整大图。
- 方法实验室只用于预览和调试分类证据输出。

### 2.5 ParameterScheme

参数解译方案，是参数解译页的主对象。

字段：

- `parameterSchemeId`
- `pointId`
- `sourceLayerSchemeId`
- `parameterSlots[]`
- `resultSeries[]`
- `layerStatistics[]`
- `status`
- `createdAt`
- `isExportSelected`

### 2.6 ParameterSlot

参数槽，表示“某类层位上的某个参数用什么方法”。

字段：

- `slotId`
- `parameterSymbol`: `φ' / Su / γ / OCR / Dr / ...`
- `applicableLayerFilter`
- `selectedMethodId`
- `requiredInputs`
- `settings`
- `outputMode`: `Curve / LayerRepresentative / Both`
- `validationState`

方法选择器必须根据 `parameterSymbol`、土类、输入字段和当前数据可用性过滤，不得显示所有方法。

### 2.7 MethodRun

方法运行记录，不等于工程采纳结果。

字段：

- `runId`
- `methodId`
- `pointId`
- `inputHash`
- `sourceDataRefs[]`
- `status`
- `outputs[]`
- `warnings[]`
- `logs[]`
- `artifacts[]`
- `createdAt`
- `completedAt`

## 3. 总 Plan

### GMW-P0：规划治理与通用对象模型

目标：

- 清理旧 AGENTS/plan 矛盾。
- 建立通用方法工作流原则。
- 定义对象模型和页面职责。
- 建立后续 plan-step 与 agent 审核机制。

非目标：

- 不写应用代码。
- 不改数据库 schema。
- 不改变现有公式、导入、导出。

验收：

- `AGENTS.md` 包含通用方法工作流原则。
- `Plan-total.md` 包含 GMW 总路线。
- `plan.md` 激活当前规划切片。
- 本文档细化 P0-P5 与 plan-step。
- 文档 diff check 通过。

### GMW-P1：地层分层工作台蓝图

目标：

- 把 `测试解译` 的模糊概念规划为 `地层分层` 工作台。
- 定义 LayerScheme 作为主对象。
- 定义 SBT/分类证据作为分层证据，而不是独立流程。
- 定义方案列表、主图、详情、对比面板的布局和交互。

非目标：

- 不先绑定某个具体方法。
- 不直接实现 pyCPT/Groundhog 特例。
- 不采纳外部结果为正式成果。

P1A 细化蓝图：

- 详见 `docs/gmw-p1-stratification-workbench-blueprint.md`。
- `SBT/ClassificationEvidence` 是分层证据图，不是独立 workflow，也不是参数解译主图。
- `soilBehaviorType`、`engineeringSoilGroup`、`soilClassLabel` 必须区分，避免把行为类型证据伪装为正式地质土名。
- `Candidate / Draft / Adopted` 对参数解译有不同门槛：Candidate 只可试算，正式参数解译默认消费 Adopted 或已审查 Draft。
- `Uncertainty` 必须带来源类型，不得伪造统计置信度。
- P1B/P1C 优先使用 fixture JSON 或内存 projection，不改 schema，不写 official tables。

P1B 数据合同：

- 详见 `docs/gmw-p1-layer-scheme-data-contract.md`。
- Fixture 位于 `sample_data/stratification/`，使用 `layer-scheme-bundle.v1` 包装 `layer-scheme.v1` 和 `classification-evidence.v1`。
- `projectionOnly=true` 是硬边界；P1B 只为 UI 和后续静态骨架提供数据形状，不产生 official interpretation、parameter 或 export 结果。
- Focused check：`tools/stratification-check/run-layer-scheme-mock-check.ps1`。

### GMW-P2：参数解译工作台蓝图

目标：

- 明确参数解译必须先选择 LayerScheme。
- 定义 ParameterSlot 和 ParameterScheme。
- 定义不同土类/参数的方法选择器。
- 定义参数曲线、层统计、方法来源、错误提示的布局。

非目标：

- 不改现有参数公式。
- 不新增未经确认的工程参数。
- 不把所有方法堆进一个下拉框。

### GMW-P3：方法实验室重定位

目标：

- 将方法实验室定位为方法注册、能力声明、测试运行和调试中心。
- 把工程结果消费迁回地层分层和参数解译页。
- 定义方法接入、输入要求、输出预览、日志和错误的布局。

非目标：

- 不把方法实验室作为主工程结果页。
- 不做完整插件市场。

P3A registry/capability 合同：

- 详见 `docs/gmw-p3-method-registry-capability-contract.md`。
- Fixture：`sample_data/method-lab/method-registry.v1.json`。
- Focused check：`tools/method-lab/check-method-registry-contract.ps1`。
- UI 必须按 `outputObjectType` 和 `consumerRoute` 路由，不得按 Groundhog/pyCPT 方法名路由。

P3B registry-driven 布局：

- `MethodLabPage` 已读取 `sample_data/method-lab/method-registry.v1.json`。
- 页面左侧为 `METHOD REGISTRY` 方法列表。
- 页面中部为 `CAPABILITY ROUTES`。
- 页面保留 Groundhog Reference 与 pyCPT Experimental 的当前可视化预览。
- `MethodLabRegistryToken` 暴露 `RegistryDriven=True` 和 `RouteBy=outputObjectType/consumerRoute`。

P3C run details / provenance：

- `MethodLabPage` 已增加 `RUN DETAILS / PROVENANCE`。
- `MethodLabRunDetailList` 显示最近测试运行的 status、identity、runId、warnings/logs/artifacts 和 provenance 摘要。
- `MethodLabRunArtifactProvenanceToken` 暴露 `RunDetails=True`、`Provenance=True`、`OfficialWrite=False`。
- 完整 JSON/stdout/stderr 不进入默认视图。

### GMW-P4：成果输出与采纳链路

目标：

- 成果输出消费已采纳的 LayerScheme 和 ParameterScheme。
- 报告/导出显示方案来源和方法配置。
- 不直接导出未采纳的 MethodRun。

当前状态：

- `GMW-P4A` 已完成，详见 `docs/gmw-p4-adopted-output-contract.md`、`sample_data/output/adopted-output-package.v1.json` 和 `process_logs/Process51.md`。
- 成果输出采纳对象定为 `AdoptedOutputPackage`。
- `MethodRun`、未采纳候选、实验结果和 `projectionOnly` 输出只能作为 evidence 或 rejected/unadopted refs，不直接进入 export inputs。
- `GMW-P4B` 已完成，详见 `process_logs/Process52.md`。
- `成果输出` 页已显示采纳分层、采纳参数方案、证据/export inputs 摘要和未采纳候选排除提示。
- `GMW-P4C` 已完成，详见 `process_logs/Process53.md`。
- `report-readiness.v1` 和 `interpretation-report-document.v1` manifest 已包含 `adoptedOutputPackage` 投影。
- `GMW-P4D` 已完成，详见 `docs/gmw-p4d-report-template-pdf-gate.md` 和 `process_logs/Process54.md`。
- 正式 PDF 保持禁用，不生成占位文件；当前报告输出仍是 HTML / Markdown / manifest。

非目标：

- 不生成正式 PDF/DXF，除非报告模板和图件规范另行确认。

### GMW-P5：科研增强与批量对比

目标：

- 支持多方法批量运行、差异统计、敏感性分析和研究对比。
- 不干扰工程默认模式。

非目标：

- 不把科研高级功能默认挤进主界面。

## 4. GMW-P1 地层分层工作台 plan-step

### P1.1 页面任务定义

用户问题：

- 当前点位有哪些分层方案？
- 当前方案如何分层？
- 每层为什么这样判断？
- 哪个方案可以作为参数解译输入？

默认展示：

- 当前点位
- 当前采用方案
- 候选方案列表
- 曲线剖面 + 分层轨道
- 当前层/边界详情

高级展示：

- 多方法对比
- 方法日志
- 完整 warning
- provenance

### P1.2 页面区域

布局：

```text
Top Command Row
  当前点位 | 当前分层方案 | 新建方案 | 运行方法 | 复制为人工修订 | 设为参数解译输入

Left Pane
  LayerScheme 列表

Center Editor
  CPT/CPTU 曲线 + 分层轨道 + SBT/分类证据

Right Details
  当前层 / 当前边界 / 当前方法来源

Bottom Panel
  方法对比 / 日志 / 输出预检，默认收起
```

### P1.3 左侧 LayerScheme 列表

列表项字段：

- 方案名
- 来源方法
- 状态：`Adopted / Candidate / Draft / Archived`
- 层数
- 是否被参数解译引用
- 最近运行或修改时间

交互：

- 点击方案：切换主图和详情。
- 右键或更多菜单：重命名、复制为人工修订、归档、查看来源。
- `+ 新建方案`：打开方法选择器，仅显示能输出 `LayerScheme` 的方法。

验收：

- 至少可表达当前采用方案、候选方案和人工修订方案三种状态。
- 不出现写死的具体方法列表。

### P1.4 中间主图

主图轨道：

- 深度轴
- qc/qt track
- fs/Fr track
- u2 track
- Ic 或分类 track
- layer track
- boundary markers

视觉规则：

- 土类用稳定但克制的色带。
- 方法来源用边线、轨道标题或图例区分，不直接把颜色绑定到某个方法名。
- 高不确定边界用虚线或半透明带。
- 人工修改边界用小标记。
- 主图必须比表格和说明更显眼。

交互：

- 点击层段：右侧显示 layer details。
- 点击边界：右侧显示 boundary details。
- 点击 SBT 证据点或分类区域：高亮对应深度段。

### P1.5 SBT/分类证据区

定位：

- SBT 图是地层分层页的证据视图。
- 不是独立业务流程。
- 不是参数解译页的主图。

布局方式：

- 大屏默认可放在中间主图的下半区或可切换子视图。
- 参数解译页只显示当前层分类证据摘要。
- 方法实验室只显示方法输出预览。

内容：

- chart type
- axes definition
- points
- label/zone
- selected layer depth range
- evidence count
- method source

### P1.6 右侧详情面板

Layer detail：

- 层号
- 深度范围
- 厚度
- 土类/行为类型
- 来源方法
- 概率/不确定性
- 主要证据
- 建议参数组
- 状态

Boundary detail：

- 边界深度
- 相邻层
- 边界类型
- 不确定区间
- 来源方法
- 是否人工修改

不默认展示：

- 完整 JSON
- stdout/stderr
- 长 license 文本

### P1.7 底部方法对比

默认折叠。打开后提供三个视图：

1. 边界对比：多个方案沿深度轴并列显示边界。
2. 统一区间表：合并所有边界，逐区间比较土类。
3. 对比摘要：层数、边界偏差、土类一致率、高不确定区间。

原则：

- 默认只对比用户选择的 2-4 个方案。
- 方法不同不等于错误，冲突标记要克制。
- 点击差异区间应联动中间主图。

### P1.8 Agent 审核

Product architecture reviewer：

- 是否围绕 `LayerScheme`，而不是围绕具体方法名？
- 后续 20 个分层方法是否仍能进入同一布局？

Geotechnical domain reviewer：

- SBT 图、Ic/分类证据、层位轨道与分层判断关系是否合理？
- 分层方案是否能成为参数解译的前置输入？

UI/layout reviewer：

- 左中右底是否有清楚主次？
- 默认界面是否直接显示结果而不复杂？

Implementation/QA reviewer：

- 当前 WinUI 布局是否可落地？
- 需要哪些模型、AutomationId、截图和 focused checks？

## 5. GMW-P2 参数解译工作台 plan-step

### P2.1 页面任务定义

用户问题：

- 当前参数解译基于哪套分层方案？
- 每类土、每个参数使用什么方法？
- 结果曲线和层代表值是什么？
- 哪些方法因输入不足不可用？

### P2.2 页面区域

布局：

```text
Top Command Row
  当前点位 | 分层方案选择 | 新建参数方案 | 运行 | 保存 | 设为成果输出

Left Pane
  ParameterScheme 列表

Center Editor
  参数曲线 + 层统计表

Right Details
  当前参数槽 / 当前层参数 / 方法输入要求

Bottom Panel
  方法可用性 / 日志 / 对比 / 输出预检
```

### P2.3 参数槽配置

表格列：

- 参数
- 适用层/土类
- 当前方法
- 输入状态
- 输出模式
- 运行状态

示例：

```text
φ' | 砂类层 | 选择方法 | inputs ok | 曲线+层代表值 | 未运行
Su | 黏性层 | 选择方法 | missing Nkt | 曲线+层代表值 | 阻断
γ  | 全部层 | 选择方法 | inputs ok | 曲线 | 未运行
```

方法选择器过滤：

- output parameter matches
- soil type matches
- required inputs available
- method installed or available
- engineeringUseLevel allowed

### P2.4 主结果视图

内容：

- 参数曲线轨道
- layer background from selected LayerScheme
- layer representative values
- invalid/skipped intervals
- method source labels

原则：

- 先显示结果曲线和层统计。
- 方法公式和高级设置放右侧详情或弹窗。
- 不把所有方法输出堆在同一画布，除非用户进入对比模式。

### P2.5 Agent 审核

Product architecture reviewer：

- ParameterScheme 是否依赖 LayerScheme？
- 参数槽是否支持未来自定义参数？

Geotechnical domain reviewer：

- 砂/黏/过渡土的参数方法选择逻辑是否合理？
- 输入不足时是否清楚阻断？

UI/layout reviewer：

- 参数配置、曲线、层统计是否扫描清楚？
- 是否避免复杂方法信息淹没结果？

Implementation/QA reviewer：

- 是否可先做静态布局，不改公式？
- 需要哪些 UIA/focused checks？

## 6. GMW-P3 方法实验室 plan-step

### P3.1 页面任务定义

方法实验室回答：

- 系统有哪些方法？
- 每个方法能输出什么对象？
- 当前数据是否满足输入？
- 测试运行结果在哪里？
- 失败原因是什么？

它不回答：

- 当前工程最终采用哪套分层？
- 当前工程最终导出哪些参数？

### P3.2 页面区域

布局：

```text
Top Command Row
  方法库 | 新增方法 | 导入方法 | 测试运行 | 刷新

Left Pane
  方法分类树：分层 / 分类证据 / 参数 / 预处理 / 对比

Center Editor
  方法能力、输入要求、测试运行、结果预览

Right Details
  selected method metadata, settings schema, provenance

Bottom Panel
  logs, warnings, artifacts, validation errors
```

默认隐藏：

- 完整 JSON
- stdout/stderr
- 长路径

### P3.3 Agent 审核

Product architecture reviewer：

- 方法实验室是否只是方法管理/调试，不抢主流程？

Geotechnical domain reviewer：

- 方法能力声明是否覆盖分层、分类证据、参数三类核心输出？

UI/layout reviewer：

- 是否能快速看懂方法能做什么？

Implementation/QA reviewer：

- 方法 registry 是否可以先用 JSON/内存配置验证？

## 7. GMW-P4 成果输出 plan-step

成果输出应消费：

- AdoptedOutputPackage
- adopted LayerScheme
- adopted ParameterScheme
- selected evidence figures
- audit/provenance summary

默认不消费：

- raw MethodRun
- unadopted candidates
- debug-only outputs
- projectionOnly outputs

P4A 已定稿：

- `AdoptedOutputPackage` 是成果输出的入口对象。
- `reportManifestProjection.exportInputs[]` 只能包含 adopted package、adopted LayerScheme、adopted ParameterScheme 和必要审计对象。
- `MethodRun`、`ClassificationEvidence`、`ParameterSeries` 只作为 evidence。

P4B 已完成：

- 在 `成果输出` 预检中增加 adopted-output-package 状态。
- 在页面上显示当前采纳分层、采纳参数方案、来源方法和未采纳候选摘要。
- 继续不改正式导出内容，先验证可见 preflight 与来源展示。

P4C 已完成：

- 将 `AdoptedOutputPackage` 投影到报告 readiness / report manifest 合同。
- 不生成正式 PDF。
- 不改变 workbook/CSV/data-check/audit 导出内容。

P4D 已完成：

- 保持正式 PDF 禁用，直到报告模板、图件策略、审计标准确认。
- 只做模板确认入口、模板缺失/无效/已确认状态和 gate 文档化；不伪造 PDF。

需要确认后才能做：

- 正式 PDF
- DXF
- IFC
- 报告模板

## 8. GMW-P5 科研增强 plan-step

科研增强只在默认工程视图之外展开。

当前状态：

- `GMW-P5A` 已完成，详见 `docs/gmw-p5-multi-method-comparison-contract.md`、`sample_data/research/method-comparison-metrics.v1.json` 和 `process_logs/Process55.md`。
- 多方法对比按输出对象和 metric id 组织，不按方法名组织。
- 对比结果默认 `ResearchOnly`，不写 official，不进入 export inputs。
- `GMW-P5B` 已完成，详见 `docs/gmw-p5-batch-run-matrix-contract.md`、`sample_data/research/batch-run-matrix.v1.json` 和 `process_logs/Process56.md`。
- 批量运行矩阵保留 completed / failed / skipped 状态，失败和跳过行不得静默丢失。
- `GMW-P5C` 已完成，详见 `process_logs/Process57.md`。
- `GMW-P5D` 已完成，详见 `process_logs/Process58.md`。
- `GMW-P5E` 已完成，详见 `process_logs/Process59.md`。
- `GMW-P5F` 已完成，详见 `process_logs/Process60.md`。
- `GMW-P5G` 已完成，详见 `process_logs/Process61.md`。
- `GMW-P5I` 已完成，详见 `process_logs/Process62.md`。
- `GMW-P5H` 已完成，详见 `process_logs/Process64.md`。
- `GMW-P5J` 已完成，详见 `process_logs/Process65.md`。
- `GMW-P5K` 已完成，详见 `process_logs/Process66.md`。
- `GMW-P5L` 已完成，详见 `process_logs/Process67.md`。
- `GMW-P5M` 已完成，详见 `process_logs/Process68.md`。
- `GMW-P5N` 已完成，详见 `process_logs/Process69.md`。
- `GMW-P5O` 已完成，详见 `process_logs/Process70.md`。
- `GMW-P5P` 已完成，详见 `process_logs/Process71.md`。
- `GMW-P5Q` 已完成，详见 `process_logs/Process72.md`。
- `GMW-P5R` 已完成，详见 `process_logs/Process73.md`。

能力：

- batch run
- multi-method comparison
- sensitivity analysis
- boundary uncertainty review
- cross-point statistics

布局原则：

- 放在底部对比面板、研究模式 tab 或独立研究视图。
- 不挤占工程默认主图。

P5B 已完成：

- 定义批量运行请求、结果矩阵和状态汇总对象。
- 继续不调度真实外部 runner；先用 fixture/check 固化数据合同。

P5C 已完成：

- 新增 `research` route、Explorer 节点、Go 菜单项和文档 Tab。
- 新增 `ResearchModePage` 显示 scope、batch result matrix、comparison metrics 和 preflight。
- 新增 ResearchOnly safety token，保持 `OfficialWrite=False`、`Export=False`。
- 新增 focused UIA check：`RESEARCH_MODE_VIEW_CHECK=PASS`。

P5D 已完成：

- 研究模式优先读取当前工作区 `app_data/method_lab/runs` 下的 MethodRun 输出。
- 没有 MethodRun 时回落到研究 fixture。
- safety token 显示 `Source=MethodLabRuns`。
- 新增 focused UIA marker：`RESEARCH_MODE_METHOD_RUN_SOURCE=PASS`。

P5E 已完成：

- 新增 `MethodLabInputBuildService`，可把当前项目任意已完成首轮解译的 CPTU 点位投影为 `method-lab-input.v1`。
- 支持默认当前点位和显式点位，例如 `CPT09`。
- 输出包含 runner 所需的原始曲线字段、解释结果字段、应力字段、`canonicalInputSha256` 和 `preflight`。
- 输出保持 `officialWriteAllowed=false`，只作为 Method Lab / research 输入，不写 official/export。
- 新增 focused marker：`METHOD_LAB_INPUT_BUILD_CHECK=PASS`、`METHOD_LAB_INPUT_CURRENT_POINT=PASS`、`METHOD_LAB_INPUT_EXPLICIT_POINT=PASS`、`METHOD_LAB_INPUT_REQUIRED_FIELDS=PASS`、`METHOD_LAB_INPUT_NO_OFFICIAL_WRITE=PASS`。

P5F 已完成：

- 修复 pyCPT 真实点位输入失败，使 P5E 生成的 `CPT09` input 可跑出 Completed result。
- Groundhog runner check 可区分 stderr warning 和真正失败。
- 新增 `run-real-point-runner-check.ps1`，自动生成真实输入并运行 Groundhog/pyCPT。
- local QA 在外部 engine root 存在时运行真实点位 runner check。
- 新增 focused marker：`METHOD_LAB_REAL_POINT_RUNNER_CHECK=PASS`、`METHOD_LAB_REAL_POINT_GROUNDHOG_CHECK=PASS`、`METHOD_LAB_REAL_POINT_PYCPT_CHECK=PASS`、`METHOD_LAB_REAL_POINT_NO_OFFICIAL_WRITE=PASS`。

P5G 已完成：

- 新增 `method-run-index.v1` 文件索引，将 `app_data/method_lab/runs/**/*.output.json` 汇总为统一 research-only index。
- 索引保留 `Completed`、`Partial`、`Failed`，失败结果不静默丢失。
- 索引包含 point context、result counts、warning/log/artifact counts、error code、input/output path 和 official-write 边界。
- `ResearchModeProjectionService` 优先消费该索引生成研究矩阵。
- 新增 focused marker：`METHOD_LAB_RUN_INDEX_CHECK=PASS`、`METHOD_LAB_RUN_INDEX_GROUNDHOG=PASS`、`METHOD_LAB_RUN_INDEX_PYCPT=PASS`、`METHOD_LAB_RUN_INDEX_FAILURES_VISIBLE=PASS`、`METHOD_LAB_RUN_INDEX_NO_OFFICIAL_WRITE=PASS`。

P5I 已完成：

- `method-run-index.v1` 增加 `outputSummary`、`warningSummary` 和 warning code buckets。
- 重复 warning 按 code 聚合；例如 Groundhog 的 `FsUsedAsFtFallback` 不再作为数千条噪声逐条暴露，而显示为主因计数。
- `ResearchModeProjectionService` 使用降噪后的 evidence，并把 `LayerScheme`、`ClassificationEvidence`、`ParameterSeries` 指向后续目标 workflow。
- 新增 focused marker：`METHOD_LAB_RUN_INDEX_SUMMARY_NOISE_REDUCED=PASS`、`METHOD_LAB_RESEARCH_SUMMARY_NOISE_REDUCED=PASS`。

## 9. 当前建议执行顺序

1. GMW-P0：完成治理文件和规划文档。已完成。
2. GMW-P1A：地层分层工作台信息架构与布局蓝图，详见 `docs/gmw-p1-stratification-workbench-blueprint.md`。已完成。
3. GMW-P1B：LayerScheme 模型与 mock 数据，不改 schema。已完成，详见 `docs/gmw-p1-layer-scheme-data-contract.md`、`sample_data/stratification/`、`tools/stratification-check/run-layer-scheme-mock-check.ps1`。
4. GMW-P1C：地层分层页 WinUI 静态骨架。已完成。
5. GMW-P1D：地层分层页交互与对比验收。已完成。
6. GMW-P1E：从当前实现迁移/映射已有 Ic/SBT 分层显示。已完成。
7. GMW-P1F：分层结果工程化整理视图。已完成。
8. GMW-P2A：参数解译页信息架构与参数槽设计。已完成，详见 `docs/gmw-p2-parameter-workbench-blueprint.md`。
9. GMW-P2B：ParameterScheme/ParameterSlot mock 数据对象。已完成，详见 `docs/gmw-p2-parameter-scheme-data-contract.md`、`sample_data/parameters/`、`tools/parameter-check/run-parameter-scheme-mock-check.ps1`。
10. GMW-P2C：参数配置表和方法选择器静态布局。已完成，详见 `process_logs/Process46.md`。
11. GMW-P2D：参数曲线、层统计、方法来源和输入阻断状态。已完成，详见 `process_logs/Process47.md`。
12. GMW-P3A：方法实验室降级为方法 registry/debug center。已完成，详见 `docs/gmw-p3-method-registry-capability-contract.md` 和 `process_logs/Process48.md`。
13. GMW-P3B：方法实验室布局重构。已完成，详见 `process_logs/Process49.md`。
14. GMW-P3C：测试运行、日志、artifact、provenance 的高级视图。已完成，详见 `process_logs/Process50.md`。
15. GMW-P4A：成果输出采纳对象设计。已完成，详见 `docs/gmw-p4-adopted-output-contract.md` 和 `process_logs/Process51.md`。
16. GMW-P4B：输出预检与方案来源展示。已完成，详见 `process_logs/Process52.md`。
17. GMW-P4C：报告 manifest 采纳对象投影设计。已完成，详见 `process_logs/Process53.md`。
18. GMW-P4D：报告模板确认后再进入正式报告/PDF。已完成，详见 `process_logs/Process54.md`。
19. GMW-P5A：多方法对比指标设计。已完成，详见 `process_logs/Process55.md`。
20. GMW-P5B：批量运行与结果矩阵。已完成，详见 `process_logs/Process56.md`。
21. GMW-P5C：研究模式视图。已完成，详见 `process_logs/Process57.md`。
22. GMW-P5D：研究模式 MethodRun 来源接入。已完成，详见 `process_logs/Process58.md`。
23. GMW-P5E：任意点位 Method Lab 输入适配。已完成，详见 `process_logs/Process59.md`。
24. GMW-P5F：真实点位输入下的外部 runner 稳定化。已完成，详见 `process_logs/Process60.md`。
25. GMW-P5G：research-only MethodRun 文件索引。已完成，详见 `process_logs/Process61.md`。
26. GMW-P5I：MethodRun 结果摘要降噪。已完成，详见 `process_logs/Process62.md`。
27. GMW-P5H：研究结果与地层分层/参数解译页联动。已完成，详见 `process_logs/Process64.md`。
28. GMW-P5J：目标页消费研究候选结果。已完成，详见 `process_logs/Process65.md`。
29. GMW-P5K：候选选择、对比/试算/采纳前保护。已完成，详见 `process_logs/Process66.md`。
30. GMW-P5L：候选差异对比摘要。已完成，详见 `process_logs/Process67.md`。
31. GMW-P5M：候选结果可视化叠加。已完成，详见 `process_logs/Process68.md`。
32. GMW-P5N：候选选择与 overlay 高亮联动。已完成，详见 `process_logs/Process69.md`。
33. GMW-P5O：候选差异明细表。已完成，详见 `process_logs/Process70.md`。
34. GMW-P5P：跨候选差异表。已完成，详见 `process_logs/Process71.md`。
35. GMW-P5Q：候选结果受保护 Draft/Review 入口。已完成，详见 `process_logs/Process72.md`。
36. GMW-P5R：候选扫描排序/过滤。已完成，详见 `process_logs/Process73.md`。

## 10. 当前不做

- 不把 pyCPT/Groundhog 做成独立主页面。
- 不为每个方法写一个专属布局。
- 不默认显示调试信息。
- 不在规划阶段改 schema。
- 不在没有模板时做正式报告/PDF/DXF。
- 不把候选方法结果直接变成工程成果。
