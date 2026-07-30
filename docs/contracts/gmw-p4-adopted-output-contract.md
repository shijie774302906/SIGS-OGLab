# GMW-P4A 成果输出采纳对象合同

日期：2026-06-30

适用范围：`成果输出`、`报告预检`、`解译报告 manifest`、后续正式成果包。

## 1. 目标

P4A 只解决一个问题：

```text
成果输出到底消费什么对象？
```

结论：

```text
成果输出消费 AdoptedOutputPackage。
AdoptedOutputPackage 必须显式引用已采纳的 LayerScheme 和已采纳的 ParameterScheme。
MethodRun、未采纳候选、实验结果、只读投影结果只能作为 evidence，不能直接进入正式导出输入。
```

这不是 UI 切片，不改 SQLite schema，不改导出文件内容，不改解译或参数公式。

## 2. 为什么需要这个对象

现有 `成果输出` 和 `ReportReadinessService` 主要判断：

- 是否有当前项目和 CPTU 点位；
- 是否有数据检查记录；
- 是否有已完成首轮解译 run；
- 是否有已保存参数 run；
- 是否有模板。

这能判断“有没有计算结果”，但不能判断“这些结果是否被工程采纳”。通用方法工作流引入更多内置、外部和自定义方法后，必须避免把测试运行、实验方法、候选方案直接写入正式成果。

因此 P4A 定义一层采纳对象：

```text
LayerScheme / ParameterScheme / MethodRun candidates
  -> 用户或规则采纳
  -> AdoptedOutputPackage
  -> 成果输出 / 报告预检 / manifest
```

## 3. 对象模型

### 3.1 AdoptedOutputPackage

字段：

- `schemaVersion`: 固定为 `adopted-output-package.v1`
- `packageId`
- `projectId`
- `pointId`
- `createdAtUtc`
- `status`: `Draft / Adopted / Blocked`
- `officialUseAllowed`
- `exportAllowed`
- `adoptedLayerScheme`
- `adoptedParameterScheme`
- `evidenceRefs[]`
- `rejectedOrUnadoptedRefs[]`
- `preflight[]`
- `reportManifestProjection`

### 3.2 adoptedLayerScheme

字段：

- `objectType`: `LayerScheme`
- `schemeId`
- `status`: 必须为 `Adopted`
- `sourceMethodId`
- `sourceRunId`
- `layerCount`
- `boundaryCount`
- `depthRangeM`
- `adoption`

`adoption` 字段：

- `adoptedBy`
- `adoptedAtUtc`
- `reason`
- `reviewState`: `Accepted / AcceptedWithWarnings / Blocked`

### 3.3 adoptedParameterScheme

字段：

- `objectType`: `ParameterScheme`
- `parameterSchemeId`
- `status`: 必须为 `Adopted`
- `sourceLayerSchemeId`: 必须等于 `adoptedLayerScheme.schemeId`
- `parameterSlots[]`
- `seriesCount`
- `valueCount`
- `adoption`

每个 `parameterSlot` 至少包含：

- `slotId`
- `parameterSymbol`
- `selectedMethodId`
- `applicableLayerFilter`
- `outputMode`
- `validationState`

### 3.4 evidenceRefs

`evidenceRefs[]` 用于把正式采纳对象和原始计算证据连起来。它可以引用：

- `MethodRun`
- `ClassificationEvidence`
- `ParameterSeries`
- `DataCheckRun`
- `ReportTemplate`
- `ExportRecord`

每条 evidence 至少包含：

- `refId`
- `objectType`
- `sourceMethodId`
- `sourceRunId`
- `role`: `Source / Supporting / Audit / Template`
- `provenanceRequired`

### 3.5 rejectedOrUnadoptedRefs

该数组必须保留“没有进入成果输出”的候选来源，用于审计和科研对比。

要求：

- `MethodRun` 可出现在这里。
- `LayerScheme` / `ParameterScheme` 的 `Candidate / Draft / Review / Experimental / projectionOnly` 可以出现在这里。
- 这里的对象不得出现在 `reportManifestProjection.exportInputs[]`。

## 4. 成果输出消费规则

### 4.1 可以进入 export inputs

只有以下对象可以进入 `reportManifestProjection.exportInputs[]`：

- `AdoptedOutputPackage`
- `Adopted LayerScheme`
- `Adopted ParameterScheme`
- 已采纳对象引用的必要 `DataCheckRun`
- 已确认模板 `ReportTemplate`
- 已完成的导出审计 `ExportRecord`

### 4.2 不可以直接进入 export inputs

以下对象不能直接进入正式成果输入：

- `MethodRun`
- `DebugArtifact`
- `ClassificationEvidence`
- `ParameterSeries`
- `Candidate LayerScheme`
- `Draft ParameterScheme`
- `Experimental` 方法输出
- `Reference` 方法输出
- `projectionOnly=true` 输出

它们只能作为 `evidenceRefs[]` 或 `rejectedOrUnadoptedRefs[]`。

### 4.3 阻断条件

`officialUseAllowed` 和 `exportAllowed` 必须为 `false`，如果存在：

- 没有 `Adopted LayerScheme`；
- 没有 `Adopted ParameterScheme`；
- `ParameterScheme.sourceLayerSchemeId` 不等于采纳的 `LayerScheme.schemeId`；
- 采纳对象缺少 provenance；
- 数据检查存在开放 Error；
- 采纳对象仍标记 `projectionOnly=true`；
- 采纳对象来自 `Experimental / Reference / DebugOnly` 方法但没有明确人工采纳记录。

## 5. 与现有服务的关系

P4A 不改变现有服务，只定义后续接入点：

- `ExportPreflightService` 后续应新增 `adopted-output-package` 预检项。
- `ReportReadinessService` 后续应把 `AdoptedOutputPackage` 写入 `report-readiness.v1` manifest。
- `CptuExportService` 后续生成 `interpretation-report-document.v1` 时，应把 `adoptedOutputPackage` 和 `exportInputs[]` 写入 manifest。

现有 `InterpretationRun` 和 `ParameterRun` 在过渡期仍可导出，但在通用方法工作流中应逐步降级为 evidence，而不是最终成果输入对象。

## 6. P4A 验收

P4A 完成标准：

- 合同文件存在并明确采纳对象边界；
- fixture 包含 adopted layer scheme、adopted parameter scheme、evidence、unadopted refs、preflight 和 manifest projection；
- focused check 通过：
  - `ADOPTED_OUTPUT_CONTRACT_CHECK=PASS`
  - `ADOPTED_OUTPUT_REQUIRED_OBJECTS=PASS`
  - `ADOPTED_OUTPUT_SOURCE_TRACEABILITY=PASS`
  - `ADOPTED_OUTPUT_NO_RAW_METHOD_RUN_EXPORT=PASS`
  - `ADOPTED_OUTPUT_PRECHECK_RULES=PASS`

