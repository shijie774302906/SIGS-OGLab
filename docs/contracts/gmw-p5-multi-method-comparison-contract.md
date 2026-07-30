# GMW-P5A 多方法对比指标合同

日期：2026-06-30

适用范围：科研增强、方法对比、批量结果矩阵、后续研究模式视图。

## 1. 目标

P5A 定义多方法对比的通用指标对象，不实现批量 runner，不做新 UI。

核心原则：

```text
比较输出对象，不比较方法名。
```

也就是说，系统应比较：

- `LayerScheme`
- `ParameterScheme`
- `ParameterSeries`
- `ClassificationEvidence`

而不是写死：

- Groundhog vs pyCPT
- Ic/SBT vs 人工分层
- 某两个固定算法

## 2. 对象模型

### 2.1 MethodComparisonSet

字段：

- `schemaVersion`: `method-comparison-metrics.v1`
- `comparisonSetId`
- `projectId`
- `pointId`
- `createdAtUtc`
- `mode`: `ResearchOnly / EngineeringReview`
- `baselineRef`
- `candidateRefs[]`
- `metrics[]`
- `matrix[]`
- `preflight[]`
- `routing`

### 2.2 baselineRef / candidateRefs

每个 ref 至少包含：

- `refId`
- `objectType`: `LayerScheme / ParameterScheme / ParameterSeries / ClassificationEvidence`
- `objectId`
- `sourceMethodId`
- `sourceRunId`
- `status`
- `identity`
- `projectionOnly`
- `adopted`

要求：

- baseline 可以是 adopted 对象，也可以是研究指定对象。
- candidate 可以是 candidate/reference/experimental/debug 输出。
- candidate 默认不能写 official/export。

### 2.3 metrics

指标必须按 `metricType` 和 `targetObjectType` 声明，不按方法名声明。

常用指标：

| metricType | targetObjectType | 含义 |
| --- | --- | --- |
| `LayerBoundaryDelta` | `LayerScheme` | 分层边界深度差 |
| `LayerCountDelta` | `LayerScheme` | 层数差异 |
| `SoilGroupAgreement` | `LayerScheme` | 工程土组一致率 |
| `ParameterMeanDelta` | `ParameterSeries` | 参数均值差 |
| `ParameterCoverageDelta` | `ParameterScheme` | 参数覆盖率差 |
| `InvalidIntervalOverlap` | `ParameterScheme` | 无效/阻断区间重叠 |
| `ClassificationPointAgreement` | `ClassificationEvidence` | 分类点一致率 |

每个 metric 至少包含：

- `metricId`
- `metricType`
- `targetObjectType`
- `unit`
- `direction`: `LowerIsBetter / HigherIsBetter / Informational`
- `engineeringThreshold`
- `researchOnly`
- `requiresSamePoint`
- `requiresComparableDepthRange`

### 2.4 matrix

`matrix[]` 表示 baseline 与 candidate 的实际对比结果。

字段：

- `rowId`
- `baselineRefId`
- `candidateRefId`
- `metricId`
- `value`
- `unit`
- `severity`: `Info / Review / Warning / Blocking`
- `evidence`
- `nextAction`

### 2.5 preflight

对比前置检查：

- 同一点位或已声明 cross-point；
- 深度范围可比较；
- 输入对象 schema 可读；
- candidate 不直接 official/export；
- baseline/candidate 至少有一个共同目标对象类型。

## 3. 路由

P5A 只定义对象路由：

```text
ComparisonMetric -> method-lab.compare / research
MethodComparisonSet -> research
LayerScheme metric -> stratification bottom compare
ParameterScheme metric -> parameters bottom compare
```

默认工程视图不显示完整研究矩阵，只显示影响当前采纳判断的摘要。

## 4. 安全边界

- 对比结果不自动改变采纳状态。
- 对比结果不自动写 official。
- 对比结果不自动进入 export inputs。
- `ResearchOnly` 对比默认不能用于正式成果。
- 如果对比要影响 `AdoptedOutputPackage`，必须经过显式采纳流程。

## 5. P5A 验收

Focused check 必须输出：

```text
METHOD_COMPARISON_CONTRACT_CHECK=PASS
METHOD_COMPARISON_OBJECT_ROUTING=PASS
METHOD_COMPARISON_METRIC_COVERAGE=PASS
METHOD_COMPARISON_NO_METHOD_NAME_MATRIX=PASS
METHOD_COMPARISON_NO_OFFICIAL_WRITE=PASS
```

