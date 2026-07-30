# GMW-P5B 批量运行与结果矩阵合同

日期：2026-06-30

适用范围：科研增强、批量运行、方法结果矩阵、后续研究模式视图。

## 1. 目标

P5B 定义批量运行请求和结果矩阵，不调度真实外部 runner，不改 schema，不做 UI。

核心目标：

```text
把多个点位、多个方法能力、多个输出对象的批量运行结果组织成可比较矩阵。
```

P5B 不是正式采纳流程。批量结果默认是 `ResearchOnly`。

## 2. 对象模型

### 2.1 BatchRunPlan

字段：

- `schemaVersion`: `batch-run-matrix.v1`
- `batchPlanId`
- `projectId`
- `createdAtUtc`
- `mode`: `ResearchOnly / EngineeringReview`
- `officialWriteAllowed`
- `exportAllowed`
- `scope`
- `methodRefs[]`
- `runQueue[]`
- `resultMatrix[]`
- `summary`
- `preflight[]`
- `routing`

### 2.2 scope

字段：

- `pointIds[]`
- `depthRangeM`
- `requiredInputProfiles[]`
- `outputObjectTypes[]`

### 2.3 methodRefs

字段：

- `methodRefId`
- `methodId`
- `capabilityId`
- `capabilityType`
- `outputObjectType`
- `identity`
- `engineeringUseLevel`
- `runtimeKind`
- `officialWriteAllowedDefault`
- `exportAllowedDefault`

### 2.4 runQueue

每个任务是一个方法能力在一个点位上的运行计划。

字段：

- `queueItemId`
- `pointId`
- `methodRefId`
- `capabilityId`
- `inputHash`
- `status`: `Pending / Ready / Completed / Failed / Skipped`
- `outputObjectType`
- `expectedOutputId`
- `warnings[]`
- `logs[]`

### 2.5 resultMatrix

矩阵行表示“点位 x 方法能力 x 输出对象”的结果摘要。

字段：

- `rowId`
- `pointId`
- `methodRefId`
- `outputObjectType`
- `outputObjectId`
- `runStatus`
- `metricRefs[]`
- `qualityState`: `Ready / Review / Warning / Failed / Skipped`
- `adoptionEligibility`: `ResearchOnly / Candidate / Blocked`
- `evidence`
- `nextAction`

### 2.6 summary

字段：

- `pointCount`
- `methodCount`
- `queueCount`
- `completedCount`
- `failedCount`
- `skippedCount`
- `outputObjectTypeCounts`
- `warningCount`

## 3. 安全边界

- 批量运行不直接写 official。
- 批量运行不直接写 export inputs。
- 批量运行不自动改变 `AdoptedOutputPackage`。
- `ResearchOnly` 结果必须先经过显式采纳，才能进入成果输出。
- `Failed / Skipped` 行必须保留在矩阵中，不能静默丢失。

## 4. 路由

```text
BatchRunPlan -> research.batch
resultMatrix -> research.matrix
LayerScheme rows -> stratification compare
ParameterScheme rows -> parameters compare
MethodRun logs -> method-lab
```

## 5. P5B 验收

Focused check 必须输出：

```text
BATCH_RUN_MATRIX_CONTRACT_CHECK=PASS
BATCH_RUN_QUEUE_COVERAGE=PASS
BATCH_RUN_RESULT_MATRIX_COVERAGE=PASS
BATCH_RUN_NO_OFFICIAL_WRITE=PASS
BATCH_RUN_FAILURES_VISIBLE=PASS
```

