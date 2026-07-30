# Robertson SBT12 图与通用解译方法实施设计说明

日期：2026-06-23

状态：开发前详细设计与同事复查稿

适用范围：`测试解译` 页面下一阶段工作，重点是把当前 `SBTn 图` 调整为 Excel 支撑的 Robertson `SBT 12区图`，同时为后续不同解译方法接入留下通用入口。

补充细化文档：

- `SBT12_界面动作详细设计与冲突复查.md`

使用方式：

- 本文件负责总体需求、数据设计和切片顺序。
- `SBT12_界面动作详细设计与冲突复查.md` 负责界面布局、用户动作、绘图层级、统计卡片、验证截图和冲突复查细节。

## 1. 设计结论

本阶段的主线不是继续完善当前 `SBTn 9区` 或 `Ic band + IB/CD` 参考图，而是实现用户指定的 Excel 来源 `SBT` sheet 中的 `12 - Zone Soil Behavioral Type Chart`。

本阶段必须同时满足三件事：

1. 图要像用户提供的 Excel SBT12 图，而不是现在的 Qtn-Fr/SBTn 散点图。
2. 解译方法入口不能继续写死成一个 `CPTU-RW-Ic-FirstPass` 单选项，要先拆出轻量方法目录，方便后续接入其他方法。
3. SBT12 在第一阶段作为图上辅助判读和工程倾向统计，不替代当前已经落库的 Ic 首轮分类。

推荐的用户可见说明固定为：

```text
SBT12 图用于辅助判断土体行为倾向；正式分类仍以首轮 Ic 结果为准。
```

短版本可用于卡片或状态栏：

```text
辅助判读，正式分类以 Ic 结果为准。
```

## 2. 已确认需求

### 2.1 图件来源

- 使用 `Quyon Quebec CPTu Vs.xlsx` 的 `SBT` sheet。
- 使用 Excel 图表 `12 - Zone Soil Behavioral Type Chart`。
- 已抽取证据：
  - 源工作簿：`Quyon Quebec CPTu Vs.xlsx`
  - sheet：`SBT`
  - 图表 XML：`xl/charts/chart51.xml`
  - 参考截图：`app_data/temp/excel-sbt/SBT_chart_export.png`
  - 曲线缓存：`app_data/temp/excel-sbt/SBT_chart_series_cache.csv`

### 2.2 坐标体系

- x 轴：`Friction Ratio, FR = fs/qt (%)`
- x 轴范围：`0-8`
- x 轴类型：线性坐标
- y 轴：`Cone Bearing, qt (bar)`
- y 轴范围：`1-1000`
- y 轴类型：log10 对数坐标

注意：当前代码里的 `FrPercent` 不是 SBT12 的 x 轴。

当前 `FrPercent` 来源是：

```text
FrPercent = 100 * fs / qnet
```

SBT12 需要新增或派生：

```text
SBT12_FR = 100 * fs / qt
SBT12_qt_bar = qt_kPa / 100
```

禁止把现有 `FrPercent` 直接拿来画 SBT12。

### 2.3 图件呈现

- 直接把当前 `SBTn 图` tab 替换或重命名为 `SBT 12区图`。
- 不新增一个并列的 SBT12 tab。
- 当前 SBTn 9区方向保留为暂停历史方向，不作为立即开发目标。
- SBT12 背景使用白色。
- 不使用彩色区域填充作为主视觉。
- 边界线使用多种颜色区分。
- 散点使用 Nature-like 的低饱和颜色。
- 选中的深度层对应散点使用更深、更明显的高亮。

### 2.4 联动

保留：

- 用户点击或选择左侧深度/分层栏后，SBT12 图上对应深度范围的点高亮。

取消：

- 点击 SBT12 图中的散点后反向选中左侧深度/分层。

允许但不作为本阶段必要项：

- hover 显示点的深度、FR、qt、Ic。

如果做 hover，必须保证 hover 只显示信息，不改变左侧选中状态。

### 2.5 统计卡片

不要把“主导区号”作为关键卡片。

SBT12 tab 的统计卡片应该围绕工程倾向，而不是展示某个区号本身。

当前用户确认的暂定聚合：

| 聚合项 | SBT12 区号 |
| --- | --- |
| 砂性倾向 | 7, 8, 9, 10, 11 |
| 黏性倾向 | 1, 2, 3 |
| 过渡/混合倾向 | 4, 5, 6, 12 |

复查要求：

- 如果这些统计只用于图上辅助判读，可以按上表先实现。
- 如果后续要进入正式报告、导出或落库，必须再次确认区号命名、区号边界、聚合依据和公式来源。

### 2.6 参数解译

用户希望后续有单独的 `参数解译` 栏。

后续主要曲线：

- `φ`
- `Su`

本阶段不新增空的 `参数解译` tab。

原因：

- 只有曲线和 SBT 图，没有 φ/Su 会显得产品逻辑不完整。
- 但空 tab 或占位 tab 会制造另一个“看起来有、实际没有”的问题。
- 参数解译必须等公式来源、单位、适用条件、无效条件、显示曲线和审计方式确认后单独切片开发。

## 3. 现有状态

### 3.1 当前后端分类

当前 `砂性/黏性/过渡` 分类不是通过 SBT 图判断的。

当前正式落库分类来自：

```text
CPTU-RW-Ic-FirstPass
```

核心逻辑在：

```text
OffshoreGeotechWorkbench/Services/CptuInterpretationService.cs
```

当前流程：

1. 优先读取或计算 `qt`。
2. 计算总应力、孔压、有效应力。
3. 计算 `qnet = qt - sigmaV0`。
4. 计算当前 `FrPercent = 100 * fs / qnet`。
5. 迭代计算 `Qtn` 和 `Ic`。
6. 按 Ic 阈值分类：
   - `Ic < 2.05`：砂性土
   - `2.05 <= Ic < 2.60`：过渡土
   - `2.60 <= Ic < 3.00`：黏性混合土
   - `Ic >= 3.00`：黏性土
7. 写入 `InterpretationResults.SoilType`。

### 3.2 当前 UI 状态

当前 `测试解译` 页面中与本阶段冲突的点：

| 当前实现 | 与新需求的冲突 | 处理方式 |
| --- | --- | --- |
| Tab 仍叫 `SBTn 图` | 用户要求 SBT12 图 | 改为 `SBT 12区图` |
| 图是 `Qtn-Fr` 对数散点 | SBT12 是 `FR-qt`，x 线性、y 对数 | 新增 SBT12 坐标计算和绘图 |
| 背景是 Ic 分带/参考线逻辑 | SBT12 需要白底、多色边界线 | 替换绘制逻辑 |
| 散点颜色来自当前 Ic/SBTn 分类 | 用户希望 Nature-like 统一散点色 | SBT12 点云统一低饱和色，选中层高亮 |
| 点击散点会反向选择深度层 | 用户明确不需要 | 移除散点点击反向联动 |
| 右侧只有 Ic 方法单选项 | 后续要接入多种方法 | 改成轻量方法选择器 |
| 当前 `FrPercent` 是 fs/qnet | SBT12 要 fs/qt | 新增独立 SBT12 派生值 |

## 4. 页面设计

### 4.1 页面总体布局

保留当前 `测试解译` 页面的大框架：

```text
┌──────────────────────────────────────────────────────────────────────┐
│ 页面标题 / 当前点位摘要 / 操作按钮                                      │
├───────────────┬──────────────────────────────────────┬───────────────┤
│ 左侧数据与深度 │ 中间结果工作台                         │ 右侧方法与状态 │
│ 点位选择       │ CPTU 曲线                              │ 方法选择       │
│ 输入参数摘要   │ SBT 12区图                              │ 方法参数       │
│ 分层/深度索引  │ 分层参数                                │ 运行状态       │
│               │ 计算日志                                │ 附件/证据      │
└───────────────┴──────────────────────────────────────┴───────────────┘
```

不把 SBT12 图做成单独新页面。

原因：

- 用户当前工作流是在 `测试解译` 中查看 CPT 曲线、SBT 图和分层结果。
- SBT12 是解释视图，不是项目总览或导出页。
- 图、曲线、分层参数需要共享同一个点位、同一次运行和同一个深度选择。

### 4.2 中间结果工作台 tab

推荐 tab 顺序：

```text
1. CPTU 曲线
2. SBT 12区图
3. 分层参数
4. 计算日志
```

暂不加入：

```text
参数解译
```

后续加入 `参数解译` 时，推荐位置：

```text
CPTU 曲线 -> SBT 12区图 -> 参数解译 -> 分层参数 -> 计算日志
```

原因：

- `CPTU 曲线` 是原始与当前解释曲线。
- `SBT 12区图` 是图上土体行为辅助判读。
- `参数解译` 是 φ、Su 等工程参数，应该在图上判读之后、分层表之前。
- `分层参数` 是汇总表。
- `计算日志` 是审计和异常信息。

### 4.3 SBT12 tab 详细布局

宽屏布局：

```text
┌──────────────────────────────────────────────────────────────┐
│ SBT 12区图                                                    │
│ 辅助判读，正式分类以 Ic 结果为准。                             │
├────────────────────────────────────┬─────────────────────────┤
│                                    │ 判读说明 / 图例           │
│   白底 SBT12 主图                   │ - 坐标说明               │
│   x: FR=fs/qt (%) 0-8              │ - 边界线来源             │
│   y: qt(bar) 1-1000 log            │ - 散点颜色含义           │
│   多色边界线                        │ - 超界/无效点            │
│   12 个区号                         │ - 砂/黏/过渡倾向         │
│   CPTU 散点                         │ - Ic 正式分类提示        │
└────────────────────────────────────┴─────────────────────────┘
```

中窄屏布局：

```text
┌──────────────────────────────────────────┐
│ SBT 12区图                                │
│ 辅助判读，正式分类以 Ic 结果为准。          │
├──────────────────────────────────────────┤
│ 白底 SBT12 主图                            │
├──────────────────────────────────────────┤
│ 判读说明 / 图例 / 统计                     │
└──────────────────────────────────────────┘
```

主图比例：

- 优先接近正方形。
- 推荐宽高比：`1.05:1` 到 `1.20:1`。
- 不允许为了填满横向空间把图拉成扁长图。
- y 轴是 log10，图太扁会让区边界和点云误读。

主图视觉层级：

1. 白色绘图区背景。
2. 浅色网格线。
3. 12区边界线，多色区分。
4. 区号标签。
5. CPTU 散点。
6. 选中深度范围高亮点。
7. 坐标轴标题和刻度。

### 4.4 SBT12 图例和说明

右侧说明面板分组：

```text
判读说明
SBT12 图用于辅助判断土体行为倾向；正式分类仍以首轮 Ic 结果为准。

坐标
FR = fs/qt (%)，线性坐标，范围 0-8。
qt 使用 bar，log10 坐标，范围 1-1000。

边界
曲线来自 Quyon Quebec CPTu Vs.xlsx 的 SBT sheet。

散点
低透明点为当前 CPTU 深度点。
深色描边点为当前左侧选中深度范围。

统计
有效点、超界点、无效点、砂性倾向、黏性倾向、过渡/混合倾向。
```

说明面板不要放大量公式推导。

原因：

- SBT12 图是图上辅助判读。
- 当前正式分类仍来自 Ic。
- 详细公式、来源和无效条件后续应进入方法说明或参数解译说明，不挤占图面。

### 4.5 右侧方法面板

当前单个 RadioButton：

```text
CPTU 首轮 Ic 分类（CPTU-RW-Ic-FirstPass）
```

改为轻量方法选择器。

建议控件：

```text
ComboBox
```

初始选项：

```text
首轮 Ic 分类法
Robertson SBT 12区图
```

选择器下方显示当前方法的性质：

| 方法 | 性质 | 是否落库 | 是否改变正式分类 |
| --- | --- | --- | --- |
| 首轮 Ic 分类法 | 计算方法 | 是 | 是，当前正式分类来源 |
| Robertson SBT 12区图 | 图上辅助判读 | 否 | 否 |

第一阶段的选择器不做多方法对比，不做导出切换，不新增 schema。

选择器行为：

- 选择 `首轮 Ic 分类法` 时，右侧显示 Ic 方法参数，CPTU 曲线和分层参数维持当前逻辑。
- 选择 `Robertson SBT 12区图` 时，右侧显示 SBT12 坐标、来源、限制说明；中间 tab 自动或建议切到 `SBT 12区图`。
- 运行按钮仍执行当前 Ic 首轮分类，除非后续引入真正可运行的新方法。

重要限制：

- 不要让用户误以为选择 SBT12 会重新计算并落库 SBT12 分类。
- 如果需要“运行 SBT12 区号分类”，必须单独设计落库、审计和导出逻辑。

## 5. 数据设计

### 5.1 方法目录

先做轻量方法目录，不做完整插件系统。

建议新增模型：

```text
InterpretationMethodDefinition
```

字段建议：

| 字段 | 用途 |
| --- | --- |
| `Id` | 稳定方法 ID，如 `CPTU-RW-Ic-FirstPass`、`Robertson-SBT12-Chart` |
| `DisplayName` | 中文显示名 |
| `ShortName` | 卡片或 tab 简写 |
| `Kind` | `Computation` 或 `ChartAuxiliary` |
| `IsPersistedResultSource` | 是否是正式落库分类来源 |
| `DefaultTabKey` | 推荐打开的结果 tab |
| `InputSummary` | 输入数据说明 |
| `OutputSummary` | 输出数据说明 |
| `Limitation` | 限制说明 |

建议新增服务：

```text
InterpretationMethodCatalog
```

职责：

- 返回当前支持的方法列表。
- 提供默认方法。
- 根据方法 ID 返回说明文本。
- 不直接做公式计算。
- 不直接写数据库。

### 5.2 SBT12 边界数据

建议新增：

```text
Sbt12ChartDefinition
Sbt12BoundarySeries
Sbt12BoundaryPoint
Sbt12ZoneLabel
```

数据来源：

- 从 `app_data/temp/excel-sbt/SBT_chart_series_cache.csv` 固化为源代码里的只读边界数据。
- 工作簿和 CSV 保留为证据，不作为运行时依赖。

原因：

- 企业和科研使用需要可复现。
- 如果运行时依赖 Excel 文件，文件缺失或路径变化会让图无法显示。
- 源代码中固化数据后，仍必须在注释或文档里记录原始 Excel 来源和抽取时间。

边界数据规则：

- 每条曲线保留 Excel 缓存点顺序。
- x 值单位是 `FR (%)`。
- y 值单位是 `qt (bar)`。
- 不对曲线做人工平滑。
- 绘图时用折线连接。
- 如需更平滑，只允许在后续切片中加入明确的插值策略和误差复查。

### 5.3 SBT12 散点数据

建议新增派生模型：

```text
Sbt12PlotPoint
```

字段建议：

| 字段 | 用途 |
| --- | --- |
| `DepthFromM` | 深度起点 |
| `DepthToM` | 深度终点 |
| `DepthMidM` | 高亮和 tooltip 使用 |
| `QtKpa` | 当前解释使用的 qt |
| `QtBar` | `QtKpa / 100` |
| `SleeveKpa` | fs |
| `FrictionRatioPercent` | `100 * SleeveKpa / QtKpa` |
| `Ic` | 当前正式 Ic 结果，仅用于提示 |
| `PersistedSoilType` | 当前正式土类，仅用于提示 |
| `ZoneId` | 可选，图上辅助区号 |
| `Validity` | `Valid`、`MissingQt`、`MissingFs`、`OutOfRange`、`InvalidValue` |

有效点条件：

```text
QtKpa > 0
SleeveKpa >= 0
0 <= FR <= 8
1 <= qt_bar <= 1000
```

无效或超界点处理：

- 缺失 qt：不绘制，计入无效点。
- 缺失 fs：不绘制，计入无效点。
- fs 为 0 且 qt 有效时：允许绘制在 x=0。
- fs < 0、FR < 0 或 qt <= 0：不绘制，计入无效点。
- FR > 8 或 qt_bar < 1 或 qt_bar > 1000：不绘制在标准图框内，计入超界点。

### 5.4 区号与倾向统计

SBT12 区号计算是图上辅助分类，不是当前正式分类。

推荐实现顺序：

1. 先画边界和散点。
2. 再根据边界曲线和坐标轴闭合出 12 个区域多边形。
3. 用 point-in-polygon 判断每个有效点落在哪个区。
4. 按用户确认的聚合规则计算倾向。

如果某个区无法从 Excel 曲线和图框可靠闭合：

- 不要猜。
- 该区统计标记为 `待确认`。
- 不要在 UI 中展示会造成误解的百分比。
- 在文档和 process log 中记录缺口。

第一版卡片建议：

| 卡片 | 文案 |
| --- | --- |
| 有效点 | 标准图框内可绘点 |
| 超界/无效 | 超出 SBT12 坐标范围或缺少 qt/fs |
| 砂性倾向 | SBT12 图上 7-11 区占比 |
| 黏性倾向 | SBT12 图上 1-3 区占比 |
| 过渡/混合 | SBT12 图上 4-6、12 区占比 |

禁止文案：

```text
正式土类已按 SBT12 更新
主导区号 = 正式分类
Robertson 分类已替代 Ic
```

## 6. 每一刀开发内容

### Slice 0：详细设计文档和冲突复查

目的：

- 把当前聊天确认内容转成可复查文档。
- 明确 SBT12 与 SBTn/Ic 的边界。
- 给每一刀写清楚动作、文件、验证和风险。

改动文件：

- `SBT12_实施设计说明.md`
- `plan.md`
- `process_logs/Process7.md`

具体动作：

1. 新增本文件。
2. 在 `plan.md` 中把本文件登记为当前 SBT12 设计依据。
3. 在 `Process7.md` 中记录本次文档切片。
4. 运行 `git diff --check`。
5. 发起独立复查，重点检查需求冲突和遗漏。

不做：

- 不改 UI。
- 不改 C# 逻辑。
- 不改 schema。
- 不运行 app 截图。

完成标准：

- 文档足以让同事知道后续每一刀做什么。
- 复查结论没有阻塞问题。
- 如有冲突，冲突被写入本文档或 plan/process log。

### Slice 1：通用方法骨架

目的：

- 先把“方法”从单个写死 RadioButton 中抽出来。
- 为后续 Ic、SBT12、φ、Su、其他经验方法接入留统一入口。

建议改动文件：

- `OffshoreGeotechWorkbench/Models/InterpretationMethodDefinition.cs`
- `OffshoreGeotechWorkbench/Services/InterpretationMethodCatalog.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- 相关 UIA 脚本，如果 AutomationId 改动

具体动作：

1. 新增方法定义模型。
2. 新增方法目录服务。
3. 注册两个初始方法：
   - `CPTU-RW-Ic-FirstPass`
   - `Robertson-SBT12-Chart`
4. 右侧 `解译方法` 面板由单个 RadioButton 改为 ComboBox。
5. 选择不同方法时，更新右侧说明文本。
6. 保持运行按钮仍执行当前 Ic 首轮分类。
7. 不改变数据库中的 `InterpretationRuns.MethodName`。
8. 不改变当前导出逻辑。

UI 细节：

- ComboBox header：`当前方法`
- 默认值：`首轮 Ic 分类法`
- 方法说明第一行必须说明是否落库。
- `Robertson SBT 12区图` 下必须显示 `辅助判读，正式分类以 Ic 结果为准。`

验证：

- `dotnet build`
- workflow check
- project-scope check
- 打开 `测试解译` 后确认右侧方法面板可见
- UIA 确认方法选择器存在且默认选中 Ic

审计重点：

- 方法选择器是否会误导用户以为 SBT12 已经可以正式运行。
- 是否引入 schema 或导出改动。
- 是否破坏当前 Ic 首轮分类运行。

### Slice 2：SBT12 边界图

目的：

- 替换当前 SBTn 图的图面骨架。
- 先只画标准 SBT12 背景、坐标轴、边界线、区号和图例。

建议改动文件：

- `OffshoreGeotechWorkbench/Models/Sbt12BoundaryPoint.cs`
- `OffshoreGeotechWorkbench/Models/Sbt12BoundarySeries.cs`
- `OffshoreGeotechWorkbench/Models/Sbt12ZoneLabel.cs`
- `OffshoreGeotechWorkbench/Services/Sbt12ChartDefinition.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- `tools/uiregression/capture_interpretation_fullscreen.ps1`
- 相关 UIA 脚本

具体动作：

1. 将 Excel 缓存曲线转成 `Sbt12ChartDefinition` 静态只读数据。
2. 将 tab header 从 `SBTn 图` 改为 `SBT 12区图`。
3. 将图标题改为 `SBT 12区图`。
4. 将 canvas AutomationName 改为 `FR-qt SBT12 判读图`。
5. 绘制白色绘图区。
6. 绘制 x 轴：
   - 0、1、2、3、4、5、6、7、8
   - 标题：`FR = fs/qt (%)`
7. 绘制 y 轴：
   - 1、10、100、1000
   - 标题：`qt (bar)`
   - y 使用 log10 映射
8. 绘制 SBT12 多色边界曲线。
9. 绘制 1-12 区号。
10. 右侧说明面板显示边界来源和坐标说明。

不做：

- 不叠加 CPTU 散点。
- 不做区号统计。
- 不做深度联动。
- 不做 DB 写入。

视觉细节：

- 背景白色，不做彩色区域填充。
- 网格线非常浅，只辅助读数。
- 边界线颜色要能互相区分，但不要过亮。
- 区号使用黑色或深灰，字号足够大。
- 左下角 Zone 1 的文字可用中文说明或保留简短英文原图含义，但 UI 主说明必须中文。

验证：

- `dotnet build`
- `git diff --check`
- 打开 app 到 `测试解译 -> SBT 12区图`
- 截图与 `app_data/temp/excel-sbt/SBT_chart_export.png` 对比
- 按 `FIXED_ROUTES.md` 捕获目标页物理 fullscreen 截图，并在 `Process7.md` 记录截图路径、物理分辨率、目标页和目标 tab
- UIA 确认 tab 名和 chart marker

审计重点：

- 是否仍被误标为 SBTn。
- x/y 坐标是否正确。
- y 轴是否真的按 log10 绘制。
- 边界是否来自 Excel 缓存，不是凭图手画。
- 图是否接近参考图，不是当前 Qtn-Fr 图的改名。

### Slice 3：SBT12 点云叠加

目的：

- 把当前 CPTU 结果点叠加到 SBT12 图上。
- 使用正确的 `FR=fs/qt` 和 `qt(bar)`。

建议改动文件：

- `OffshoreGeotechWorkbench/Models/Sbt12PlotPoint.cs`
- `OffshoreGeotechWorkbench/Models/CptuVisualizationSnapshot.cs`
- `OffshoreGeotechWorkbench/Services/CptuInterpretationService.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`

具体动作：

1. 从当前 visualization snapshot 派生 SBT12 点。
2. 使用 `InterpretedQtKpa` 作为 `qt` 的首选来源。
3. 使用 `SleeveKpa` 作为 `fs`。
4. 计算：
   - `SBT12_FR = 100 * SleeveKpa / InterpretedQtKpa`
   - `SBT12_qt_bar = InterpretedQtKpa / 100`
5. 缺失或无效点计入无效点。
6. 超出 `0-8` 或 `1-1000` 的点计入超界点。
7. 标准图框内点绘制为 Nature-like 低透明散点。
8. 散点不绑定点击选择事件。
9. 说明面板显示有效点、超界点、无效点。

散点建议色：

- 普通点：低透明蓝绿，例如 `#2A9D8F`，透明度约 0.55-0.70。
- 选中深度范围点：更深的蓝，例如 `#0072B2`，加描边。
- 无效点不绘制，只计数。

不做：

- 不显示主导区号。
- 不改变左侧分层表。
- 不改变当前 Ic 正式分类。
- 不导出 SBT12 点。

验证：

- `dotnet build`
- workflow check
- project-scope check
- SBT12 图截图
- 按 `FIXED_ROUTES.md` 捕获目标页物理 fullscreen 截图，并在 `Process7.md` 记录截图路径、物理分辨率、目标页和目标 tab
- 截图审计必须对比 `app_data/temp/excel-sbt/SBT_chart_export.png`
- 抽样检查若干点坐标换算：
  - `FR = 100 * fs / qt`
  - `qt_bar = qt_kPa / 100`

审计重点：

- 是否误用了当前 `FrPercent`。
- 是否把 qnet 或 Qtn 画到了 SBT12 坐标里。
- 无效点和超界点是否有清晰计数。
- 散点颜色是否与边界线区分清楚。

### Slice 4：统计卡片和单向高亮

目的：

- 让 SBT12 tab 具备企业/科研可读的结果摘要。
- 实现用户要求的单向联动：左侧深度/分层选择 -> 图上对应点高亮。

建议改动文件：

- `OffshoreGeotechWorkbench/Models/Sbt12ZonePolygon.cs`
- `OffshoreGeotechWorkbench/Models/Sbt12TendencyStatistics.cs`
- `OffshoreGeotechWorkbench/Services/Sbt12ZoneClassifier.cs`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/InterpretationPage.xaml.cs`
- UIA 脚本

具体动作：

1. 根据 SBT12 边界线和图框定义 12 个区的可复查多边形。
2. 用 point-in-polygon 给有效点计算辅助 `ZoneId`。
3. 按聚合规则计算：
   - 砂性倾向
   - 黏性倾向
   - 过渡/混合倾向
4. 顶部或图右侧卡片显示倾向统计。
5. 当前左侧深度/分层选择改变时，重新渲染或更新 SBT12 点高亮。
6. 删除或禁用散点点击反向选择深度层的逻辑。
7. 说明文案固定强调：`SBT12 图用于辅助判断土体行为倾向；正式分类仍以首轮 Ic 结果为准。`

卡片布局建议：

```text
┌────────┬────────┬────────┬────────┬────────┐
│ 有效点 │ 超界/无效 │ 砂性倾向 │ 黏性倾向 │ 过渡/混合 │
└────────┴────────┴────────┴────────┴────────┘
```

如果宽度不足：

- 卡片换成两行。
- 不压缩到文字重叠。
- 允许右侧说明面板向下移动。

不做：

- 不把 SBT12 区号写入 `InterpretationResults`。
- 不修改导出表头。
- 不做多方法对比。

验证：

- `dotnet build`
- workflow check
- project-scope check
- `check_interpretation_layer_linkage.ps1` 更新后确认：
  - 选择左侧深度/分层后 SBT12 点高亮
  - 点击散点不会改变左侧选中行
- 宽/中/窄截图
- 每张截图都要记录路径、物理分辨率或目标视口、目标页和目标 tab
- 视觉审计必须确认卡片文字不重叠、SBT12 图仍为主视觉、散点点击没有反向联动提示

审计重点：

- 单向联动是否符合用户要求。
- 是否还残留散点点击反向联动。
- 统计卡片是否把辅助倾向说成正式分类。
- 区号聚合是否有待确认标注。

### Slice 5：SBT12 close-out 和文档固化

目的：

- 完成 SBT12 图当前阶段闭环。
- 让后续开发者知道源数据、坐标、限制、验证证据在哪里。

建议改动文件：

- `plan.md`
- `Process.md`
- `process_logs/Process7.md`
- `SBT12_实施设计说明.md`
- 必要时更新 `FIXED_ROUTES.md` 中 UIA 或截图脚本路径

具体动作：

1. 更新 `plan.md` 的当前活动阶段。
2. 记录已实现范围和未实现范围。
3. 记录 Excel 来源、曲线缓存、截图路径。
4. 记录 SBT12 坐标定义。
5. 记录 SBT12 与 Ic 正式分类的关系。
6. 记录区号倾向聚合规则和复查状态。
7. 运行完整验证。
8. 发起截图对比审计。
9. 修复审计阻塞项。

验证：

- `dotnet build`
- workflow check
- project-scope check
- SBT12 tab UIA
- layer linkage UIA
- resize reachability
- physical fullscreen screenshot
- `git diff --check`

审计重点：

- 图是否像 Excel SBT12 参考图。
- 是否仍混入 SBTn 9区或 Qtn-Fr 文案。
- 是否清楚区分辅助判读和正式 Ic 分类。
- 是否有截图证据。
- 是否有过程日志。

### Slice 6：后续参数解译设计

本刀不在当前 SBT12 实施范围内，但需要预留。

目标：

- 增加 `参数解译` tab。
- 显示深度方向曲线：
  - `φ`
  - `Su`

开发前必须确认：

1. 使用哪些公式。
2. 公式来源。
3. 输入单位。
4. 适用土类或适用区间。
5. 无效条件。
6. 结果是否落库。
7. 是否导出。
8. 如何在图上提示“不适用”或“缺数据”。

推荐布局：

```text
┌──────────────────────────────────────────────┐
│ 参数解译                                      │
│ 当前参数来自已确认公式；不适用区间以空缺显示。 │
├───────────────────┬──────────────────────────┤
│ φ 曲线             │ Su 曲线                   │
│ 深度轴共享          │ 深度轴共享                 │
├───────────────────┴──────────────────────────┤
│ 参数说明 / 公式来源 / 无效点统计              │
└──────────────────────────────────────────────┘
```

不得先做空 tab。

## 7. 响应式和可访问性要求

### 7.1 宽度断点

推荐断点：

| 宽度 | 行为 |
| --- | --- |
| `>= 1600` | 左栏、中间、右栏三列；SBT12 图和说明左右并排 |
| `1200-1599` | 保持三列但压缩右栏；SBT12 说明可变窄 |
| `820-1199` | 页面局部重排；SBT12 图在上，说明在下 |
| `< 820` | 单列优先；保留图、关键统计和方法说明，隐藏非关键长文 |

### 7.2 滚动归属

- 页面已有主 ScrollViewer。
- SBT12 canvas 不应自己拥有垂直滚动。
- 说明面板内容过长时，可以跟随页面滚动，不在面板里再套复杂滚动。
- 表格仍按现有 ListView 处理，但不要让 SBT12 图内部出现嵌套滚动冲突。

### 7.3 键盘和自动化

必须新增或保留稳定 ASCII AutomationId：

| 元素 | 建议 AutomationId |
| --- | --- |
| 方法选择器 | `InterpretationMethodSelector` |
| SBT12 tab | `ResultTabSbt12` |
| SBT12 panel | `Sbt12ChartPanel` |
| SBT12 marker | `Sbt12ChartPanelMarker` |
| SBT12 canvas | `Sbt12ChartCanvas` |
| SBT12 info panel | `Sbt12InfoPanel` |
| SBT12 stats panel | `Sbt12StatsPanel` |

UI 可见文字可以中文；自动化选择器尽量 ASCII。

## 8. 同事复查清单

### 8.1 需求一致性

- [ ] 是否明确当前目标是 SBT12，而不是 SBTn 9区。
- [ ] 是否明确 SBT12 来源是 Excel `SBT` sheet。
- [ ] 是否明确当前 Ic 首轮分类仍是正式落库分类。
- [ ] 是否明确 SBT12 不改变导出和数据库。
- [ ] 是否明确不新增空的 `参数解译` tab。

### 8.2 坐标和数据

- [ ] 是否没有误用现有 `FrPercent`。
- [ ] 是否使用 `FR=fs/qt (%)`。
- [ ] 是否使用 `qt(bar)=qt(kPa)/100`。
- [ ] x 轴是否线性 `0-8`。
- [ ] y 轴是否 log10 `1-1000`。
- [ ] 无效点和超界点是否有统计。

### 8.3 UI 和交互

- [ ] SBT12 图是否白底。
- [ ] 边界线是否多色且可区分。
- [ ] 散点是否 Nature-like 且不抢过边界线。
- [ ] 左侧深度/分层选择是否能高亮图上对应点。
- [ ] 点击散点是否不会反向改变左侧深度/分层。
- [ ] 方法选择器是否不会误导用户以为 SBT12 已落库。

### 8.4 统计和文案

- [ ] 是否不再展示“主导区号”作为核心结论。
- [ ] 是否使用 `砂性倾向/黏性倾向/过渡混合倾向`。
- [ ] 是否显示 `SBT12 图用于辅助判断土体行为倾向；正式分类仍以首轮 Ic 结果为准。`
- [ ] 是否避免了 `按 SBT12 图区号聚合的图上倾向，未替代正式 Ic 分类` 这种生硬说法。

### 8.5 与旧计划冲突

- [ ] `plan.md` 中 SBTn v5 是否保持暂停历史方向。
- [ ] 新实现是否没有继续审计 SBTn 9区参考图。
- [ ] 新截图审计是否对比 Excel SBT12 参考图。
- [ ] 新 UIA 是否使用 SBT12 AutomationId，不再依赖 SBTn 文案。

## 9. 已识别冲突与处理决定

| 冲突 | 级别 | 处理决定 |
| --- | --- | --- |
| 当前 plan 仍有大量 SBTn v5 历史内容 | 中 | 保留为暂停历史方向，新文档和 section 7/后续 SBT12 section 为当前依据 |
| 当前 UI tab 叫 `SBTn 图` | 高 | Slice 2 改为 `SBT 12区图` |
| 当前绘图坐标是 `Qtn-Fr` | 高 | Slice 2/3 改为 `FR-qt` |
| 当前 `FrPercent` 定义不等于 SBT12 FR | 高 | Slice 3 新增独立派生值，禁止复用 |
| 当前散点点击会反向联动深度层 | 高 | Slice 4 移除该方向，只保留深度层到点高亮 |
| 当前方法面板是单一 RadioButton | 中 | Slice 1 改为方法选择器 |
| 用户希望后续参数解译，但当前还没公式设计 | 中 | 当前不做空 tab，后续单独 Slice 6 |
| SBT12 区号聚合需要严谨依据 | 中 | 当前作为用户确认的辅助倾向聚合；正式报告/导出前再次复查 |
| 白色 SBT 图背景与主题适配可能冲突 | 低 | 图表绘图区白底是参考图要求；页面外层仍使用项目主题资源 |

## 10. 本阶段禁止事项

本阶段禁止做以下事情：

- 把当前图简单改名为 SBT12。
- 用 Qtn-Fr 继续冒充 SBT12。
- 用当前 `FrPercent` 冒充 `FR=fs/qt`。
- 把 SBT12 辅助区号写进正式分类字段。
- 把 SBT12 统计导出为正式报告结论。
- 同时重做 SBTn 9区。
- 同时加入 φ/Su 空 tab。
- 同时做 DXF、PDF、PNG 导出。
- 同时做 SPT N 值或基础设计模块。

## 11. 推荐下一步

最小序列从 Slice 1 开始；当前 Slice 1-5 已完成，下一步进入 Slice 6 参数解译后续设计。

原因：

- SBT12 当前阶段已经完成方法骨架、边界图、点云叠加、统计卡片、单向高亮和 close-out。
- 后续用户明确需要参数解译，但必须先确认 `φ` 和 `Su` 的公式来源、单位、适用条件、无效条件、是否落库、是否导出和审计方式。
- 不应在公式与验证路线未确认前新增空的 `参数解译` tab。

当前下一步：

```text
Slice 6 参数解译后续设计
```

最小可验收顺序：

```text
Slice 1 方法骨架
-> Slice 2 SBT12 边界图
-> Slice 3 点云叠加
-> Slice 4 统计卡片和单向高亮
-> Slice 5 close-out
-> Slice 6 参数解译后续设计
```

当前阶段完成状态：

```text
Slice 1 方法骨架：已完成
Slice 2 SBT12 边界图：已完成
Slice 3 点云叠加：已完成
Slice 4A 统计卡片和单向高亮：已完成
Slice 5 close-out：已完成
Slice 6 参数解译后续设计：待后续单独启动
```

Slice 5 收口必须确认：

- SBT12 图仍是 Excel-backed `FR-qt` 辅助判读图，不是 SBTn 9区图。
- SBT12 点坐标使用 `FR = 100 * fs / qt (%)` 与 `qtBar = qt(kPa) / 100`，不复用 Ic 分类中的 `FrPercent`、`Qtn` 或 `qnet`。
- 正式落库分类仍为 `CPTU-RW-Ic-FirstPass`，SBT12 不写入数据库、不改变导出。
- 当前倾向卡片保持 `待复核`，原因是 Excel 缓存提供边界曲线和区号标签，但没有完成可审计闭合区多边形。
- 物理全屏截图、Excel 参考图、UIA 验证、workflow、project-scope、审计结论和剩余风险都要记录到 `process_logs/Process7.md`。
