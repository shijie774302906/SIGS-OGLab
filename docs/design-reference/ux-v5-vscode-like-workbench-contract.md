# UX-V5 VSCode-like 工作台设计合同

日期：2026-06-28

状态：`locked`

适用范围：`UX-V5 i=1` 到 `UX-V5 i=4`

本文档是当前 UI 重构的硬约束。后续实现、审阅、截图验收和多 agent 审查都必须以本文档为准。目标不是“有 TabView、TreeView、Panel 就算 VSCode-like”，而是复刻 VSCode 的工作台组织语法，并把现有 CPT/CPTU 功能放进这个语法中。

## 1. 不可自由发挥规则

当前方向固定为：

```text
VSCode-like 工作台
```

以下规则不可被后续审美判断覆盖：

- 不再使用自定义海洋/岩土/工程纸面视觉系统作为当前 UI 判断依据。
- 不做产品 banner、hero 区、大圆角卡片堆叠、居中展示页、说明型产品页。
- 不允许省略 VSCode 顶部应用菜单/command chrome；顶部不能只剩产品标题、项目标签和大按钮。
- 不把中央文档区做成带外边距、边框、圆角的独立卡片。
- 不把 Explorer 做成静态流程说明；左侧树节点必须看起来可点，并且后续必须真的可打开或激活文档。
- 不展示没有真实功能支撑的 VSCode 功能，例如 Git、扩展、终端、调试器、命令面板。
- 不因为 CPTU 业务专业而加入新的装饰色、材质色或主题色；业务表达放在内容和图表中，工作台外壳服从 VSCode-like。

## 2. 已确认需求

- Goal：把 `OffshoreGeotechWorkbench` 主界面改造成明确 VSCode-like 的工程工作台。
- Scope：工作台 shell、VSCode-style 顶部应用菜单/command chrome、Activity Bar、Explorer、Editor Tabs、Editor Area、Right Side Panel、Bottom Panel、Status Bar、颜色 token、密度 token、选中态、hover/focus、当前文档联动、截图验收标准。
- Non-goals：不实现完整文件系统；不实现 VSCode 扩展市场、命令面板、Git、终端、调试器、代码编辑器；不改 schema、导入语义、检查规则、解释公式、参数算法、导出文件合同。
- Acceptance criteria：1920x1080 全物理截图第一眼像 VSCode Light 工作台；顶部有 VSCode-style 应用图标、菜单栏、导航按钮和 Command Center/搜索框；左深色 Activity Bar、浅色 Explorer、中央 editor group、右侧辅助面板、底部 panel、蓝色 status bar 都成立；Explorer/Tab/Status Bar 当前文档一致。
- Verification：文档检查；主构建；工作台 shell/visual/document/status/UIA；关键页 1920x1080 全物理截图；完整本地 QA；闭环设计复核。
- Stop conditions：截图仍像卡片化工程仪表盘；左树不可点击；状态不同步；颜色偏离本文档 token；或者实现触及业务数据合同。

Implementation may start：`yes`，但只能从 `UX-V5 i=1：主壳 VSCode 区域结构` 开始。

## 2.1 多 agent 审计结论

本节回答本轮审计的三个问题，并作为后续补丁依据。

### Q1：按照当前计划是否能变成类似 VSCode 的形式？

结论：`conditional pass`。

在加入本节补丁后，计划可以把产品拉到 VSCode-like 形式；但产品本身仍必须通过 i=1 到 i=4 的代码实现、截图和 UIA 验证后才能判定为真正 `pass`。

之前版本只能判 `risk`，原因是：

- i=1 只写“主壳结构”，却把 Explorer 真实点击放到 i=2；这和合同中“Explorer 不可点击为红线”冲突。
- VSCode 形式定义缺少硬网格拓扑、AutomationId、分片验收边界和旧 token 禁止检查。
- 功能映射虽有大类，但没有把现有功能逐项归到 top menu、Activity Bar、Explorer、Editor、Right Panel、Bottom Panel、Status Bar。

本次补丁后的关闭规则：

- i=1 必须完成可见 shell 结构和主流程 Explorer 叶节点的最小点击打开/激活行为。
- i=2 不再承担“首次让 Explorer 可用”，而是强化 selected/status/right panel 同步、键盘/focus、持久化和 UIA 覆盖。
- 只要旧 shell token 仍作为 UX-V5 验收通过项，或 UX-V5 token 未被脚本断言，UX-V5 不能关闭。

### Q2：VSCode 的形式如何拆解并定义？

VSCode-like 形式必须按以下 7 层定义，不按控件名定义：

1. Anatomy：顶部 chrome、Activity Bar、Explorer、Editor Group、Right Side Panel、Bottom Panel、Status Bar。
2. Adjacency：各区域边到边相邻，使用 1px 分隔线，不用浮动卡片。
3. Grid topology：RootGrid、WorkbenchBody、EditorArea 的行列关系固定。
4. Function mapping：每个业务功能只能进入指定区域，不以大按钮或说明卡重复出现。
5. State model：normal、hover、pressed、selected、focused、disabled、error 的可见状态。
6. Density/tokens：颜色、字号、行高、padding、图标尺寸、圆角和分隔线固定。
7. Evidence：截图、UIA、视觉 token、反卡片化和旧 token 禁止检查必须能验证。

### Q3：我们的功能应该归类到哪里？

本合同第 6 节是唯一归类口径。简表如下：

| 功能 | VSCode-like 归类 |
| --- | --- |
| 新建/选择项目 | Top `File` 菜单；Command Center 可做定位入口 |
| 当前项目名 / 当前点位 | Command Center、Status Bar、Explorer 根节点 |
| 项目/点位数据 | Explorer 叶节点 + Editor Tab；默认打开且不可关闭 |
| 数据导入 | Explorer 叶节点 + Editor Tab；File 菜单可作为辅助入口 |
| 数据检查 | Explorer 叶节点 + Editor Tab；Problems/Bottom Panel 联动 |
| 地层分层 | Explorer 叶节点 + Editor Tab；Run 菜单可触发地层分层 |
| 参数解译 | Explorer 叶节点 + Editor Tab；Run 菜单可触发真实参数解译 |
| 成果输出 | Explorer 叶节点 + Editor Tab；Artifacts/Bottom Panel 联动 |
| 对象详情 / 当前测点 / 当前 run | Right Side Panel |
| 质量问题 | Activity Bar `Problems` + Bottom Panel `质量问题` |
| 计算记录 | Activity Bar `Output` + Bottom Panel `计算记录` |
| 成果预检 | Activity Bar `Artifacts` + Bottom Panel `成果预检` |
| SQLite 本地模式 / 当前状态 | Status Bar |

禁止重复入口：

- 顶部不再保留大号 `打开流程` 主按钮；流程跳转归入 `Go` 菜单、Explorer 和 Command Center。
- 顶部产品名和当前项目不能做成醒目的项目 badge；项目上下文进入 Command Center、Explorer 根节点和 Status Bar。
- 左侧 footer 不承担流程说明或主入口；Explorer 节点本身承担入口。

## 3. VSCode-like 结构语法

### 3.1 必须出现的区域

| VSCode-like 区域 | 必须视觉形态 | 本项目映射 |
| --- | --- | --- |
| Title/Menu Bar / Command Center | 顶部浅灰 chrome，低高度，包含应用图标、菜单栏、后退/前进、Command Center/搜索框，不做品牌 hero | 产品名、当前项目、菜单命令、流程跳转、视图/布局入口 |
| Activity Bar | 最左侧深色竖栏，图标为主，当前项有明确选中态 | Explorer、问题、成果、设置等有真实作用的入口 |
| Explorer / Side Bar | Activity Bar 右侧浅色树区域，小标题、紧凑树行、缩进、图标 | 工程流程树和当前项目范围 |
| Editor Group | 中央主体，tab strip 直接贴在 editor 顶部，不包卡片 | 项目/点位数据、数据导入、数据检查、地层分层、参数解译、成果输出 |
| Right Side Panel | 右侧工具面板，紧凑属性/上下文，不写长说明 | 当前对象详情、测点/run/方法/预检摘要 |
| Bottom Panel | 底部工具面板，tab 化问题/输出/成果预检 | 质量问题、计算记录、成果预检 |
| Status Bar | 底部全宽蓝色条，白字，信息密集 | 就绪状态、当前文档、质量计数、当前项目、SQLite 本地模式 |

### 3.1.1 硬网格拓扑

UX-V5 的 shell 必须符合以下拓扑。实现可以用 WinUI `Grid`，但视觉结果必须一致。

```text
RootGrid
  Row 0: Title/Menu/Command Chrome, 36-40 px
  Row 1: WorkbenchBody, *
  Row 2: StatusBar, 22-24 px

WorkbenchBody
  Column 0: ActivityBar, 48 px
  Column 1: Explorer, 240-320 px
  Column 2: EditorArea, *
  Column 3: RightSidePanel, 260-360 px

EditorArea
  Row 0: EditorTabs, 34-36 px
  Row 1: ActiveDocument, *
  Row 2: BottomPanel, 34-36 px collapsed / 160-220 px expanded
```

硬规则：

- `EditorArea` 直接占据中间主列，不能放在带 `Margin=10`、圆角或阴影的大卡片中。
- Editor 上方不再出现独立的“工程证据区” header；文档身份由 Tab、Explorer selected 和 Status Bar 表达。
- `ActivityBar` 必须是最左列；`Explorer` 必须紧邻其右侧。
- `StatusBar` 必须是根布局最底行，横跨全宽。
- `BottomPanel` 属于 `EditorArea`，不替代 `StatusBar`。

### 3.2 必须消除的当前偏差

| 当前偏差 | 为什么不像 VSCode | UX-V5 处理 |
| --- | --- | --- |
| 中央 `WorkbenchDocumentPane` 有外边距和卡片边框 | VSCode 的 editor group 是工作台主体，不像浮动卡片 | 去掉外边距，边到边接入 shell，只保留 1px 分隔线 |
| 顶部像产品标题栏/banner | VSCode 顶部是应用菜单和 command chrome，不是营销或产品页 | 压低高度和视觉重量，加入应用图标、菜单栏、后退/前进和 Command Center |
| 左侧只有浅色树 | VSCode 有深色 Activity Bar + 浅色 Side Bar 两级结构 | 新增深色 Activity Bar，Explorer 只承担树 |
| Explorer 树像流程说明 | VSCode Explorer 是可操作对象树 | 节点有 icon、hover、selected、AutomationId、后续点击打开文档 |
| 右侧对象详情像说明卡片 | VSCode 辅助面板是属性/工具列表 | 改成紧凑属性行、短标签、少段落 |
| 底部像状态摘要抽屉 | VSCode bottom panel 是工具面板 | 使用 panel tab/header/content 结构，默认可折叠 |
| 状态栏不是蓝色 VSCode 条 | VSCode status bar 是强识别底栏 | 固定 `#007ACC` 背景，白色 12px 文本 |

## 4. 色彩系统

本轮只允许以下 6 个主题色作为工作台外壳色彩 token。语义色另列，不算主题强调色。

| Token | Hex | 用途 |
| --- | --- | --- |
| `VSCodeTitleBar` | `#DDDDDD` | 顶部 title/menu/command chrome |
| `VSCodeActivityBar` | `#333333` | 最左侧 Activity Bar |
| `VSCodeSideBar` | `#F3F3F3` | Explorer / Side Bar 背景 |
| `VSCodeEditor` | `#FFFFFF` | Editor Area、主要文档背景 |
| `VSCodeLine` | `#E5E5E5` | 1px 分隔线、Tab 边界、panel 边界 |
| `VSCodeAccent` | `#007ACC` | Status Bar 背景、选中态强调、Activity indicator |

允许的文字/状态辅助色：

| Token | Hex | 用途 |
| --- | --- | --- |
| `VSCodeTextPrimary` | `#1E1E1E` | 主文字 |
| `VSCodeTextSecondary` | `#616161` | 次级文字、meta |
| `VSCodeTextOnAccent` | `#FFFFFF` | 蓝色 Status Bar 上文字 |
| `SemanticSuccess` | `#16825D` | 完成/通过 |
| `SemanticWarning` | `#B7791F` | 警告/待处理 |
| `SemanticError` | `#C42B1C` | 阻断/错误 |

派生 token：

| Token | Hex | 用途 |
| --- | --- | --- |
| `VSCodeExplorerHover` | `#EAEAEA` | Explorer row hover |
| `VSCodeExplorerSelected` | `#DCDCDC` | Explorer selected row |
| `VSCodeTabInactive` | `#ECECEC` | inactive tab 背景 |
| `VSCodeTabActive` | `#FFFFFF` | active tab 背景，接入 editor |
| `VSCodePanelHeader` | `#F3F3F3` | side/bottom panel header |
| `VSCodeFocusStroke` | `#007ACC` | keyboard focus |

禁止：

- 禁止继续使用 `#F7FAF9`、`#EEF5F4`、`#2F6F8F` 作为工作台 shell 主色。
- 禁止将成功/警告/错误色当作主题强调色。
- 禁止新增紫蓝渐变、奶油底、陶土色、深蓝大底、海雾青或工程纸面背景。

## 5. 排版和密度

### 5.1 字体

- UI 字体：`Segoe UI`。
- 数值、日志、路径、记录标识可使用系统等宽字体。
- 不引入新字体，不做 editorial 字体搭配。

### 5.2 字号

| 场景 | 字号 | 说明 |
| --- | ---: | --- |
| Status Bar | 12 px | 白字，紧凑 |
| Activity Bar 图标辅助文本 | 10-11 px | 一般不显示文字 |
| Explorer 标题 | 11 px | 大写或小型标签感 |
| Explorer 树行 | 13 px | 主操作文本 |
| Tab 文本 | 13 px | 文档标题 |
| 面板标题 | 11-12 px | 工具面板标签 |
| Editor 内页面标题 | 15-17 px | 只在内容页内部使用，不做 hero |
| 数据表/属性行 | 12-13 px | 数字使用 tabular nums |

禁止：

- 工作台 shell 中使用 19 px 以上标题。
- 顶部品牌使用大号加粗形成 banner。
- 在 Explorer、Bottom Panel、Right Panel 中写长段落解释。

### 5.3 尺寸

| 区域 | 默认 | 约束 |
| --- | ---: | --- |
| Title/Menu Bar | 36-40 px | 不超过 44 px |
| Activity Bar | 48 px | 可到 52 px，不超过 56 px |
| Explorer | 280 px | 最小 240 px，最大 320 px |
| Right Side Panel | 300 px | 最小 260 px，最大 360 px |
| Bottom Panel collapsed | 34-36 px | 作为工具 panel header/summary，不替代 status bar |
| Bottom Panel expanded | 160-220 px | 按问题/日志/成果列表显示 |
| Status Bar | 22-24 px | 全宽蓝底 |
| Explorer row | 22 px | 最多 24 px |
| Tab height | 34-36 px | 不超过 38 px |
| Icon button | 28-32 px | 低 padding |

Shell 区域边界使用 1px 分隔线。工作台外壳区域 `CornerRadius=0`；控件内最多 `CornerRadius=2`，不得使用大圆角卡片感。

补充密度规则：

- Shell 字重以 `400` 和 `600` 为主，不使用大面积 bold。
- Explorer 图标尺寸 16 px，行内左右 padding 6-8 px，层级缩进 16 px。
- Activity Bar 图标尺寸 24 px，按钮 hit target 48 px。
- 所有 shell 分隔线为 1 px。
- Tab 不换行；tab 过多时横向滚动或压缩。

## 6. 当前功能到 VSCode 区域的映射

### 6.0 Title/Menu Bar / Command Center

顶部必须读作 VSCode 的应用 chrome，而不是产品横幅。目标结构：

```text
AppIcon | File Edit Selection View Go Run Output Help | Back Forward | Command Center / 当前项目搜索框 | Layout controls
```

必备视觉元素：

- 最左侧应用图标区域，尺寸约 32-36 px。
- 文本菜单栏，行高 32-36 px，字号 13 px，普通字重。
- 后退/前进图标，位于菜单后或 Command Center 左侧。
- 中央 Command Center/搜索框，浅灰边框，圆角不超过 4 px，宽度 360-520 px。
- 右侧布局/账号/更多入口可出现，但只显示已有真实行为的入口。
- Windows 原生最小化/最大化/关闭按钮可保留；若实现自定义标题栏，必须保证拖拽和窗口控制可用。

菜单映射：

| 菜单 | 本项目允许行为 | 禁止 |
| --- | --- | --- |
| File | 新建/选择项目、导入数据、成果输出、退出 | 不做真实文件系统 Explorer |
| Edit | 撤销/重做/复制等仅在真实可用时启用 | 不做假命令 |
| Selection | 当前测点、当前层、当前对象选择相关命令；无对象时可禁用 | 不编造选择对象 |
| View | 显示/隐藏 Explorer、Right Side Panel、Bottom Panel、重置布局 | 不加入未实现视图 |
| Go | 跳转项目/点位数据、数据导入、数据检查、地层分层、参数解译、成果输出 | 不做源码跳转 |
| Run | 运行地层分层、运行参数解译等已有真实运行入口 | 不做调试器 |
| Output | 只映射到底部 `计算记录`/输出 panel；不提供命令行终端 | 不暗示真实 shell terminal |
| Help | 关于产品、流程说明、版本信息 | 不加入未实现在线帮助 |

R1-A 命名兼容说明：

- 面向用户的主流程名称必须使用 `地层分层`。
- 旧 `测试解译` 只能作为历史实现标签、旧 route 兼容或旧日志语境出现，不得作为 Explorer、Go/Open、Run 菜单或默认工作流验收名称。

Command Center 规则：

- 默认文本可为 `营口样例 / CPT9-19-S1` 或 `搜索项目、测点、流程`。
- i=1 可先做静态/只读视觉承载，但必须像 VSCode 的 Command Center，而不是项目 badge。
- 后续若实现搜索，只搜索真实项目、测点、流程和当前结果，不做全局文件搜索。
- Command Center 不替代 Explorer；它是顶部定位/搜索入口。

### 6.1 Activity Bar

| 图标入口 | 初始状态 | 行为 | 不做 |
| --- | --- | --- | --- |
| Explorer | 必须显示，默认选中 | 显示/聚焦工程流程树 | 不展示真实文件系统 |
| Problems | 可显示 | 展开或聚焦底部 `质量问题` | 不做 VSCode Problems 全功能 |
| Output | 可显示 | 展开或聚焦底部 `计算记录` | 不做终端 |
| Artifacts | 可显示 | 打开 `成果输出` 或聚焦 `成果预检` | 不做文件资源管理器 |
| Settings | 仅当已有真实设置入口时显示 | 打开设置/布局菜单 | 不做扩展市场 |

没有真实行为的 Activity Bar 图标不显示。

i=1 最小行为：

- `Explorer` 永远首位并默认 selected，点击显示或聚焦 Explorer。
- `Problems` 仅当能聚焦底部 `质量问题` tab 时显示。
- `Output` 仅当能聚焦底部 `计算记录` tab 时显示。
- `Artifacts` 仅当能打开 `成果输出` 或聚焦底部 `成果预检` 时显示。
- `Settings` 无真实设置入口时不显示；可由 `View` 菜单承担布局恢复。
- 所有可见图标必须有 tooltip 和稳定 `AutomationId`。

### 6.2 Explorer

Explorer 不是说明文。它是当前项目的对象树和流程树。初始结构：

```text
SIGS-OGLab 工程
  营口样例 / CPT9-19-S1
    项目/点位数据
    数据导入
    数据检查
    地层分层
    参数解译
    成果输出
```

规则：

- 每个可见叶节点都必须有稳定 route。
- 单击节点打开或激活对应 editor document。
- 当前文档节点必须有 selected 状态。
- 根节点可展开/折叠，但不能阻断主要流程节点访问。
- 暂不展开真实测点、run、导出记录，除非数据来源和交互合同已确认。
- 没有真实坐标点时，不显示场地平面图节点。

i=1 最小行为：

- 主流程叶节点必须已经有 route、`AutomationId` 和点击打开/激活对应 document 的行为。
- i=1 可以只做鼠标点击与当前 tab 激活，不要求完整键盘/focus/持久化覆盖。
- i=2 必须补齐 selected/status/right panel/bottom panel 同步、键盘/focus、UIA 细查。

### 6.3 Editor Tabs / Editor Area

| 文档 | 对应页面 | Tab 行为 |
| --- | --- | --- |
| 项目/点位数据 | `ProjectOverviewPage` | 默认打开，不可关闭 |
| 数据导入 | `DataImportPage` | 单击 Explorer 打开，可关闭 |
| 数据检查 | `DataCheckPage` | 单击 Explorer 打开，可关闭 |
| 地层分层 | `StratificationPage` | 单击 Explorer 打开，可关闭 |
| 参数解译 | `InterpretationPage` 的参数上下文或独立 route | 单击 Explorer 打开，可关闭 |
| 成果输出 | `ExportPage` | 单击 Explorer 打开，可关闭 |

Editor Area 规则：

- Tab strip 必须直接贴住 editor 内容区。
- Editor 外侧不得有 10px 以上 margin。
- 不允许中央 document host 像浮动卡片。
- 不允许 editor 上方另加“工程证据区”类独立 header。
- 页面内部可有工具面板，但主证据区必须占主要面积。
- 解释页面默认应让曲线、图表、表格成为主对象，而不是说明文本。
- active tab 白底接入 editor，inactive tab 浅灰；默认 `项目/点位数据` 不可关闭。

### 6.4 Right Side Panel

右侧面板是上下文，不是帮助文档。

| 当前文档 | Right Side Panel 内容 |
| --- | --- |
| 项目/点位数据 | 项目名、测点数量、CPTU 记录数、当前数据源 |
| 数据导入 | 当前导入源、字段映射状态、预览行数、待确认项 |
| 数据检查 | 开放问题、错误数、当前筛选、下一步 |
| 地层分层 | 当前 CPTU 点、LayerScheme、SBT/分类证据、分层数、选中层 |
| 参数解译 | 当前解释结果、`Nkt`、`φ'`/`Su` 有效数、保存状态 |
| 成果输出 | 可交付性、缺失项、最近导出记录、当前选择 |

规则：

- 使用属性行、短标签、列表、计数，不写长段落。
- 右侧面板不能抢走中央证据区主导地位。
- 如果没有真实对象上下文，显示当前文档上下文，不编造数据。

### 6.5 Bottom Panel

底部 panel 是工具输出区。

| Tab | 内容 | 规则 |
| --- | --- | --- |
| 质量问题 | 开放问题、错误、阻断项 | 列表/短句，不写说明文 |
| 计算记录 | 最近运行、run id、方法、完成状态 | 类似 Output，允许等宽日志 |
| 成果预检 | 可导出状态、缺失项、最近导出 | 类似工具检查结果 |

规则：

- 默认可折叠为 34-36 px 的 panel header/summary。
- 阻断质量问题可以自动展开。
- 展开后内容必须像工具输出区，不像信息卡片。
- Bottom Panel 不等于 Status Bar；Status Bar 始终独立存在。

### 6.6 Status Bar

Status Bar 必须是 `VSCodeAccent #007ACC` 全宽蓝条。

建议信息布局：

```text
左侧：就绪 / 错误 0 / 当前文档：地层分层 / 当前点：CPT09
右侧：项目：营口样例 / SQLite 本地模式 / 记录 4,282
```

规则：

- 高度 22-24 px。
- 文本 12 px，白色。
- 只显示真实状态。
- 如果某项不可点击，不要做成按钮样式。
- 不使用深海军蓝、灰蓝或自定义品牌条替代。
- 左侧优先显示状态、错误数、当前文档、当前点；右侧显示项目、本地 SQLite、记录数。
- 宽度不足时从右侧低优先级项开始截断。

## 7. 页面落入 Editor 后的调整原则

### 7.1 通用原则

- 页面内容像工具文档，不像 landing page。
- 顶部页面标题高度控制在 32-44 px。
- 页面内部说明文字只保留必要的工程语境。
- 主证据区优先：图表、数据表、导入预览、问题列表、导出预检。
- 内部卡片可用于重复项或明确工具框，但不得层层套卡。
- 页面内容 padding 建议 12-16 px；大屏不额外居中收窄。

### 7.2 各页面重点

| 页面 | 主对象 | VSCode-like 调整重点 |
| --- | --- | --- |
| 项目/点位数据 | 项目范围、点位数据、数据覆盖、流程状态 | 像 overview document，不做展示页；无真实点位不展示场地示意 |
| 数据导入 | 文件选择、模板/字段映射、预览 | 左操作、右预览或上下分区，减少说明卡 |
| 数据检查 | 问题列表、统计、修复入口 | 类 Problems 视角，严重度可扫读 |
| 地层分层 | CPTU 曲线、SBT/分类证据、分层索引 | 图表优先，右侧/底部给上下文和日志 |
| 参数解译 | `φ'`/`Su` 曲线、参数表、保存状态 | 工具栏 + 图表 + 表格，少解释 |
| 成果输出 | 可交付性、导出记录、缺失项 | 类 Build/Output 预检，不暗示未实现 PDF/DXF |

## 8. 交互状态合同

### 8.1 当前态同步

当前文档切换时必须同步：

- Explorer 当前节点 selected。
- Editor Tab selected。
- Right Side Panel 标题/属性。
- Bottom Panel 当前 route 相关输出。
- Status Bar 当前文档。

任一不同步都是阻断问题。

分片边界：

- i=1：Explorer 主流程叶节点点击打开/激活 editor document；Tab 和 Status Bar 至少反映当前 route。
- i=2：补齐 Explorer selected、Right Side Panel、Bottom Panel、Status Bar、keyboard/focus、布局持久化相关同步。

### 8.2 选中、hover、focus

| 区域 | Hover | Selected | Focus |
| --- | --- | --- | --- |
| Activity Bar | 深色上轻微亮化 | 左侧或侧边 `VSCodeAccent` 指示，图标更亮 | 可见焦点框 |
| Explorer row | `#EAEAEA` 近似浅 hover | `#DCDCDC` 或 accent 左线 | 可键盘定位 |
| Tab | inactive 稍深，hover 变亮 | active 白底接入 editor | 可键盘切换 |
| Bottom Tab | hover 轻微背景 | active 下划线/顶线 | 可键盘切换 |
| Status item | 只有可点击项才 hover | 不做 selected | 可见焦点 |

所有交互元素至少需要定义：

- normal
- hover
- pressed
- selected
- focused
- disabled
- error/loading，如该元素会承载错误或运行状态

### 8.3 面板显隐

- Activity Bar 的 Explorer 图标控制 Explorer 显示或聚焦。
- Problems/Output/Artifacts 图标控制 Bottom Panel 对应 Tab。
- Right Side Panel 可关闭/恢复，但关闭后中央 editor 必须释放空间。
- 重置布局恢复本文档默认尺寸。

## 9. 验收红线

出现以下任一项，UX-V5 当前切片不得关闭：

- 截图第一眼仍像浅色卡片仪表盘，而不是 VSCode Light 工作台。
- 顶部没有 VSCode-style 应用图标、菜单栏、后退/前进和 Command Center/搜索框。
- 顶部仍是产品品牌横幅、项目 badge 和大按钮组合。
- 没有深色 Activity Bar。
- 没有浅色 Explorer，或 Explorer 不可点击。
- Editor 仍被包在带 margin/rounded 的大卡片中。
- Status Bar 不是 `#007ACC` 蓝底白字。
- 左树、Tab、Status Bar 当前文档不一致。
- Bottom Panel 像一段状态说明，而不是工具输出区。
- Right Side Panel 充满说明文或占用过多视觉重量。
- 继续使用旧海雾/工程纸面/自有工业 palette 作为 shell 主色。
- 新增未实现的 VSCode 功能入口。
- UX-V5 验收脚本仍断言旧 shell 主色 `#F7FAF9`、`#EEF5F4`、`#2F6F8F` 为通过条件。
- `docs/workbench-contract-v1.md` 或旧 UIA 合同继续作为 UX-V5 当前验收来源，而未引用本 UX-V5 合同。

## 9.1 UX-V5 AutomationId 合同

| AutomationId | 含义 |
| --- | --- |
| `WorkbenchTopChrome` | 顶部 VSCode-style chrome 根 |
| `WorkbenchAppIcon` | 顶部应用图标 |
| `WorkbenchMenu_File` | File 菜单 |
| `WorkbenchMenu_Edit` | Edit 菜单 |
| `WorkbenchMenu_Selection` | Selection 菜单 |
| `WorkbenchMenu_View` | View 菜单 |
| `WorkbenchMenu_Go` | Go 菜单 |
| `WorkbenchMenu_Run` | Run 菜单 |
| `WorkbenchMenu_Output` | Output 菜单，仅映射到底部计算记录 |
| `WorkbenchMenu_Help` | Help 菜单 |
| `WorkbenchNavBack` | 顶部后退 |
| `WorkbenchNavForward` | 顶部前进 |
| `WorkbenchCommandCenter` | Command Center / 搜索框 |
| `WorkbenchActivityBar` | 深色 Activity Bar 根 |
| `WorkbenchActivity_Explorer` | Explorer activity |
| `WorkbenchActivity_Problems` | Problems activity |
| `WorkbenchActivity_Output` | Output activity |
| `WorkbenchActivity_Artifacts` | Artifacts activity |
| `WorkbenchExplorerPane` | Explorer / Side Bar 根 |
| `WorkbenchExplorerNode_ProjectOverview` | 项目/点位数据节点 |
| `WorkbenchExplorerNode_DataImport` | 数据导入节点 |
| `WorkbenchExplorerNode_DataCheck` | 数据检查节点 |
| `WorkbenchExplorerNode_Stratification` | 地层分层节点 |
| `WorkbenchExplorerNode_Parameters` | 参数解译节点 |
| `WorkbenchExplorerNode_Export` | 成果输出节点 |
| `WorkbenchDocumentHost` | Editor Tabs / document host |
| `WorkbenchRightSidePanel` | 右侧上下文面板 |
| `WorkbenchBottomPanel` | 底部工具面板 |
| `WorkbenchStatusBar` | 蓝色状态栏 |

旧 `docs/workbench-contract-v1.md` 保留为历史工程合同。UX-V5 UI 验收必须以本文档为准；如旧检查脚本仍读取 v1 合同，必须在 i=1 中更新或明确改名为 legacy。

## 9.2 UX-V5 验收检查项

i=1 至少更新或新增检查：

- 顶部 chrome：AppIcon、File/Edit/Selection/View/Go/Run/Output/Help、Back/Forward、Command Center 可见。
- 区域几何：Activity Bar 最左 48 px、Explorer 紧邻、Editor Group edge-to-edge、Status Bar 全宽底部。
- 色彩：Activity Bar `#333333`、Explorer `#F3F3F3`、Editor `#FFFFFF`、Status Bar `#007ACC`。
- 反卡片化：中央 document host `Margin=0`，shell 区域 `CornerRadius=0`。
- Explorer：六个主流程叶节点有 `AutomationId`、route、点击打开/激活 document。
- Tab/Status：点击 Explorer 后 active tab 和 Status Bar route 至少同步。
- 旧 token 禁止：旧 shell 主色不得作为 UX-V5 通过条件。

i=4 截图矩阵必须覆盖：

- 项目/点位数据
- 数据导入
- 数据检查
- 地层分层
- 参数解译
- 成果输出

每张截图记录：

- 1920x1080 全物理桌面
- 前景 app 和窗口标题
- 当前页面/Tab
- 截图路径
- 本合同红线审查结论

## 10. 强制 agent 复查组织

UX-V5 的四个执行切片 `i=1`、`i=2`、`i=3`、`i=4` 每完成一步，必须安排独立 agent 复查。没有 agent 复查结果，不得关闭该切片。

规则：

- 每个切片完成实现和本地验证后，主 agent 必须 spawn 至少一个独立 reviewer。
- reviewer 只能按本文档、`plan.md`、截图证据和验证输出判断，不自由发挥。
- reviewer 结论为 `blocked` 时，该切片回到 `in_progress`，必须修复后再次复查。
- reviewer 结论为 `risk` 时，主 agent 必须明确风险是否阻断；若风险影响 VSCode-like 红线、数据/业务合同或验收可信度，则不得关闭。
- reviewer 结论为 `pass` 或非阻断 `risk` 后，主 agent 仍需做最终整合复核并更新过程日志。
- 如果当前环境无法启动 review agent，则该 UX-V5 切片保持 open，不能用主 agent 自审替代。

每步推荐 reviewer：

| 切片 | 必须复查角度 | 最低 reviewer |
| --- | --- | --- |
| `i=1` | shell 结构、顶部 chrome、Activity Bar、Explorer 最小点击、UX-V5 token、反卡片化 | Structure / Visual reviewer |
| `i=2` | Explorer selected、Tab/Status/Right/Bottom 同步、keyboard/focus、UIA 覆盖 | Interaction reviewer |
| `i=3` | 密度、Tab、状态栏、Bottom Panel、Right Panel、文本溢出和工具感 | Visual Token / Evidence reviewer |
| `i=4` | 六页截图矩阵、完整 QA、红线检查、残余风险 | Closure QA reviewer |

如切片同时触及多个高风险维度，主 agent 应安排多个 reviewer 并行复查。

后续如果并行审查，必须按以下角色分工，且每个角色只能按本文档判断，不自由发挥。

| 角色 | 审查问题 | 输出 |
| --- | --- | --- |
| Structure Reviewer | 区域结构是否真像 VSCode，是否 edge-to-edge | 区域偏差、必须改的 shell 问题 |
| Visual Token Reviewer | 色彩、字号、密度、边框、圆角是否符合 token | token 偏差和截图红线 |
| Workflow Mapping Reviewer | CPTU 功能是否正确映射到 Explorer/Editor/Panel | 功能错位、冗余入口、缺失入口 |
| Interaction Reviewer | 当前态、点击、显隐、hover/focus 是否成立 | 交互阻断和状态不同步 |
| Evidence Reviewer | 图表、表格、日志、预检是否成为主证据 | 主对象不清晰、说明文本过量 |
| WinUI QA Reviewer | 实现是否可用原生 WinUI 稳定落地 | UIA、AutomationId、截图、布局持久化风险 |

每个 reviewer 必须按以下格式输出：

```text
结论：pass / blocked / risk
阻断问题：
残余风险：
必须修改：
可延期：
证据：
```

## 11. i=1 开工前检查

进入 `UX-V5 i=1：主壳 VSCode 区域结构` 前，必须确认：

- 本文档已存在并被 `plan.md` 引用。
- `AGENTS.md` 明确当前 UI 方向以本文档为硬约束。
- 后续代码改动只改 shell/视觉结构，不改业务合同。
- i=1 的第一张验收截图只判断整体 VSCode-like 区域结构，不先陷入小 spacing 微调。
## 11.1 i=1 AutomationId 补充清单

以下 AutomationId 也属于 UX-V5 合同的一部分，必须在产品和脚本中保持稳定：

- `WorkbenchDocumentTab_ProjectOverview`
- `WorkbenchDocumentTab_DataImport`
- `WorkbenchDocumentTab_DataCheck`
- `WorkbenchDocumentTab_Stratification`
- `WorkbenchDocumentTab_Parameters`
- `WorkbenchDocumentTab_Export`
- `WorkbenchViewport`
- `WorkbenchBottomSummary`
- `WorkbenchBottomTab_Issues`
- `WorkbenchBottomTab_Log`
- `WorkbenchBottomTab_Exports`
