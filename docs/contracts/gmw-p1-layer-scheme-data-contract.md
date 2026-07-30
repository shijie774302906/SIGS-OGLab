# GMW-P1B LayerScheme / ClassificationEvidence 数据合同

日期：2026-06-29

状态：`closed for GMW-P1B`

适用范围：`GMW-P1B：LayerScheme / ClassificationEvidence mock 数据对象`

## 1. 目标

定义地层分层工作台的 mock/projection 数据形状，为后续 WinUI 静态布局提供真实结构。

本合同不定义 SQLite schema，不定义正式采纳存储，不改变现有 official 解译结果。

## 2. Bundle

P1B fixture 使用 bundle 形式：

```text
schemaVersion: layer-scheme-bundle.v1
projectionOnly: true
pointContext
sourceData
layerSchemes[]
classificationEvidence[]
evidenceRefs[]
preflight
```

对象合同名：

```text
layer-scheme.v1
classification-evidence.v1
```

`layer-scheme-bundle.v1` 只是 P1B fixture 的包装格式，用于在一个只读样例中同时携带点位上下文、多个 `layer-scheme.v1` 对象和 `classification-evidence.v1` 证据对象。

规则：

- `projectionOnly=true` 必须存在。
- Bundle 只能用于 mock/projection 和 UI 验证。
- 不得写入 SQLite official tables。
- 不得被成果输出当作正式 adopted result。
- 当 bundle 为 `projectionOnly=true` 时，顶层和 scheme 级 `canUseForOfficialParameterRun` 必须为 `false`。P1B fixture 可以表达“可试算”，但不能表达“可正式采用”。

## 3. PointContext

字段：

```text
projectId
projectName
pointId
pointName
dataVersion
depthUnit: m
createdAt
```

`dataVersion` 用于判断 scheme 是否 stale。

## 4. SourceData

字段：

```text
sourceKind
officialWriteAllowed: false
profileSourceRef
notes
```

`profileSourceRef` 用来说明曲线剖面轨道从哪里读取。P1B bundle 不重复伪造完整 `qc/qt`、`fs/Fr`、`u2` 和 `Ic/class` 曲线；后续 P1C 应从现有只读 CPT/CPTU profile projection 读取曲线，再把本 bundle 的 `LayerScheme` 和 `ClassificationEvidence` 叠加到工作台中。

## 5. LayerScheme

字段：

```text
schemeId
name
pointId
status: Adopted / Candidate / Draft / Archived / Invalid
sourceType: BuiltIn / External / Manual / Custom / Projection
sourceMethodId
sourceRunId
inputFreshness: current / stale / missingInputs / unknown
projectionOnly: true
usedByParameterScheme: boolean
createdAt
modifiedAt
layers[]
boundaries[]
evidenceRefs[]
preflight
```

状态语义：

- `Adopted`：当前工程采用方案。
- `Candidate`：方法生成但未采纳。
- `Draft`：人工修订或待保存方案。
- `Archived`：历史方案。
- `Invalid`：结构错误、输入缺失或已过期且不可用。

## 6. LayerInterval

字段：

```text
layerId
layerNo
depthFromM
depthToM
thicknessM
soilBehaviorType
engineeringSoilGroup: sand / clay / mixed / unknown
soilClassLabel
soilClassConfidence: confirmed / inferred / unconfirmed
sourceType
sourceMethodId
boundaryTopId
boundaryBottomId
uncertaintyKind: statistical / heuristic / manual / none / unknown
uncertaintyMetric: probability / entropy / boundaryOffset / reviewFlag / none
uncertaintyValue
evidenceRefs[]
manualEditState: none / edited / inserted / deleted
parameterApplicability[]
```

语义规则：

- `soilBehaviorType` 是 CPT/CPTU 行为类型证据，不等于正式地质土名。
- `engineeringSoilGroup` 用于参数方法过滤。
- `soilClassLabel` 只有人工或项目确认时才可作为正式土名。
- 没有统计来源时，`uncertaintyValue` 应为空。

## 7. LayerBoundary

字段：

```text
boundaryId
depthM
boundaryType: SharpBoundary / GradationalBoundary / UncertainBoundary / ManualBoundary
upperLayerId
lowerLayerId
uncertaintyKind
uncertaintyMetric
uncertaintyValue
reviewRequired
sourceType
sourceMethodId
evidenceRefs[]
manualEditState
```

禁止使用：

```text
HardBoundary
SoftBoundary
```

`Soft` 容易被误读为软土，不作为边界类型。

当 `uncertaintyKind` 不是 `statistical` 时，P1B fixture 的 `uncertaintyValue` 必须为空。启发式或人工复核宽度应放在 `reviewRequiredDepths[]` 或 `evidenceRef.summary`，UI 不得把它显示成置信度。

## 8. ClassificationEvidence

字段：

```text
evidenceId
pointId
sourceMethodId
sourceRunId
chartType: SBT / SBTn / Robertson1990 / Robertson2016 / Custom
axisDefinition
normalizationVersion
units
points[]
```

`points[]` 字段：

```text
pointEvidenceId
depthM
x
y
xAxis
yAxis
xUnit
yUnit
label
soilBehaviorType
engineeringSoilGroup
labelProbability
entropy
uncertaintyKind
linkedLayerIds[]
```

规则：

- `chartType`、`axisDefinition`、`normalizationVersion`、`units` 必须记录，避免 SBT 图不可追溯。
- `linkedLayerIds[]` 用于从证据点追溯到层段。
- 没有概率或熵时不伪造。

## 9. EvidenceRef

字段：

```text
evidenceRefId
evidenceId
evidenceType: classificationPoint / curveContinuity / manualNote / methodSummary / boundaryMetric
depthFromM
depthToM
summary
```

规则：

- 右侧详情的“主要证据”必须能追溯到 `evidenceRef`。
- 不允许只有不可审查的纯文本摘要。

## 10. Preflight

字段：

```text
coverageStatus
intervalOrderStatus
overlapStatus
inputFreshnessStatus
engineeringSoilGroupStatus
unknownLayerCount
reviewRequiredDepths[]
canUseForTrialParameterRun
canUseForOfficialParameterRun
blockingMessages[]
warningMessages[]
```

规则：

- `Candidate` 可以用于试算，但不能静默进入正式参数解译。
- `OfficialParameterRun` 需要 `Adopted` 或已审查 `Draft`。
- `engineeringSoilGroupStatus` 不通过时，不能自动套用砂土/黏土参数方法。

## 11. P1B fixture 要求

至少一个 fixture 必须覆盖：

- `Adopted`
- `Candidate`
- `Draft`
- `Archived`
- `SharpBoundary`
- `GradationalBoundary`
- `UncertainBoundary`
- `ManualBoundary`
- `soilBehaviorType`
- `engineeringSoilGroup`
- `soilClassLabel`
- `uncertaintyKind`
- `ClassificationEvidence.chartType`
- `axisDefinition`
- `normalizationVersion`
- `units`
- `evidenceRefs[]`
- `sourceData.profileSourceRef`
- `projectionOnly=true`
- `canUseForOfficialParameterRun=false`

## 12. 验证

Focused check 应输出：

```text
STRATIFICATION_LAYER_SCHEME_MOCK_CHECK=PASS
STRATIFICATION_NO_OFFICIAL_WRITE=PASS
```

检查不得写入任何文件或数据库，除了 PowerShell 本身的 stdout/stderr。
