# CPTU 解译报告模板 v1

## 目的

本文定义 CPTU 解译报告的第一版模板契约。模板参考常见 CPT/CPTU 岩土勘察报告结构，并结合当前软件已有的数据模型。

第一阶段生成可审计的 HTML/Markdown 报告包，不生成未审核的正式 PDF。

## 输出层级

| 层级 | 输出文件 | 当前状态 |
| --- | --- | --- |
| 报告预检包 | `report-manifest.json`、`report-preview.md` | 已实现，用于判断报告条件是否齐备。 |
| 解译报告文档包 | `interpretation-report.html`、`interpretation-report.md`、`report-manifest.json` | 当前实现目标，用于内部审查和内容确认。 |
| 正式 PDF | `interpretation-report.pdf` | 后续能力，需要模板、图件策略和审计标准确认后再启用。 |

## 模板身份

当前内置草案模板：

```json
{
  "schemaVersion": "interpretation-report-template.v1",
  "templateName": "内置 CPTU 解译报告草案模板",
  "templateStatus": "内部草案",
  "auditStandard": "internal-cptu-report-audit-v1"
}
```

正式 PDF 必须使用已批准的 `report-template.v1` JSON 文件，并明确模板名称、审计标准、必需章节和图件策略。

## 必需章节

1. 封面
   - 项目名称、项目编号、区域、坐标系统
   - 当前 CPTU 点位
   - 报告生成时间
   - 报告状态

2. 报告控制信息
   - 报告 schema 版本
   - 模板名称和模板状态
   - 解译 run id
   - 参数 run id
   - 数据检查状态
   - 导出记录 id

3. 执行摘要
   - 当前点位深度范围
   - 解译区间数量
   - 主要土类或 SBT 类型
   - 参数有效、不适用、无效数量
   - 阻断项和警告项

4. 项目与数据来源
   - 项目元数据
   - 点位元数据
   - 探头编号、水深、终孔深度
   - 数据源文件夹

5. 数据质量
   - 最近数据检查时间
   - 开放 Error、Warning、Info 数量
   - 数据质量问题表

6. CPTU 曲线与派生量
   - 当前阶段输出解译区间数据表
   - 后续可嵌入 qc/qt、fs、u2、Fr、Qtn 等图件

7. SBT 与分层解释
   - 深度起止
   - 土类或 SBT 类型
   - Ic、Qt、Qtn、Fr、有效应力等字段

8. 工程参数解释
   - 参数 run id 和来源解译 run id
   - 方法集 id 和版本
   - 各参数统计
   - φ'、Su 及后续参数的代表性结果

9. 方法与假设
   - 首轮解译方法 id 和版本
   - 参数方法 id 和公式来源
   - 适用性状态和主要限制原因

10. 结论与限制
    - 报告来自当前数据库证据
    - HTML/Markdown 报告不是签发版正式 PDF
    - 未解决的数据质量阻断项必须在报告中保留

11. 附录
    - manifest 路径
    - 导出记录 id
    - 生成文件路径

## 缺失数据处理规则

- 没有活动项目：不生成报告。
- 没有 CPTU 点位：不生成报告。
- 没有已完成的首轮解译 run：不生成报告。
- 没有已保存的参数 run：不生成报告。
- 没有数据检查记录：不生成报告。
- 存在开放 Error：允许生成内部审查版报告，但报告状态必须标记为“正式使用受阻”。
- 缺少正式模板：可以生成 HTML/Markdown 报告，正式 PDF 仍保持禁用。

## Manifest Schema

解译报告文档包写出 `report-manifest.json`。字段名保持英文，便于自动化读取；字段值中面向用户的内容使用中文。

```json
{
  "schemaVersion": "interpretation-report-document.v1",
  "createdAtUtc": "...",
  "template": {
    "schemaVersion": "interpretation-report-template.v1",
    "templateName": "内置 CPTU 解译报告草案模板",
    "templateStatus": "内部草案"
  },
  "project": {},
  "testPoint": {},
  "interpretationRun": {},
  "parameterRun": {},
  "adoptedOutputPackage": {},
  "dataQuality": {},
  "summary": {},
  "artifacts": {}
}
```

`adoptedOutputPackage` 用于记录成果输出采纳对象投影，至少应包含：

- `PackageId`
- `Status`
- `OfficialUseAllowed`
- `ExportAllowed`
- `LayerSchemeId`
- `LayerSchemeStatus`
- `ParameterSchemeId`
- `ParameterSchemeStatus`
- `EvidenceRefCount`
- `ExportInputCount`
- `UnadoptedRefCount`
- `HasRawMethodRunExportInput`

其中 `HasRawMethodRunExportInput` 必须为 `false`，否则报告 manifest 不能作为正式成果输入链路的可信证据。

## 验证要求

回归检查必须确认：

- 报告包会创建导出记录；
- HTML、Markdown 和 manifest 文件均存在；
- manifest 包含 `interpretation-report-document.v1`；
- 报告引用当前项目 id、点位 id、解译 run id 和参数 run id；
- manifest 包含 `adoptedOutputPackage`，并引用采纳的分层方案和参数方案；
- manifest 证明 raw `MethodRun` 不是直接 export input；
- 不创建占位 PDF；
- 正式 PDF 仍由已批准模板路径控制。
