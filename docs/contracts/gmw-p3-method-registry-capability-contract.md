# GMW-P3A 方法 Registry 与 Capability 合同

日期：2026-06-30

状态：`active-contract`

适用范围：`方法实验室`、地层分层方法、分类证据方法、参数解译方法、预处理方法、对比指标方法，以及后续用户自定义方法。

## 1. 目标

P3A 解决一个具体问题：系统不能继续让页面代码直接认识 `Groundhog`、`pyCPT` 或某个具体 runner。系统应该读取方法注册表，通过能力声明决定一个方法出现在哪里、能被谁消费、是否能进入 official 链路。

目标关系：

```text
MethodRegistry
  -> Method
  -> MethodCapability
  -> outputObjectType
  -> consumerRoute
```

默认业务路由：

| outputObjectType | consumerRoute | 默认消费位置 |
| --- | --- | --- |
| `LayerScheme` | `stratification` | 地层分层 |
| `ClassificationEvidence` | `stratification.evidence` | 地层分层证据视图 |
| `ParameterSeries` | `parameters` | 参数解译 |
| `ParameterScheme` | `parameters` | 参数解译 |
| `MethodRun` | `method-lab` | 方法实验室 |
| `DebugArtifact` | `method-lab` | 方法实验室底部日志/产物 |
| `ComparisonMetric` | `method-lab.compare` | 方法实验室或底部对比 |
| `PreprocessedProfile` | `data-check` | 数据检查或预处理详情 |

## 2. 非目标

- 不实现插件市场。
- 不改 SQLite schema。
- 不重构当前 `MethodLabPage`。
- 不运行真实外部方法。
- 不把 Reference / Experimental / DebugOnly 方法写入 official 成果。
- 不为 Groundhog、pyCPT 或任意单一方法做专属主页面。

## 3. MethodRegistry

`schemaVersion` 固定为：

```text
method-registry.v1
```

根字段：

| 字段 | 说明 |
| --- | --- |
| `schemaVersion` | 合同版本 |
| `registryId` | 注册表 id |
| `generatedAt` | 生成时间 |
| `scope` | `BuiltInAndExternalResearch` 等 |
| `officialWriteDefault` | registry 默认不允许 official 写入 |
| `routes[]` | 输出对象到工作流路由的映射 |
| `methods[]` | 方法声明 |
| `safetyRules[]` | 全局安全规则 |

## 4. Method

方法是可被系统选择、运行或作为模板实例化的单元。

字段：

| 字段 | 说明 |
| --- | --- |
| `methodId` | 稳定 id，不能依赖展示名称 |
| `displayName` | UI 展示名称 |
| `provider` | 提供方 |
| `version` | 方法或包版本 |
| `methodType` | `BuiltIn / PythonExternal / CommandExternal / UserDefinedTemplate` |
| `status` | `Installed / NotInstalled / Broken / Unsupported / AvailableTemplate` |
| `identityDefault` | `Official / Reference / Experimental / Draft / Debug` |
| `engineeringUseLevel` | `OfficialCandidate / Reference / Experimental / DebugOnly` |
| `license` | 许可证 |
| `licensePolicy` | legal review、distribution、official usage policy |
| `runtime` | 运行方式 |
| `capabilities[]` | 能力声明 |
| `inputRequirements[]` | 输入要求 |
| `outputContracts[]` | 输出合同 |
| `settingsSchema` | 简化设置 schema 或 schema ref |
| `provenancePolicy` | provenance 要求 |

## 5. MethodCapability

Capability 决定方法出现在哪里。UI 不能通过 `methodId` 判断一个方法属于哪个页面。

字段：

| 字段 | 说明 |
| --- | --- |
| `capabilityId` | 稳定能力 id |
| `capabilityType` | `LayerSchemeProducer / ClassificationEvidenceProducer / ParameterSeriesProducer / ParameterSchemeProducer / Preprocessor / ComparisonMetricProducer` |
| `outputObjectType` | 输出对象类型 |
| `consumerRoute` | 消费 route |
| `outputParameter` | 参数符号；非参数输出可为 `null` |
| `applicableSoilTypes[]` | `sand / clay / mixed / unknown / all` |
| `requiredInputs[]` | 必需输入 |
| `optionalInputs[]` | 可选输入 |
| `supportsCurrentPoint` | 是否支持单点 |
| `supportsBatch` | 是否支持批量 |
| `supportsUserSettings` | 是否支持用户设置 |
| `engineeringUseLevel` | 能力级别 |
| `defaultVisibleIn` | 默认出现的页面或区域 |

## 6. InputRequirement

输入要求必须能被数据检查、方法选择器和 Method Lab 共用。

字段：

| 字段 | 说明 |
| --- | --- |
| `inputId` | 稳定输入 id |
| `field` | 数据字段 |
| `unit` | 单位 |
| `requiredForCapabilities[]` | 关联能力 |
| `validationRule` | 基本检查，如 `positive`、`nonNegative`、`monotonicDepth` |
| `missingBehavior` | `BlockRun / SkipValue / WarnOnly` |

## 7. OutputContract

输出合同说明方法产物如何进入主流程。

字段：

| 字段 | 说明 |
| --- | --- |
| `outputObjectType` | 输出对象类型 |
| `schemaRef` | 输出 schema |
| `consumerRoute` | 消费 route |
| `officialWriteAllowedDefault` | 默认是否允许 official write |
| `exportAllowedDefault` | 默认是否允许导出 |
| `requiresAdoption` | 是否需要采纳 |
| `provenanceRequired` | 是否必须带 provenance |

规则：

- `OfficialCandidate` 可作为 official 候选，但仍需要采纳或保存流程。
- `Reference` 默认 `officialWriteAllowedDefault=false`，除非后续法律与工程审查另行确认。
- `Experimental` 默认不可 official write/export。
- `DebugOnly` 只能留在 Method Lab。

## 8. UI 组织规则

P3B 页面应按 capability 组织，而不是按方法名组织：

```text
Left Tree
  分层方法
  分类证据
  参数解译
  预处理
  对比指标
  Debug only

Center
  selected method capabilities
  input requirements
  output contracts
  recent test run summary

Right
  selected method metadata
  license
  runtime
  provenance policy

Bottom
  logs
  validation errors
  artifacts
```

不默认显示：

- 完整 JSON。
- stdout/stderr。
- 长路径。
- license 长文本。

## 9. P3A Fixture

当前 fixture：

```text
sample_data/method-lab/method-registry.v1.json
```

它必须覆盖：

- 内置 Ic/SBT first pass：`LayerScheme`、`ClassificationEvidence`。
- Groundhog reference：`ParameterSeries`、`ClassificationEvidence`、`ComparisonMetric`。
- pyCPT experimental：`LayerScheme`、`ClassificationEvidence`。
- 用户自定义参数公式模板：`ParameterSeries`、`ParameterScheme`。
- profile preprocessor：`PreprocessedProfile`。

## 10. 验收

Focused check：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\method-lab\check-method-registry-contract.ps1
```

通过标记：

```text
METHOD_REGISTRY_CONTRACT_CHECK=PASS
METHOD_REGISTRY_CAPABILITY_ROUTING=PASS
METHOD_REGISTRY_COVERAGE=PASS
METHOD_REGISTRY_NO_METHOD_NAME_ROUTING=PASS
METHOD_REGISTRY_NO_UNSAFE_OFFICIAL_WRITE=PASS
```

关闭 P3A 的最低证据：

- 合同文档存在。
- registry fixture 通过 focused check。
- local QA 已接入该 focused check。
- `plan.md`、`Process.md`、`Plan-total.md`、`process_logs/Process48.md` 已同步。
