# 通用 CPT/CPTU 导入设计说明

Date: 2026-06-25

Roadmap axis: `FUNC-V2`

当前切片：`FUNC-V2A 标准 Excel 模板与导入预览设计`

## 1. 目标

FUNC-V2A 的目标不是让软件“自动理解任意 Excel 并写入数据库”，而是先建立以标准模板为主的可审计导入预览契约。

主流程必须按这个顺序实现：

```text
下载/使用标准模板 -> 用户填写 depth/qc/u2/fs/qt/Fr/水深等字段 -> 软件确定性校验 -> 导入预览 -> 用户确认 -> 后续提交
```

其中：

- 标准模板是主路径，不是辅助路径；
- 软件按模板固定列做确定性校验，不依赖猜测；
- 用户必须能看到字段、单位、行数、缺失值和异常值；
- 预览阶段不修改 `Projects`、`TestPoints`、`CptuRecords` 或导出记录；
- 后续提交阶段必须保留来源文件哈希、模板版本、字段映射、单位换算和导入行数。

## 2. 当前基线

现有导入路径是 `SampleDataImportService`：

- 模板固定为 `CPTU Excel / 营口样例模板`；
- 源路径固定在 `sample_data/yingkou_cpt9_19_s1/营口海风CP9-19-S1`；
- 只读取第一个工作表，第 9 行作为表头，第 10 行起作为数据；
- 识别固定中文表头，例如 `深度 (m)`、`锥尖 qc (kPa)`、`孔压 U2 (kPa)`、`锥尖 qt (kPa)`、`摩阻比 Fr (%)`；
- 导入前整目录复制到 `app_data/imports/{projectId}/yingkou_cpt9_19_s1`；
- 提交时删除并重建目标项目下同名测点的 `TestPoints` 和 `CptuRecords`；
- 缺少足够下游字段时依赖后续 `DataQualityCheckService` 和 `CptuInterpretationService` 暴露问题。

FUNC-V2A 必须保留这条营口模板回归路径，同时新增“标准模板确定性校验”路径。

产品交互原则：

- 主流程：用户下载或使用软件提供的 CPT/CPTU Excel 模板，按固定列填写。
- 校验方式：模板列名、必填字段、单位、数值范围和连续深度都做确定性校验。
- 兼容路径：用户选择已有 Excel 时，软件只做候选列建议；该路径不能替代标准模板主流程。
- 决策边界：软件不得把任意复杂 Excel 静默转换成正式 CPTU 数据；提交前必须由用户确认工作表、表头行、数据起始行、字段映射和单位。
- 自动识别定位：自动识别是兼容旧文件的辅助能力，不是产品主流程。

## 3. 标准模板主流程

标准模板建议固定一个数据表，例如 `CPTU_Data`。第一版模板列如下：

| 模板列 | 含义 | 必填 | 单位/填写规则 |
| --- | --- | --- | --- |
| `PointName` | 测点名称 | 是 | 文本，例如 `CPT09` |
| `DepthM` | 深度 | 是 | m |
| `Qc` | 锥尖阻力 qc | 当无 `Qt` 时是 | 搭配 `QcUnit` |
| `QcUnit` | qc 单位 | 当填写 `Qc` 时是 | `kPa` 或 `MPa` |
| `Qt` | 修正锥尖阻力 qt | 当无 `Qc+U2` 时是 | 搭配 `QtUnit` |
| `QtUnit` | qt 单位 | 当填写 `Qt` 时是 | `kPa` 或 `MPa` |
| `Fs` | 侧摩阻力 fs | 是 | 搭配 `FsUnit` |
| `FsUnit` | fs 单位 | 是 | `kPa` 或 `MPa` |
| `U2` | 孔压 u2 | 当无 `Qt` 且使用 `Qc` 修正时是 | 搭配 `U2Unit` |
| `U2Unit` | u2 单位 | 当填写 `U2` 时是 | `kPa` 或 `MPa` |
| `Fr` | 摩阻比 | 否 | `%`；缺省时可由 `100*fs/qt` 派生 |
| `WaterDepthM` | 水深 | 解译前必需 | m；缺少时只可预览或受控提交，不可标为解译就绪 |
| `FinalDepthM` | 终孔深度 | 否 | m；缺省时可由最大深度建议 |

标准模板校验输出：

- 模板版本；
- 测点名称；
- 总行数、有效行数、跳过行数；
- 必填字段缺失；
- 单位换算摘要；
- 深度是否严格递增；
- 是否满足数据库提交最低要求；
- 是否满足当前首轮解译就绪要求。

## 4. Fixture

FUNC-V2A 使用两个验收 fixture：

| Fixture | 用途 | 预期行为 |
| --- | --- | --- |
| `sample_data/yingkou_cpt9_19_s1` | 回归基线 | 预览应识别 3 个测点和当前行数；后续提交仍应保持 16603 行回归目标 |
| `Quyon Quebec CPTu Vs.xlsx` | 兼容路径压力测试 | 只用于测试候选列建议和风险提示；不作为标准模板，不得直接提交 |

本地只读检查显示 `Quyon Quebec CPTu Vs.xlsx` 至少包含这些可映射区域：

- `CPT Calcs`：第 21 行字段、第 22 行单位、第 23 行起数据；字段含 `Depth, z`、`qT`、`fs`、`u2`；
- `Vs Calcs`：第 21 行字段、第 22 行单位、第 23 行起数据；字段含 `Depth, z`、`qT`、`qt`、`fs`、`Fr`、`u2`；
- `Different Methods`：第 21 行字段、第 22 行单位、第 23 行起数据；字段含 `Depth`、`qc`、`fs`、`FR`。

该文件是计算模板而不是干净原始数据表，因此只适合检验“候选识别 + 用户确认映射 + 风险提示”。它不是产品主流程，也不适合作为自动提交样例。

## 5. 字段契约

受控模板和交互映射最终都转换为统一内部字段名：

| 内部字段 | 可识别别名示例 | 单位策略 | 提交要求 |
| --- | --- | --- | --- |
| `DepthM` | `depth`、`Depth, z`、`深度`、`z` | 必须换算为 m | 必填 |
| `QcKpa` | `qc`、`cone resistance`、`锥尖 qc` | MPa -> kPa；bar/tsf 先标记为需确认 | 与 `QtKpa` 二选一路径 |
| `QtKpa` | `qt`、`qT`、`corrected cone`、`锥尖 qt` | MPa -> kPa；bar -> kPa | `QtKpa` 或 `QcKpa + U2Kpa` 可用于现有净面积率修正 |
| `SleeveKpa` | `fs`、`sleeve friction`、`侧摩` | MPa -> kPa；bar/tsf 先标记为需确认 | 必填 |
| `U2Kpa` | `u2`、`pore pressure`、`孔压 U2` | MPa -> kPa | 当没有 `QtKpa` 时必填 |
| `FrPercent` | `Fr`、`FR`、`friction ratio`、`摩阻比` | percent 原样；ratio 需确认 | 可缺省，可由 `100*fs/qt` 派生 |
| `PointName` | sheet name、file name、point id/name | 文本 | 预览必须给出建议值 |
| `WaterDepthM` | `water depth`、`GWT`、`水深` | m | 可缺省；缺省时仅可预览或受控提交，不可标为解译就绪 |
| `FinalDepthM` | `final depth`、`孔深`、`终孔深度` | m | 可缺省，可由最大深度建议 |

最低数据库提交数据路径：

```text
DepthM + SleeveKpa + (QtKpa OR (QcKpa + U2Kpa available for net-area-ratio correction))
```

理由：

- `DepthM` 是 `CptuRecords` 唯一非空输入字段；
- SBT12 图需要 `qt` 和 `fs`；
- 首轮 Ic/Qtn 解译通过已有 `QtKpa`，或通过 `QcKpa + (1-a) * U2Kpa` 净面积率修正解析 `qt`；
- `FrPercent` 可由 `100*fs/qt` 派生；
- 缺少终孔深度、探头编号时应允许预览和受控提交，但提交后由数据检查页继续暴露为开放问题。

预览和提交资格分三层：

| 层级 | 要求 | 行为 |
| --- | --- | --- |
| 预览可识别 | 找到候选深度列和至少一个阻力/摩阻候选列 | 可显示候选映射和警告，不允许直接提交 |
| 数据库提交最低要求 | `DepthM + SleeveKpa + (QtKpa OR QcKpa+U2Kpa)`，其中 `QcKpa+U2Kpa` 只表示现有净面积率修正所需字段均可得 | 可在后续提交阶段写入 `TestPoints`/`CptuRecords`，但仍需展示警告 |
| 解译就绪要求 | 数据库提交最低要求 + `WaterDepthM` 或用户确认的手动水深元数据 | 可运行当前首轮 Ic/Qtn 解译；缺少水深时不得标为解译就绪 |

## 6. 预览服务契约

建议新增服务名：

```text
GenericCptuExcelImportPreviewService
```

核心接口：

```text
PreviewWorkbook(path, options) -> GenericImportPreview
```

`GenericImportPreview` 应包含：

- `SourceFileName`
- `SourceFilePath`
- `SourceFileSha256`
- `WorkbookFormat`
- `CandidateSheets`
- `RecommendedSheetId`
- `OverallStatus`
- `Warnings`
- `Errors`

`CandidateSheetPreview` 应包含：

- `SheetName`
- `HeaderRowIndex`
- `UnitRowIndex`
- `DataStartRowIndex`
- `DataEndRowIndex`
- `DetectedPointName`
- `Mappings`
- `RowCount`
- `ValidRowCount`
- `SkippedRowCount`
- `MissingRequiredFieldCounts`
- `UnitConversionSummary`
- `CommitEligibility`

`ColumnMappingPreview` 应包含：

- `TargetField`
- `SourceColumnIndex`
- `SourceHeader`
- `SourceUnit`
- `DetectedUnit`
- `Conversion`
- `Confidence`
- `NeedsUserConfirmation`

这个服务不负责“自动导入任意 Excel”。它只负责：

- 给标准模板做确定性校验；
- 给非标准 Excel 做候选识别和风险提示；
- 返回建议映射和风险；
- 等待 UI 或后续流程传入用户确认后的映射。

## 7. 识别策略

第一版识别规则保持保守，并明确只产生“建议映射”：

1. 扫描每个 worksheet 的前 80 行和前 160 列。
2. 找到同时包含深度类字段和阻力类字段的候选表头行。
3. 若下一行主要是单位文本，将其作为单位行。
4. 从表头行之后第一行开始，连续读取数值型深度行。
5. 对候选区域评分：
   - 有 `DepthM` 加高权重；
   - 有 `QtKpa` 或净面积率修正所需的 `QcKpa + U2Kpa` 字段加高权重；
   - 有 `SleeveKpa` 加高权重；
   - 有 `WaterDepthM` 或可确认水深元数据时加解译就绪权重；
   - 数据行数越多权重越高；
   - 多个重复 `qt/qc/fs` 字段时降低置信度并要求用户确认。
6. 自动推荐最高分候选，但不静默提交。

标准模板路径不依赖猜测：

1. 模板固定列建议为 `PointName`、`DepthM`、`Qc`、`QcUnit`、`Qt`、`QtUnit`、`Fs`、`FsUnit`、`U2`、`U2Unit`、`Fr`、`WaterDepthM`、`FinalDepthM`。
2. UI 可以把单位做成下拉或表头单位选择，避免用户在单元格里自由输入过多变体。
3. 模板校验失败时返回明确错误，不进入自动提交。
4. 非标准 Excel 只能走交互映射路径。

## 8. 存储与审计

FUNC-V2A 只做预览设计和预览解析，不复制源文件、不写业务表。

后续提交阶段建议：

- 首先计算 `SHA256`；
- 源文件存入内容寻址目录，例如 `app_data/import_sources/sha256/{hash-prefix}/{hash}.xlsx`；
- 项目导入记录只引用源文件哈希和逻辑导入批次；
- 相同文件重复预览不复制；
- 相同文件重复提交必须要求用户确认是覆盖、跳过还是新建测点版本。

候选持久化表应在 FUNC-V2B 之后再定稿，FUNC-V2A 不改 schema。

## 9. UI 边界

FUNC-V2A 不做完整 UI 重写。后续 UI 入口应围绕“模板 + 映射确认”展开：

已确认的导入页整体方向：

```text
顶部流程：项目概览 -> 数据导入 -> 数据检查 -> 测试解译 -> 成果输出

导入页主区：
[标准模板] [粘贴表格] [已有 Excel 映射] [批量导入]

中央主视图：
数据预览表

辅助面板：
字段映射 / 单位确认 / 校验报告 / 导入日志
```

布局原则：

- 导入页是五步流程中的“数据导入”阶段，只解决“数据进入系统且字段可信”。
- 中央数据预览表是主角，不做成上传按钮加零散卡片。
- 字段映射、单位确认、校验报告可以放在主区右侧抽屉或下方面板，不在导入页常驻完整右侧参数栏。
- 标准模板是绿色通道；粘贴表格、已有 Excel 显式映射、同结构批量导入是后续受控扩展路径。
- 已有 Excel 路径只能进入“候选识别 + 用户确认映射 + 风险提示”，不能静默转为正式 CPTU 数据。

第一版入口应围绕“模板 + 映射确认”展开：

- “下载/查看 CPTU 标准模板”入口；
- “导入标准模板并生成预览”入口；
- “选择已有 Excel 并尝试建议映射”入口；
- 预览结果表；
- 字段映射选择器：用户明确指定 `深度 / qc / qt / fs / u2 / Fr` 对应列；
- 单位选择器或单位确认；
- “提交导入”按钮保持禁用，直到 FUNC-V2B 完成。

现有营口样例模板按钮继续可用，作为回归路径。

## 10. 验收

FUNC-V2A 可关闭的条件：

- 设计文件明确预览契约、字段契约、最低提交字段、fixture 和非目标；
- 设计文件明确：标准模板是主流程，自动识别只做兼容路径建议；
- `plan.md` 记录 FUNC-V2A 为当前可执行 slice；
- `Process.md` 指向新的 FUNC-V2 过程日志；
- `process_logs/Process10.md` 记录本地检查证据；
- 不改变现有数据库 schema；
- 不改变现有导入、解释、参数、导出行为；
- 文档 diff 检查通过；
- 若本轮只做设计文档，运行 `git diff --check` 作为本地验证。

## 11. 非目标

- 不在 FUNC-V2A 写入 `TestPoints` 或 `CptuRecords`；
- 不新增解释公式；
- 不改变 SBT12 或参数解译；
- 不生成报告/PDF/DXF；
- 不支持 TXT/CSV；
- 不把 `Quyon Quebec CPTu Vs.xlsx` 当作自动提交样例；
- 不承诺任意用户 Excel 都能自动转换成 CPTU 数据；
- 不复制或删除用户源文件。
