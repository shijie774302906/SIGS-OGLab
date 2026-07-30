# 05 地层分层默认页 Planning Gate

日期：2026-07-08

状态：`planning/function/layout gate draft`

本文件只用于进入 `05 地层分层默认页` 的单页设计循环。它不是 Figma 验收记录，不是开发 handoff，也不允许直接作为 WinUI 实现依据。

## 1. 本轮对象

本轮只处理：

```text
05 地层分层默认页
```

本轮不处理：

- `05B 地层分层方法选择器`
- `05A 地层分层对比/详情态`
- `06 参数解译默认页`
- `06A 参数方法选择器`
- `07 成果输出`
- `02 项目/点位数据`
- `08 方法实验室`
- `09 研究模式`
- `10 全局状态集`

`05B` 只能作为 `运行分层` 的目标弹窗/抽屉被引用，不能在本轮绘制或细化。

## 2. 用户问题

地层分层默认页必须让工程/科研用户在 10 秒内回答：

- 当前点位是否已有分层方案？
- 当前正在看的方案是什么状态：候选、草稿、已采纳、只读历史，还是无效？
- 层位、边界、土类、来源和不确定性在哪里？
- 哪些边界或层位需要复核？
- 当前方案能不能成为参数解译的输入？
- 下一步是运行分层、保存草稿、采纳为当前分层、用于参数试算，还是进入正式参数解译？

默认页的重点是消费和复核 `LayerScheme` 与 `ClassificationEvidence`，不是展示方法注册、运行器、内部日志或研究调试结果。

## 3. 输入、结果与数据对象

| 类型 | 本页使用方式 | 默认显示要求 |
| --- | --- | --- |
| 当前工程 | 从全局 shell / Explorer / Status Bar 继承 | 不在页面内重复做项目大标题 |
| 当前点位 | 顶部工具行、状态栏、右侧面板 | 必须清楚显示点位名和数据状态 |
| 数据检查状态 | 进入本页前置质量门 | 有阻塞时显示阻断并引导回 `数据检查` |
| `LayerScheme` 分层方案 | 本页主结果 | 方案列表、曲线区 layer track、分层表、右侧详情 |
| `ClassificationEvidence` 分类证据 | 分层判断证据 | 作为中央次级证据或底部/局部 Tab，不抢占主视图 |
| `MethodRun` 方法运行记录 | 只作为底部日志/记录 | 默认不显示长日志和内部 token |
| `AdoptedScheme` 已采纳方案 | 正式链路输入 | 采纳状态必须醒目，且只能有一个当前正式分层输入 |

## 4. 页面职责

本页负责：

- 显示当前点位的分层方案列表。
- 显示当前方案的曲线剖面、分层轨道、SBT/分类证据和分层表。
- 支持选择方案、选择层、选择边界，并同步右侧详情。
- 支持运行分层入口，但实际方法选择归 `05B`。
- 支持保存草稿、采纳为当前分层、用于参数试算；已采纳方案必须提供正式 `进入参数解译`。
- 支持底部方法对比摘要，但默认不进入研究模式。

本页不负责：

- 管理方法安装、方法注册、runner 路径或插件市场。
- 展示 pyCPT、Groundhog 等单一方法的独立主页面。
- 正式参数解译配置和运行。
- 成果包生成。
- 编辑原始 CPTU 数据。
- 用长说明解释产品流程。

## 5. VSCode-like 壳层继承

本页必须复制已验收工作台壳层，不得重新手绘相似壳层。

| 区域 | 继承规则 | 05 页面替换内容 |
| --- | --- | --- |
| `WorkbenchTopChrome` | 继承 `01 Workbench shell` 节点 `1:408` | 只更新当前路径/命令上下文 |
| `ActivityBar` | 保持深色 Activity Bar | Explorer 仍为选中态 |
| `ExplorerPane` | 保持工程流程树 | `地层分层` 叶节点选中 |
| `Tabs` | 保持 36px Tab strip | 激活 Tab 为 `地层分层` |
| `EditorArea` | 保持 x348 y72 w1252 h794 主工作区 | 替换为地层分层主内容 |
| `RightPanel` | 保持 x1600 y36 w320 h1020 | 替换为方案/层位/边界详情 |
| `BottomPanel` | 保持 x348 y866 w1252 h190 | 替换为 `问题 / 方法对比 / 运行记录 / 采纳记录` |
| `StatusBar` | 保持 `#007ACC` 蓝色状态栏 | 当前文档显示 `地层分层`，当前点位同步 |

对照证据：

- `01 Workbench shell`：Figma 节点 `1:408`，截图 `app_data/temp/figma-01-workbench-shell-after-fix.png`。
- `03 数据导入`：Figma 节点 `20:2`，截图 `app_data/temp/figma-03-data-import-v5-reviewed-fixed.png`。
- `04 数据检查`：Figma 节点 `37:2`，截图 `app_data/temp/figma-04-data-check-main.png`。

## 6. 05 默认页布局

页面内部保持紧凑工程工具密度。

```text
EditorArea
  Top command row
    当前点位 | 当前方案 | 方案状态 | 数据状态 | 运行分层 | 保存草稿 | 采纳为当前分层 | 用于参数试算 / 进入参数解译

  Body
    Left local rail: EditorArea 内部分层方案列表，不替代全局 Explorer
    Center main evidence:
      上：CPT/CPTU 曲线剖面 + layer track
      中：分层表/层位表
      下：SBT/分类证据摘要或局部 Tab

Shell RightPanel
    当前方案详情 / 当前层位详情 / 当前边界详情

Shell BottomPanel
    问题 | 方法对比 | 运行记录 | 采纳记录
```

`RightPanel` 和 `BottomPanel` 是继承的全局 shell 区域，只替换内容，不允许在 05 页内重新布局。

内部网格建议：

| 区域 | 建议尺寸/比例 | 约束 |
| --- | --- | --- |
| 顶部工具行 | 40-44 px 高 | 只放状态和主动作，不放长说明 |
| 左侧局部分层方案列表 | 220-260 px 宽 | 位于 EditorArea 内，和全局 Explorer 分离 |
| 中央曲线 + layer track | 中央宽度剩余区域，默认不少于 420 px 高 | 首屏主证据；无真实数据时显示缺数据状态 |
| 分层表 | 默认 160-220 px 高，至少露出 5-7 行 | 位于 SBT 之前，保证用户先看到分层结果 |
| SBT/分类证据 | 120-180 px 高或局部 Tab 摘要 | 作为证据补充，不抢主结果 |
| BottomPanel | 无 blocking 时默认折叠摘要；有 blocking 或用户展开时使用 shell 的 190 px 区域 | 不替代 StatusBar，不显示长日志 |

### 6.1 顶部工具行

必须显示：

- 当前点位：例如 `CPT09`。
- 当前方案：例如 `首轮 Ic 分层法 / 草稿`。
- 数据状态：例如 `数据检查通过`、`有警告可继续`、`阻塞`。
- 主动作：
  - `运行分层`
  - `保存草稿`
  - `采纳为当前分层`
  - `用于参数试算`：只用于候选/草稿/未采纳方案。
  - `进入参数解译`：只用于已采纳方案，表示进入正式参数解译输入链路。

工具行不放长说明，不放方法实验室入口，不放研究模式入口。

顶部必须按当前方案状态给唯一主动作：

| 当前方案状态 | 唯一主动作 | 次要动作 |
| --- | --- | --- |
| 无方案 | `运行分层` | 返回数据检查 |
| 候选 | `采纳为当前分层` | 保存草稿、用于参数试算 |
| 草稿 | `采纳为当前分层` | 用于参数试算 |
| 已采纳 | `进入参数解译` | 运行分层、方法对比 |
| 只读历史 | 无主写入动作 | 查看、对比 |
| 无效 | `查看问题` 或 `重新运行分层` | 无 |

### 6.2 左侧局部分层方案列表

列表显示同一点位的方案：

- 已采纳方案
- 草稿方案
- 候选方案
- 只读历史方案
- 无效方案

每行至少包含：

- 方案名
- 状态短标
- 来源短标
- 层数
- 最近更新时间或运行时间

选中方案后刷新中央曲线、分层表和右侧详情。

### 6.3 中央主证据区

主证据区优先级：

1. CPT/CPTU 曲线剖面
2. layer track
3. 分层表/层位表
4. SBT/分类证据摘要

曲线区必须满足：

- 深度向下增加。
- 分轨显示 qc / fs / u2 / Ic 或当前可用通道。
- 当前层位与边界能在 layer track 中读出。
- 当前选中层/边界有可见高亮。
- 没有真实曲线数据时，不能画假曲线；显示缺数据状态和下一步。

SBT/分类证据默认是证据区的一部分，不作为独立主流程页。可用局部 Tab 或摘要区显示：

- SBT 图
- Ic/SBTn 分类轨道
- 分类点云
- 证据摘要

### 6.4 分层表

表格列建议：

| 列 | 说明 |
| --- | --- |
| 层号 | 稳定编号 |
| 深度范围 | m，起止深度 |
| 厚度 | m |
| 土类 | 用户可见土类 |
| 来源 | 方法/人工/历史 |
| 边界类型 | 突变、渐变、不确定、人工 |
| 置信度 | 有来源才显示；无来源显示 `未评估` |
| 状态 | 正常、需复核、无效 |

表格点击一行后同步：

- layer track 当前层高亮
- 右侧 `当前层位详情`
- Status Bar 当前层位短状态

### 6.5 右侧详情面板

右侧面板只放上下文，不写长说明。

三种详情态：

| 详情态 | 触发 | 必须显示 |
| --- | --- | --- |
| 当前方案详情 | 选中方案但未选中层/边界 | 方案状态、来源、层数、可否采纳、可否试算、限制 |
| 当前层位详情 | 点击 layer track 或表格层行 | 层号、深度、土类、厚度、来源、置信度、建议动作 |
| 当前边界详情 | 点击边界 | 边界深度、边界类型、证据、是否需复核、影响 |

禁止在右侧默认显示 runner、registry、draft package、内部路径、stdout/stderr、长 JSON。

### 6.6 底部面板

底部默认优先显示 `问题` 或折叠摘要。可用 Tab：

| Tab | 默认用途 | 规则 |
| --- | --- | --- |
| 问题 | 当前方案阻断、缺数据、边界需复核 | 有 blocking 时可自动展开 |
| 方法对比 | 当前点位少量方案差异摘要 | 不直接写成果，不替代 05A |
| 运行记录 | 最近分层运行摘要 | 不显示内部长日志，长日志需主动展开 |
| 采纳记录 | 采纳/替换历史 | 只显示用户可读记录 |

## 7. 入口闭环表

| 入口 | 状态分类 | 目标落点 | 启用条件 | 失败/禁用状态 | 写入对象 |
| --- | --- | --- | --- | --- | --- |
| `运行分层` | 已有雏形/需重排 | `05B 地层分层方法选择器`；若只有一个默认可用方法，可直接运行 | 当前点位有可用 CPT/CPTU 数据，数据检查无阻塞 | 无数据、数据检查阻塞、无可用方法、运行中 | 成功后生成候选 `LayerScheme`，不覆盖已采纳 |
| `保存草稿` | 核心拟做 | 当前页保存动作 | 当前方案为候选或可编辑草稿，且没有无效输入 | 只读历史、无效方案、只读工程、运行中 | 写入草稿 `LayerScheme`，不成为正式参数输入 |
| `采纳为当前分层` | 核心拟做 | 当前页确认弹窗 | 当前方案为候选或草稿，且方案有效 | 无效方案、只读历史、数据阻塞、只读工程 | 写入当前已采纳 `LayerScheme`，成为参数解译默认输入 |
| `用于参数试算` | 核心拟做 | 打开 `06 参数解译` 试算态 | 当前方案有效，但可未采纳 | 无方案、无效方案、数据阻塞 | 不改正式分层，只传入试算上下文 |
| `进入参数解译` | 核心拟做 | 打开 `06 参数解译` 正式输入态 | 当前方案为已采纳、数据无阻塞、参数页可消费该方案 | 无已采纳方案、方案无效、只读投影不可正式写入 | 不在 05 写参数结果，只把已采纳分层作为正式输入 |
| `方法对比/查看差异` | 已有方向/需重排 | 底部 `方法对比`；必要时后续进入 `05A` | 同一点位至少两个可比较方案 | 只有一个方案、无方案、候选缺证据 | 不写正式对象，只辅助复核 |
| `选择分层方案` | 当前页交互 | 左侧方案列表 | 有一个以上方案 | 无方案时显示空状态 | 不写对象，只改变当前查看方案 |
| `点击层位` | 当前页交互 | 表格、layer track、右侧详情同步 | 当前方案有层位 | 无层位或方案无效 | 不写对象 |
| `点击边界` | 当前页交互 | layer track、右侧边界详情同步 | 当前方案有边界 | 无边界证据 | 不写对象 |

## 8. 状态覆盖

| 状态 | 默认显示 | 主动作 | 禁止内容 |
| --- | --- | --- | --- |
| 无数据 | `当前点位还没有可用于分层的数据` | `进入数据导入` 或 `进入数据检查` | 空曲线、假 layer track |
| 数据未检查 | 顶部显示 `请先完成数据检查`，中央保留空状态或上次只读结果 | `进入数据检查` | 直接运行分层 |
| 数据检查通过 | 顶部显示 `数据检查通过`，允许查看/运行/采纳符合条件的方案 | 由当前方案状态决定 | 继续显示质量门说明大段文本 |
| 警告可继续 | 顶部显示 `有警告，可继续分层`，底部问题保留警告摘要 | 由当前方案状态决定 | 把警告当阻塞或隐藏警告 |
| 数据检查阻塞 | 顶部阻断摘要，底部问题展开 | `查看数据检查问题` | 允许运行分层 |
| 无分层方案 | 中央空状态 + 方法入口 | `运行分层方法` | 空表格和长说明 |
| 候选方案 | 曲线/层位可看，状态为 `候选` | `保存草稿`、`采纳为当前分层`、`用于参数试算` | 当作正式成果 |
| 草稿方案 | 曲线/层位可看，状态为 `草稿` | `采纳为当前分层`、`用于参数试算` | 默认进入成果输出 |
| 已采纳方案 | 状态醒目，作为正式参数输入 | `进入参数解译` | 只提供试算入口而不提供正式下一步 |
| 只读历史 | 可看、可对比 | `复制为草稿` 可作为未来能力；本轮默认不显示 | 允许直接保存覆盖 |
| 无效方案 | 显示失效原因 | `重新运行分层` 或 `查看问题` | 采纳、试算、输出 |
| 运行中 | 保留上次结果，显示运行状态 | 可取消或等待，按当前实现能力决定 | 清空上次结果 |
| 运行失败 | 保留上次结果，显示失败原因 | `重试`、`查看运行记录` | 用失败结果覆盖正式方案 |
| 只读工程 | 写入动作禁用 | 查看、对比 | 保存、采纳、运行写入 |

## 9. 默认文案边界

允许默认显示：

- 当前点位、当前方案、状态、层数、深度范围。
- 分层结果、层位表、分类证据摘要。
- 复核提示、阻断原因、下一步动作。

默认不显示：

- runner
- registry
- draft package
- projection safety
- stdout / stderr
- fixture
- local QA
- 内部文件路径
- 长 JSON 或 Markdown 源文
- pyCPT/Groundhog 等方法名堆叠成主页面导航

## 10. 05 与其他页面的边界

| 目标 | 本页处理 | 不在本页处理 |
| --- | --- | --- |
| 地层结果消费 | 显示当前点位方案、曲线、layer track、层表、证据 | 方法注册、方法安装 |
| 方法选择 | 只提供 `运行分层` 入口 | `05B` 细节本轮不画 |
| 方法对比 | 底部摘要 | `05A` 多方案详情本轮不画 |
| 参数解译 | `用于参数试算` 和 `进入参数解译` 入口 | 参数项、参数方法、参数曲线本轮不画 |
| 成果输出 | 标记是否可作为输入 | 不生成成果包 |

## 11. 当前 WinUI 能力映射

本节用于防止后续开发 handoff 误把目标能力写成当前已实现能力。

| 能力 | 当前代码状态 | 05 设计表达 |
| --- | --- | --- |
| 路由 | `stratification` 已映射到 `StratificationPage`；历史 `interpretation` route 仍有兼容痕迹 | 用户可见名称必须是 `地层分层` |
| 分层读取 | `StratificationProjectionReadService` 可读取当前点位的只读投影 | 可展示结果，但不能假装已完成正式采纳写入 |
| 写入边界 | `ProjectionOnly=true`，`OfficialWriteAllowed=false` | 保存草稿/采纳在设计上是目标能力；当前实现切片若未补写入，必须禁用或显示只读原因 |
| 参数消费 | `ParameterSchemeProjectionReadService` 可消费只读分层投影生成参数页预览 | 可试算；正式参数输入必须等已采纳 `LayerScheme` 写入能力落地 |
| 方法能力 | `MethodCapabilityInventoryService` 可提供能力目录 | 默认页只显示结果入口，不展示方法注册表 |
| 采纳预检 | 当前存在 dry-run / preflight 语义，正式 adopted 写入仍不可用 | 可以显示采纳预检，但不能显示“已正式保存” |

后续 development handoff 必须复用或兼容：

- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml`
- `OffshoreGeotechWorkbench/Pages/StratificationPage.xaml.cs`
- `OffshoreGeotechWorkbench/Services/StratificationProjectionReadService.cs`
- `OffshoreGeotechWorkbench/Models/StratificationProjectionModels.cs`
- `OffshoreGeotechWorkbench/Services/ParameterSchemeProjectionReadService.cs`
- `OffshoreGeotechWorkbench/Services/MethodCapabilityInventoryService.cs`
- `MainPage.xaml.cs` 中的 `stratification` route 和历史 route 兼容逻辑

不得为了 05 重新造一套分层读取、方法目录或参数试算服务。

## 12. 可测试谓词

后续 Figma handoff 和 WinUI 实现必须把状态写成可测试谓词，不只写自然语言。

| 谓词 | 来源/判定 | UI 影响 |
| --- | --- | --- |
| `HasPointData` | 当前点位存在 CPT/CPTU 可用记录 | 否则显示无数据 |
| `DataCheckNotRun` | 当前点位或项目缺少可用数据检查结果 | 禁用运行分层，引导数据检查 |
| `DataHasBlockingIssue` | 数据检查存在 error/blocking 级别问题 | 禁用运行、保存、采纳、试算、正式进入参数 |
| `DataWarningOnly` | 无 blocking，但存在 warning | 允许继续，底部保留警告摘要 |
| `SelectedSchemeExists` | 左侧方案列表有当前选中方案 | 否则显示无方案状态 |
| `SelectedSchemeValid` | 方案有层位且未标记无效 | 否则禁止采纳和试算 |
| `SelectedSchemeCandidateOrDraft` | 当前方案状态为候选或草稿 | 允许保存草稿、采纳、试算 |
| `SelectedSchemeAdopted` | 当前方案状态为已采纳 | 显示 `进入参数解译` 主动作 |
| `IsProjectionOnly` | `ProjectionOnly=true` 或 source official write disabled | 禁止正式写入，只允许只读查看/试算 |
| `CanTrialParameters` | 方案有效且数据无阻塞 | 允许 `用于参数试算` |
| `CanEnterOfficialParameters` | 已采纳、非只读投影、参数页可消费正式输入 | 允许 `进入参数解译` |
| `IsReadOnlyProject` | 当前工程不可写 | 禁用保存、采纳、运行写入 |
| `IsRunning` | 分层方法正在运行 | 禁用会造成冲突的动作 |

## 13. Figma 绘制前自检清单

绘制 `05` 真实 UI 前必须逐项确认：

- 是否复制 `01 Workbench shell` 或已验收同类页壳层，而不是重新手绘。
- Explorer 中 `地层分层` 是否选中。
- Tab 中 `地层分层` 是否激活。
- Status Bar 当前文档是否为 `地层分层`。
- 默认屏幕是否先显示分层结果、方案状态和下一步。
- 中央主区域是否以曲线、layer track、分层表为主，而不是说明文字。
- SBT/分类证据是否作为证据，不抢主流程。
- 所有可见入口是否在第 7 节有落点、启用条件、失败态和写入对象。
- 右侧是否是紧凑属性面板，不是帮助文档。
- 底部是否是工具面板，不是内部开发日志。
- 用户可见文案是否中文。
- 是否没有把 08/09/10 或方法实验室默认塞进主流程。
- 已采纳方案是否显示 `进入参数解译`，而不是只显示 `用于参数试算`。
- 候选/草稿是否才显示 `用于参数试算`。
- `数据未检查 / 检查通过 / 警告可继续 / 阻塞` 是否有明确顶部状态和主动作。
- SBT/分类证据是否位于分层表之后或作为次级证据摘要。

## 14. 验证路径

设计阶段预期证据：

| 证据 | 要求 |
| --- | --- |
| Figma 节点 | 待创建，命名建议 `05 地层分层默认页 - reviewed` |
| 主图截图 | `app_data/temp/figma-05-stratification-default-reviewed.png` |
| 分辨率 | `1920 x 1080` full frame |
| 文档校验 | `git diff --check -- docs/ui-05-stratification-default-planning-gate.md plan.md Process.md process_logs/Process81.md` |

后续 WinUI 实现阶段预期证据：

| 证据 | 要求 |
| --- | --- |
| local QA | `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\local-qa\run-local-quality-gate.ps1 -CaptureScreen` |
| 截图 | 1920x1080 full physical screenshot，显示 `地层分层` 页 |
| UIA/AutomationId | `WorkbenchExplorerNode_Stratification`、`WorkbenchDocumentTab_Stratification`、`WorkbenchStatusBar` |
| 05 页面目标控件 | 后续 handoff 应稳定定义 `StratificationLayerSchemeList`、`StratificationLayerTrack`、`StratificationLayerTable`、`StratificationEvidenceSummary`、`StratificationAdoptEntry`、`StratificationEnterParametersEntry` |

## 15. Reviewer 分工

| 角色 | Owner | 初审结论 | 审查重点 |
| --- | --- | --- | --- |
| Planning agent | Parfit | risk | 页面目标、范围、入口闭环、状态覆盖是否完整 |
| UI/layout agent | Lagrange | risk | VSCode-like 壳层继承、密度、对齐、主证据可读性 |
| Chinese user critique agent | Erdos | blocked | 中文工程用户是否能直接看到分层结果、状态和下一步 |
| Implementation/QA agent | Dirac | risk | 是否夸大当前能力、是否有可验证路径、是否会误导 WinUI 实现 |
| Integration owner | main agent | in progress | 汇总 blocking/risk，决定是否进入 Figma 绘制 |

## 16. Blocking 条件

出现以下任一情况，本页不得进入 Figma 绘制或下一页：

- 没有证明继承 `01/03/04` 已验收壳层。
- 默认屏幕看不到分层结果、方案状态或下一步。
- `运行分层`、`保存草稿`、`采纳为当前分层`、`用于参数试算`、`进入参数解译` 任一入口没有目标落点、失败态或写入边界。
- 无数据或数据阻塞时仍画出假曲线、假分层或可运行状态。
- 方法实验室、研究模式、runner、registry、draft package 抢占默认页。
- SBT 图被设计成独立主流程，而不是分层证据。
- 右侧或底部出现大段解释、内部日志或开发记录。
- 已采纳方案只提供 `用于参数试算`，没有正式 `进入参数解译` 下一步。
- 当前实现仍是只读投影时，开发 handoff 却写成正式保存/采纳已可落地。
- 审阅 agent 不可用且仍试图写 `pass` 或开发 handoff。

## 17. Risk 条件

以下问题可记录为 risk，但必须说明是否能继续：

- 已有草稿节点 `52:137` 有可保留的业务素材，但壳层不确定。
- 当前代码中的分层页可能仍叫 `测试解译` 或存在历史 route，需要实现时做兼容。
- 置信度来源不稳定时，只能显示 `未评估`，不能用伪置信度。
- 只读历史、复制为草稿等能力可能超出当前实现，本轮默认隐藏或禁用。
- 当前实现的 route 和页面命名仍有历史兼容，后续实现必须保持用户可见为 `地层分层`。

## 18. 初审 finding 处理

| Reviewer | finding | 处理 |
| --- | --- | --- |
| Parfit | Reviewer owner 待安排；质量门状态缺 `数据未检查 / 检查通过 / 警告可继续` | 已补 owner 表和状态覆盖 |
| Lagrange | 内部网格太粗；BottomPanel 默认态不清；局部列表与全局 Explorer 可能混淆 | 已补内部网格、BottomPanel 默认态和局部 rail 说明 |
| Erdos | `已采纳` 状态只有 `用于参数试算`，缺正式 `进入参数解译` | 已补正式主动作、入口表和 blocking 条件 |
| Dirac | 当前 WinUI official write disabled；缺验证路径、可测试谓词和复用清单 | 已补当前能力映射、谓词表、验证路径和复用清单 |

修复后仍需 reviewer re-check；未复查前本 planning gate 不能关闭。

## 19. 下一步

本文件完成后，下一步不是直接进入开发 handoff，而是：

1. 对本次补丁执行 reviewer re-check。
2. 修复仍存在的 blocking。
3. 若无 blocking，由 integration owner 记录 `risk close` 或 `pass`。
4. 进入 Figma 绘制 `05 地层分层默认页`。
5. Figma 截图和审阅通过后，才允许写 `05` 页面级 development handoff。
