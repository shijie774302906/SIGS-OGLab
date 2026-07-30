# Method Lab JSON 合同 v1

日期：2026-06-29

状态：`R0-active`

适用范围：Groundhog、pyCPT 以及后续外部 CPT/CPTU 方法 runner。

## 1. 目标

`Method Lab` 的 runner 只通过稳定 JSON 与主程序通信。JSON 合同先于 Groundhog / pyCPT runner 实现冻结，避免外部方法结果污染正式解译链。

硬规则：

- `Official`、`Reference`、`Experimental` 必须显式区分。
- `Reference` / `Experimental` 默认 `officialWriteAllowed=false`。
- runner 失败必须输出失败 envelope，不能伪装成成功。
- 外部结果不写 `InterpretationRuns`、`InterpretationResults`、`ParameterInterpretationRuns`、`ExportRecords`。
- 所有输出必须记录 engine、version、license、input hash、runner hash、createdAt、completedAt。

## 2. Artifact 路径

运行产物写入：

```text
app_data/method_lab/runs/<runId>/input.json
app_data/method_lab/runs/<runId>/output.json
app_data/method_lab/runs/<runId>/stdout.log
app_data/method_lab/runs/<runId>/stderr.log
app_data/method_lab/runs/<runId>/artifacts/
```

测试 fixture 写入：

```text
sample_data/method-lab/
```

## 3. MethodRunInput

`schemaVersion` 固定为 `method-lab-input.v1`。

必填根字段：

```text
schemaVersion
runId
engineId
methodId
identity
projectId
projectName
testPointId
testPointName
waterDepthM
sourceOfficialRunId
rows[]
settings
sourceImportFiles[]
canonicalInputSha256
createdAt
```

`rows[]` 必填字段与单位：

```text
sourceRowIndex
sourceRecordId
depthM: m
depthFromM: m
depthToM: m
qcKpa: kPa
qtKpa: kPa
u2Kpa: kPa
sleeveKpa: kPa
frPercent: %
qnetKpa: kPa
qtn: 1
sigmaV0Kpa: kPa
sigmaV0EffectiveKpa: kPa
soilTypeOfficial
icOfficial
```

输入行必须满足：

- `depthFromM <= depthM <= depthToM`。
- 深度单调不下降。
- `frPercent > 0` 和 `qnetKpa / sigmaV0EffectiveKpa > 0` 是 pyCPT 的最低要求。
- `sigmaV0EffectiveKpa <= 0` 的行不得参与 pyCPT `QtDimensionless`。

## 4. MethodRunResult

成功、部分成功和失败都使用同一 envelope。

```text
schemaVersion: method-run-result.v1
runId
engineId
methodName
methodVersion
status: Completed / Failed / Partial
identity: Official / Reference / Experimental
officialWriteAllowed: false
outputChannels[]
layerCandidates[]
classificationPoints[]
parameterSeries[]
summaryMetrics[]
warnings[]
logs[]
artifacts[]
error
provenance
```

失败时：

- `status=Failed`。
- `error.code` 必须存在。
- `outputChannels/layerCandidates/classificationPoints` 必须为空，除非 `status=Partial`。
- `stdoutPath` 和 `stderrPath` 必须可定位。

错误码：

```text
DependencyMissing
EngineMissing
VersionUnsupported
InputSchemaInvalid
RequiredFieldMissing
UnitRangeInvalid
InputInvalid
EngineRuntimeError
Timeout
FormulaException
NaNOutput
PartialChannelFailed
OutputJsonInvalid
OutputContractInvalid
LicenseBlocked
Cancelled
```

## 5. OutputChannel

```text
channelId
name
symbol
unit
valueType: Number / Category / Probability
depthMode: Point / Interval
identity
sourceEngine
sourceMethod
formulaRef
confidence
values[]
```

`values[]`：

```text
sourceRowIndex
sourceRecordId
depthM 或 depthFromM/depthToM
value
status: Valid / Invalid / Skipped
reasonCode
sourceChannelIds[]
```

`confidence` 只能在真实统计置信度存在时填写；公式对照结果不得编造置信度。

## 6. LayerCandidate

```text
candidateId
runId
depthFromM
depthToM
boundaryDepthM
boundaryType: Hard / Soft / Uncertain
sourceEngine
sourceMethod
sbtType
sbtProbabilities[]
probability
entropy
entropyMean
entropyMax
clusterLabel
sourcePointCount
identity
```

## 7. ClassificationPoint

```text
depthM
chartType: SBT / SBTn / Robertson1990 / Robertson2016 / Custom
x
y
xAxis
yAxis
xUnit
yUnit
logBase
label
labelProbability
entropy
sourceEngine
sourceMethod
identity
```

pyCPT v1 使用：

```text
x = FrPercent
y = QtDimensionless = QnetKpa / SigmaV0EffectiveKpa
chartType = Robertson1990
```

## 8. Provenance

必填字段：

```text
engineId
engineVersion
engineLicense
engineSource
enginePackageSha256 或 engineRepoCommit
pythonVersion
runnerVersion
runnerScriptSha256
commandLine
inputJsonPath
outputJsonPath
canonicalInputSha256
createdAt
completedAt
durationMs
notForOfficialResult
legalReviewRequired
```

Groundhog 输出必须记录：

```text
identity = Reference
engineLicense = GNU GPLv3
notForOfficialResult = true
legalReviewRequired = true
```

pyCPT 输出必须记录：

```text
identity = Experimental
engineLicense = LGPL-3.0
notForOfficialResult = true
```

## 9. R0 验收命令

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\method-lab\check-method-run-result-contract.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\method-lab\check-external-engine-provenance.ps1
```

通过标记：

```text
METHOD_LAB_CONTRACT_CHECK=PASS
METHOD_LAB_LICENSE_PROVENANCE_CHECK=PASS
METHOD_LAB_FAILURE_PATH_CHECK=PASS
METHOD_LAB_NO_OFFICIAL_WRITE=PASS
```
