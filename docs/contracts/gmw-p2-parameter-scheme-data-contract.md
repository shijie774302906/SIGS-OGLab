# GMW-P2B ParameterScheme / ParameterSlot 数据合同

日期：2026-06-30

状态：`active for GMW-P2B`

适用范围：`GMW-P2B：ParameterScheme / ParameterSlot mock 数据对象`

前置蓝图：`docs/gmw-p2-parameter-workbench-blueprint.md`

## 1. 目标

定义参数解译工作台的 mock/projection 数据形状，为后续 P2C 静态布局和 P2D 只读曲线映射提供可检查的结构。

本合同不定义 SQLite schema，不保存正式 `ParameterScheme`，不改变 `CptuParameterInterpretationService`，不改变参数公式，也不改变成果输出合同。

## 2. Bundle

P2B fixture 使用 bundle 形式：

```text
schemaVersion: parameter-scheme-bundle.v1
projectionOnly: true
pointContext
sourceData
sourceLayerSchemes[]
methodCatalog[]
parameterSchemes[]
preflight
```

对象合同名：

```text
parameter-scheme.v1
parameter-slot.v1
parameter-series.v1
parameter-layer-statistic.v1
method-availability.v1
input-blocking.v1
```

规则：

- `projectionOnly=true` 必须存在。
- `sourceData.officialWriteAllowed=false` 必须存在。
- Bundle 只能用于 mock/projection 和 UI 验证。
- 不得写入 SQLite official tables。
- 不得被成果输出当作正式 adopted/export result。
- 当 bundle 为 `projectionOnly=true` 时，顶层和 scheme 级 `canSaveOfficial`、`canExport` 必须为 `false`。

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

## 4. SourceData

字段：

```text
sourceKind
officialWriteAllowed: false
sourceLayerBundleRef
parameterSourceRef
notes
```

`sourceLayerBundleRef` 说明 `LayerScheme` 来源。P2B fixture 可引用 P1/P1F 的只读 projection id，但不复制完整分层 bundle。

`parameterSourceRef` 说明参数曲线未来可从哪里派生。例如当前历史 `φ'` / `Su` 可以来自现有只读参数派生视图，但 P2B fixture 不直接运行服务。

## 5. SourceLayerSchemeRef

字段：

```text
sourceLayerSchemeId
name
status: Adopted / Draft / Candidate / Review / Invalid
projectionOnly: boolean
canUseForTrialParameterRun
canUseForOfficialParameterRun
engineeringSoilGroupStatus
layers[]
```

`layers[]` 最小字段：

```text
layerId
layerNo
depthFromM
depthToM
engineeringSoilGroup: sand / clay / mixed / unknown / transition
soilBehaviorType
parameterApplicability[]
```

规则：

- P2B 至少覆盖 `sand`、`clay`、`mixed`、`unknown`。
- `projectionOnly=true` 或 `canUseForOfficialParameterRun=false` 时，所有基于该 scheme 的 `ParameterScheme.mode` 必须是 `Trial`、`Research` 或 `Draft`，不能是 `Official`。

## 6. MethodCatalog

字段：

```text
methodId
displayName
capabilityId
outputParameter
engineeringUseLevel: OfficialCandidate / Reference / Experimental / DebugOnly
applicableEngineeringGroups[]
requiredInputs[]
outputMode: Curve / LayerRepresentative / Both
formulaRef
methodVersion
status: Available / MissingRuntime / Deprecated / Disabled
```

规则：

- 方法目录只用于能力过滤和 UI mock，不代表真实插件安装。
- 不得把所有方法直接塞进每个 slot。
- `engineeringUseLevel` 不是语义色，也不是 official 采纳状态；它只描述方法可信级别。

## 7. ParameterScheme

字段：

```text
parameterSchemeId
name
pointId
sourceLayerSchemeId
sourceLayerSchemeStatus
sourceLayerSchemeProjectionOnly
mode: Official / Trial / Research / Draft
status: Draft / Runnable / Completed / Blocked / Archived
projectionOnly: true
parameterSlots[]
resultSeries[]
layerStatistics[]
methodAvailability[]
inputBlockings[]
preflight
createdAt
modifiedAt
isExportSelected
```

规则：

- `ParameterScheme` 不等于 `ParameterInterpretationRun`。
- `ParameterScheme` 必须引用 `sourceLayerSchemeId`。
- P2B fixture 的 `projectionOnly=true`，`preflight.canSaveOfficial=false`，`preflight.canExport=false`。
- `mode=Official` 不允许出现在 P2B projection fixture 中，除非未来切片显式确认正式 schema。

## 8. ParameterSlot

字段：

```text
slotId
parameterKey: PhiDeg / SuKpa / Gamma / OCR / Dr / ...
parameterSymbol
unit
targetLayerFilter
selectedMethodId
availableMethodIds[]
requiredInputs[]
settings
outputMode: Curve / LayerRepresentative / Both
validationState: Ready / MissingInput / NeedsReview / NotApplicable / Blocked
runState: NotRun / Running / Completed / Failed / Stale
blockingReasons[]
warningReasons[]
provenance
```

`targetLayerFilter` 字段：

```text
engineeringSoilGroups[]
layerIds[]
includeMode: allMatching / selectedOnly / manualOverride
requiresReview: boolean
```

`requiredInputs[]` 字段：

```text
inputKey
state: Ok / Missing / Invalid / Stale
source
unit
message
```

规则：

- `φ'` 默认只适用于 `sand` 或经审查的 transition/mixed 层。
- `Su` 默认只适用于 `clay` 或经审查的 transition/mixed 层。
- `mixed`、`transition`、`unknown` 不能静默套用砂土或黏土方法。
- `Nkt` 默认值必须在 `settings` 或 `provenance` 中标记为 method assumption，不得显示成场地标定值。

## 9. ParameterSeries

字段：

```text
seriesId
slotId
parameterKey
unit
methodId
methodVersion
identity: Official / Trial / Research / Reference / Experimental
points[]
invalidIntervals[]
sourceInputRefs[]
```

`points[]` 字段：

```text
depthM
value
status: Valid / NotApplicable / InvalidInput / InvalidMethodParameter
sourceLayerId
sourceResultRef
```

`invalidIntervals[]` 字段：

```text
depthFromM
depthToM
status
reasonCode
message
```

规则：

- `invalidIntervals[]` 必须显式表达，UI 不得把缺值画成 0 线。
- `identity` 非 `Official` 时，不得进入成果输出。

## 10. ParameterLayerStatistic

字段：

```text
layerId
parameterKey
unit
validPointCount
invalidPointCount
representativeValue
representativeType: mean / median / percentile / manual-selected / project-rule / none
min
max
mean
median
methodId
qualityFlag: Ok / Sparse / Mixed / Blocked / NeedsReview
message
```

规则：

- 默认只叫“代表值”或“统计值”，不得叫“设计值”。
- `representativeType=manual-selected` 或 `project-rule` 必须有来源。
- `qualityFlag=Blocked` 或 `NeedsReview` 的值不得进入成果输出。

## 11. MethodAvailability

字段：

```text
slotId
methodId
capabilityId
engineeringUseLevel
isInstalled
requiredInputsState: Ok / Missing / Invalid / Stale
applicableLayerState: Ok / Partial / NeedsReview / Blocked
canSelect
canRunTrial
canRunOfficial
blockingReasons[]
warningReasons[]
```

规则：

- `canRunOfficial=false` 必须用于 P2B projection fixture。
- 如果 `methodId` 不在 `availableMethodIds[]`，该方法不得作为 slot 候选出现。

## 12. InputBlocking

字段：

```text
blockingId
scope: Scheme / Slot / Layer / Series / Export
severity: Error / Warning / Info
reasonCode
message
requiredAction
linkedObjectId
```

规则：

- unknown 层正式参数运行必须阻断。
- mixed/transition 层必须 `NeedsReview` 或明确 trial-only。
- export scope 在 P2B fixture 中必须 blocked。

## 13. Preflight

Bundle 和 scheme 级 preflight 字段：

```text
sourceLayerSchemeStatus
sourceLayerSchemeProjectionOnly
sourceLayerSchemeCanTrial
sourceLayerSchemeCanOfficial
slotCoverageStatus
methodAvailabilityStatus
inputBlockingStatus
canRunTrial
canSaveOfficial
canExport
blockingMessages[]
warningMessages[]
```

规则：

- P2B fixture 可以 `canRunTrial=true`。
- P2B fixture 必须 `canSaveOfficial=false`。
- P2B fixture 必须 `canExport=false`。

## 14. P2B fixture 要求

至少一个 fixture 必须覆盖：

- `schemaVersion=parameter-scheme-bundle.v1`
- `projectionOnly=true`
- `sourceData.officialWriteAllowed=false`
- `sourceLayerSchemeId`
- `sourceLayerSchemeProjectionOnly`
- `ParameterScheme.mode=Trial / Research / Draft`
- `ParameterScheme.status=Runnable / Completed / Blocked`
- `ParameterSlot` 覆盖 `PhiDeg`、`SuKpa`、`Gamma`、`OCR`
- `ParameterSlot.validationState=Ready / MissingInput / NeedsReview / Blocked`
- `MethodAvailability.canRunOfficial=false`
- `ParameterSeries` 至少覆盖 `PhiDeg` 和 `SuKpa`
- `ParameterLayerStatistic` 至少覆盖砂层、黏性层、混合层、未知层
- `InputBlocking` 覆盖 unknown layer、mixed layer review、export blocked
- `preflight.canSaveOfficial=false`
- `preflight.canExport=false`

## 15. 验证

Focused check 应输出：

```text
PARAMETER_SCHEME_MOCK_CHECK=PASS
PARAMETER_NO_OFFICIAL_WRITE=PASS
```

检查不得写入任何文件或数据库，除了 PowerShell 本身的 stdout/stderr。
