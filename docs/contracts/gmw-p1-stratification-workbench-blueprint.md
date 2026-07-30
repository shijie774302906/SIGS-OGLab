# GMW-P1A 地层分层工作台蓝图

日期：2026-06-29

状态：`draft for reviewer`

适用范围：`GMW-P1A：地层分层工作台信息架构、布局蓝图与多 agent 审核`

## 1. 目标

把未来的 `地层分层` 页面定义为一个通用工作台，而不是某个方法的结果页。

该页面只关心：

```text
LayerScheme              分层方案
ClassificationEvidence   SBT/SBTn/分类证据
LayerBoundary            分层边界
LayerInterval            连续层段
```

方法只作为这些对象的来源，例如内置 Ic/SBT、外部方法、人工修订、用户自定义方法。页面不得为某个方法名创建专属布局。

## 2. 用户问题

默认工程视图必须直接回答：

1. 当前点位有哪些分层方案？
2. 当前采用哪套方案？
3. 当前方案把深度如何连续分层？
4. 每层是什么土类/行为类型？
5. 当前层或边界的主要证据是什么？
6. 这套方案能否作为参数解译输入？

科研展开视图再回答：

1. 不同方法/方案的边界差异在哪里？
2. 哪些深度段土类判断冲突？
3. 哪些边界不确定性高？
4. 多方案一致率、边界偏差、复核区间是什么？
5. 原始方法运行、warning、provenance 在哪里？

## 2.1 岩土领域语义

地层分层页必须区分“分类证据”“工程分组”和“正式土名”。

### 2.1.1 土行为类型、工程分组、正式土名

| 字段 | 含义 | 来源 | UI 规则 |
| --- | --- | --- | --- |
| `soilBehaviorType` | CPT/CPTU 行为类型或 SBT/SBTn 分类结果 | Ic/SBT/SBTn、Robertson 图、方法输出的分类证据 | 可以作为证据显示，但不得直接称为正式地质土名 |
| `engineeringSoilGroup` | 参数方法选择用的工程分组 | 由行为类型、人工复核或项目规则映射而来 | 用于过滤砂类/黏性/混合/未知等参数方法 |
| `soilClassLabel` | 正式地层土名或工程命名 | 人工确认、勘察资料或已采纳解释 | 没有人工/项目确认时不得伪装成正式土名 |

文案规则：

- 默认列名优先使用 `行为类型 / 工程分组`。
- 只有来源明确时才显示 `正式土名`。
- `SBT 6区`、`砂性行为` 这类表达可以作为证据；不能直接写成“正式砂土层”。

### 2.1.2 不确定性来源

不确定性不得只写一个百分比。

字段：

```text
uncertaintyKind: statistical / heuristic / manual / none / unknown
uncertaintyValue
uncertaintyMetric: probability / entropy / boundaryOffset / reviewFlag / none
```

规则：

- 只有方法真实输出概率、熵或统计量时，才显示 `uncertaintyValue`。
- heuristic/manual/unknown 只能显示 `需人工复核`、`启发式判断`、`无统计置信度` 等文本。
- 不得伪造 confidence badge。

### 2.1.3 边界类型命名

避免使用 `Soft`，因为它容易被误读为软土或软黏土。

边界类型统一使用：

```text
SharpBoundary        突变边界
GradationalBoundary  渐变边界
UncertainBoundary    不确定边界
ManualBoundary       人工边界
```

UI 可显示中文名；数据对象使用英文枚举。

### 2.1.4 参数解译输入门槛

地层分层页必须区分三个动作：

| 动作 | 用途 | 允许状态 |
| --- | --- | --- |
| `设为试算输入` | 科研/对比临时试算 | Candidate / Draft / Adopted |
| `采纳为当前分层` | 工程默认分层方案 | Candidate 经复核后，或 Draft 保存后 |
| `设为正式参数解译输入` | 正式参数解译默认输入 | Adopted 或已审查 Draft |

Candidate 方案不能静默进入正式参数解译。

### 2.1.5 参数前置土类映射检查

进入参数解译前，preflight 必须检查每个层是否能映射到参数方法需要的适用组：

```text
砂类 / 黏性 / 混合 / 未知
```

未知或过渡层不得静默套用砂土 `φ'` 或黏土 `Su` 方法。必须显示阻断或需要人工选择的状态。

## 3. 设计计划

### 3.1 色彩 token

工作台 shell 继续使用 `docs/ux-v5-vscode-like-workbench-contract.md` 的 VSCode-like 颜色。以下 token 只用于地层分层内容和数据可视化，不替代 shell 主题。

| Token | Hex | 用途 |
| --- | --- | --- |
| `DataInstrumentBlue` | `#007ACC` | 当前采用方案、选中边界、主交互强调 |
| `LayerSand` | `#C7A35C` | 砂类/粗颗粒层色带 |
| `LayerClay` | `#8B6FA3` | 黏性土/细颗粒层色带 |
| `LayerSiltMixed` | `#8EA26B` | 粉土、混合土、过渡层色带 |
| `EvidenceCyan` | `#3B8C9E` | 分类证据点、SBT 选中点 |
| `UncertaintyAmber` | `#B7791F` | 高不确定边界、需复核区间 |

规则：

- 语义错误/成功/警告仍使用全局语义色，不算上述数据色。
- 方法来源不直接绑定固定颜色；来源用线型、标签、轨道标题、图例表达。
- 低置信度不只靠颜色表达，还要用虚线、半透明带、uncertainty 标识。

### 3.2 排版和密度

- UI 字体：`Segoe UI`。
- 数字、深度、层号、run id 使用 tabular number。
- 默认字号遵循 VSCode-like：主要表格/属性 `12-13 px`，局部标题 `13-15 px`。
- 页面不使用 hero 标题，不使用大圆角卡片。
- 文档内部区域用 1px 分隔线、splitter 和 tabular layout 组织。

### 3.3 布局概念

地层分层页是一个 Editor document，内部采用“方案导航 + 主证据画布”的两栏文档布局；全局 Right Side Panel 承担详情；EditorArea Workbench Bottom Panel 承担对比/日志/预检。

宽屏默认：

```text
Workbench Shell
  Explorer: 工程流程树
  Editor Tab: 地层分层
    Document Command Row
    Local Scheme Navigator | Evidence Workspace
  Right Side Panel: selected layer / boundary details
  EditorArea Bottom Panel: scheme comparison / method logs / preflight
```

## 4. 总体布局

### 4.1 Wide desktop 默认布局

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Editor Tab: 地层分层                                                       │
├────────────────────────────────────────────────────────────────────────────┤
│ Point | Scheme | 新建方案 | 运行方法 | 保存 | 采纳为当前分层 | 正式参数输入 │
├────────────────────┬───────────────────────────────────────────────────────┤
│ Scheme Navigator   │ Evidence Workspace                                    │
│  Adopted           │ ┌─────────────────────────────┬─────────────────────┐ │
│  Candidates         │ │ Profile Board               │ Evidence Column      │ │
│  Drafts             │ │ depth/qc/fs/u2/Ic/layers    │ SBT evidence         │ │
│  Archived           │ │ selected interval highlight │ Layer table          │ │
│  + New scheme       │ └─────────────────────────────┴─────────────────────┘ │
└────────────────────┴───────────────────────────────────────────────────────┘

Global Right Side Panel:
  Layer detail / Boundary detail / Scheme detail

EditorArea Bottom Panel:
  Scheme comparison / Method logs / Output preflight
```

### 4.2 尺寸建议

| 区域 | 默认 | 约束 |
| --- | ---: | --- |
| Document Command Row | 36 px | 不超过 44 px |
| Scheme Navigator | 236 px | 220-280 px |
| Evidence Column | 340 px | 300-380 px |
| Profile Board | remaining | 主区域，不得小于 Evidence Column |
| Right Side Panel | 300 px | 使用全局工作台尺寸 |
| Bottom Panel collapsed | 34-36 px | 默认收起 |
| Bottom Panel expanded | 140-160 px first implementation / 180-240 px later | P1C 优先兼容当前 shell 约束，复杂对比后续再扩展 |

响应规则：

- 宽度不足时，Evidence Column 变为 Evidence Workspace 内部 bottom tab。
- Scheme Navigator 可折叠，但当前方案状态必须仍在 command row 可见。
- Right Side Panel 关闭时，详情可在 Evidence Workspace 内以临时 details tab 打开。

Bottom Panel 归属：

- 本文中的 Bottom Panel 指 VSCode-like `EditorArea Row 2` 的 Workbench Bottom Panel。
- 它不是页面内部卡片。
- 它不替代根布局最底部的蓝色 Status Bar。
- P1C 初版按当前 shell 能力控制在 `140-160 px`；若后续需要更高对比矩阵，再单独调整全局 panel 高度约束。

## 5. Document Command Row

职责：

- 显示当前点位和当前方案。
- 提供方案级动作。
- 不展示方法调试信息。

控件：

| 控件 | 类型 | 行为 |
| --- | --- | --- |
| 当前点位 | readonly breadcrumb / command text | 显示项目、点位、数据版本 |
| 当前方案 | compact selector | 切换 scheme，和 Scheme Navigator 同步 |
| 新建方案 | split button | 打开 LayerScheme 方法选择器 |
| 运行方法 | button | 仅当选中方法可运行且输入满足时启用 |
| 复制为人工修订 | button | 从当前 scheme 生成 Draft |
| 保存草稿 | button | 只对 Draft 启用 |
| 设为试算输入 | button | 仅创建科研/对比临时参数试算上下文 |
| 采纳为当前分层 | primary action | 将已复核方案设为工程采用方案 |
| 设为正式参数解译输入 | primary action | 仅对 Adopted 或已审查 Draft 启用 |
| 对比 | toggle/button | 打开 Bottom Panel 的 `方案对比` tab |

必要性判断：

- 默认显示：当前点位、当前方案、新建方案、采纳为当前分层或设为正式参数解译输入。
- 可折叠到更多菜单：运行方法、复制为人工修订、保存草稿。
- 不显示：安装路径、license 长文、stdout/stderr、完整 JSON。

## 6. Scheme Navigator

### 6.1 结构

Scheme Navigator 是当前点位的局部分层方案列表，不是全局 Explorer。

分组：

```text
当前采用
候选方案
人工修订
历史归档
```

每个 row 字段：

- 方案名
- 来源类型：内置 / 外部 / 人工 / 自定义
- 状态：`Adopted / Candidate / Draft / Archived`
- 层数
- 是否被参数解译引用
- 最新运行或修改时间
- 输入状态：`current / stale / missing inputs`

### 6.2 Row 示例

```text
当前采用方案
  Ic/SBT 连续分层
  Adopted · 253 layers · used by 参数解译

候选方案
  自动分层候选 A
  Candidate · 18 layers · review 3 boundaries

人工修订
  人工修订 2026-06-29
  Draft · 20 layers · unsaved
```

### 6.3 交互

- 单击 row：激活该 `LayerScheme`，刷新 Profile Board、Evidence Column、Right Side Panel。
- 双击 row：打开 scheme detail。
- 右键或 row 更多菜单：重命名、复制为人工修订、归档、查看方法运行、导出审查包。
- `+ 新建方案`：打开 `LayerSchemeProducer` 方法选择器。

### 6.4 筛选、排序和大量方案

当候选方案很多时，Scheme Navigator 不能把所有方案无序堆在左侧。

默认排序：

1. `Adopted`
2. pinned / recently edited `Draft`
3. latest runnable `Candidate`
4. stale or invalid candidates
5. `Archived`

筛选：

- status：Adopted / Candidate / Draft / Archived / Invalid
- source type：内置 / 外部 / 人工 / 自定义
- input freshness：current / stale / missing inputs / unknown
- used by parameter scheme
- review needed

搜索：

- scheme name
- source method
- run id
- soil behavior label

规则：

- 默认列表最多展开当前点位最相关的近期方案。
- 历史候选超过阈值时进入 `Archived` 或折叠分组。
- 搜索和筛选只影响列表显示，不改变 adopted/default 状态。

### 6.5 空态

如果当前点位没有候选分层方案：

```text
暂无候选分层方案
运行一个分层方法，或从当前解译结果复制为人工修订。
```

空态只显示一个主动作，不展示方法列表海洋。

## 6.6 Scheme 与参数解译的关系

地层分层页需要区分三个概念：

| 概念 | 含义 | 参数解译关系 |
| --- | --- | --- |
| `selected LayerScheme` | 当前界面正在查看的方案 | 可以用于临时预览和科研对比 |
| `adopted LayerScheme` | 当前工程采纳的正式分层方案 | 默认作为工程参数解译输入 |
| `parameter-default LayerScheme` | 参数解译页当前选择的分层输入 | 可等于 adopted，也可在科研模式中临时指定 |

默认工程模式：

- 参数解译默认消费 `adopted LayerScheme`。
- `Candidate` 不能静默进入正式参数解译。
- `Draft` 必须保存并显式设为正式参数解译输入后才能被参数解译使用。

科研/对比模式：

- 可以允许临时选择 `Candidate` 做参数试算。
- 试算结果必须标记为 research / candidate，不得进入正式成果输出。

后续 P2A 必须进一步定义 `ParameterScheme` 对 `Candidate / Draft / Adopted` 的权限矩阵。

## 7. LayerScheme 方法选择器

触发：

- `新建方案`
- Scheme Navigator 的 `+`

过滤规则：

只显示满足以下条件的方法：

- `capability.outputObjectType = LayerScheme`
- 当前点位数据满足 required inputs，或能明确显示缺失项
- 方法可用于当前点位，不展示全局无关方法

布局：

```text
Search / filter row
  capability: LayerScheme
  availability: runnable / missing inputs / installed / custom

Method list
  method name | source | use level | required inputs | output summary

Right preview
  input readiness
  settings summary
  expected outputs
```

确认后结果：

```text
MethodRun -> Candidate LayerScheme
```

方法运行结果不得直接变为 `Adopted`。

## 8. Evidence Workspace

Evidence Workspace 是地层分层页的主区域。它必须先显示分层结果，再按需显示方法细节。

### 8.0 初始选中规则

打开页面时必须有明确上下文，避免右侧详情变成说明文。

默认选择顺序：

1. 如果存在 `adopted LayerScheme`，激活该方案。
2. 如果没有 adopted，但存在最近的 current `Candidate`，激活该候选方案。
3. 如果只有 Draft，激活最近修改的 Draft。
4. 如果没有任何 scheme，显示紧凑 scheme empty state。

默认层/边界选择：

- 激活 scheme 后，优先选择当前视口内厚度最大的 layer。
- 如果当前视口不可得，选择第一个有效 layer。
- 如果没有 layer，Right Side Panel 显示 compact `Scheme detail`，不得显示长说明。

右侧详情默认：

```text
selected layer -> Layer detail
selected boundary -> Boundary detail
no layer -> Scheme detail
```

### 8.1 Profile Board

职责：

- 沿深度展示 CPT/CPTU 曲线。
- 与当前 `LayerScheme` 的连续层位对齐。
- 让用户直接看见边界位置、土类色带和不确定区间。

轨道：

| Track | 内容 | 备注 |
| --- | --- | --- |
| Depth ruler | 深度刻度 | 所有视图共享 |
| qc/qt | 锥阻力曲线 | 可按数据源显示 qc 或 qt |
| fs/Fr | 侧摩阻或摩阻比 | 根据当前数据可用性 |
| u2 | 孔压 | 无 u2 时不显示空轨道 |
| Ic/class | Ic 或分类轨道 | 可显示内置分类或当前证据摘要 |
| Layer track | 当前 `LayerScheme` | 主对象，必须可见 |

Layer track 表达：

- 层段色带：按土类/行为类型。
- 边界线：实线表示确定，虚线表示不确定。
- 不确定区间：半透明带。
- 当前选中层：蓝色描边或左侧 rail。
- 人工修改：边界旁显示小型 edit marker。

禁止：

- 把所有方法的全部层位默认叠在同一轨道。
- 用同一种视觉状态混合 adopted/candidate/draft。
- 默认显示日志、JSON 或长方法说明。

### 8.2 Evidence Column

宽屏中 Evidence Column 位于 Profile Board 右侧，包含两个垂直区域：

```text
SBT / Classification Evidence
Layer Table
```

首屏比例：

- SBT / Classification Evidence 默认占 Evidence Column 高度的 `55-65%`。
- Layer Table 默认占 `35-45%`。
- SBT evidence 最小可视高度 `220 px`。
- Layer Table 最小可视高度 `180 px`。
- 如果高度不足，Layer Table 优先内部滚动，SBT evidence 保持可读。

溢出规则：

- Evidence Column 内部滚动，不让整个 page 横向滚动。
- Layer Table 行数超出时只滚动表体，表头固定。
- SBT 说明文字不得超过两行，长 provenance 进入 Right Side Panel 或 Bottom Panel。

如果没有 `ClassificationEvidence`，SBT 区显示简短空态：

```text
当前方案无 SBT/分类证据输出
可查看 Ic/class track 或运行支持分类证据的方法。
```

不生成虚假点云。

### 8.3 SBT / Classification Evidence

定位：

- SBT 图是地层分层页的证据图。
- 它解释“为什么分层/土类判断可能合理”。
- 它不是独立 workflow，也不是参数解译页主图。

默认内容：

- chart type：`SBT / SBTn / Robertson1990 / Robertson2016 / Custom`
- axis labels and units
- evidence points
- selected layer depth range overlay
- evidence count
- source scheme / source method

交互：

- 选择 Profile Board 的层段：SBT 图高亮该深度范围内的点。
- brush SBT 点：Profile Board 高亮对应深度段。
- 切换 chart type：只显示当前 scheme 有证据的数据。
- 进入 comparison mode：最多叠加 2-4 个 selected schemes，使用线型/marker 区分。

### 8.4 Layer Table

Layer Table 是 Profile Board 的表格化补充。

默认列：

| 列 | 说明 |
| --- | --- |
| 层号 | stable layer index |
| 深度范围 | `depthFrom-depthTo m` |
| 厚度 | `m` |
| 行为类型 | `soilBehaviorType` |
| 工程分组 | `engineeringSoilGroup` |
| 正式土名 | `soilClassLabel`，无确认时显示 `未确认` |
| 来源 | 内置 / 外部 / 人工 / 自定义 |
| 边界 | 突变 / 渐变 / 不确定 / 人工 |
| 不确定性 | kind + value，例如 `statistical entropy 0.21` 或 `无统计置信度` |
| 证据 | SBT count / Ic continuity / manual |
| 状态 | adopted / candidate / draft |

规则：

- 无真实统计置信度时显示 `无统计置信度`，不伪造百分比。
- 表格点击 row 联动 Profile Board 与 Right Side Panel。
- 表格不是主视觉，默认高度不超过 Evidence Column 的下半部分。

## 9. Right Side Panel

Right Side Panel 使用全局工作台右侧区域，不在 Editor 内部重复一个详情卡片。

### 9.1 Layer detail

触发：

- 点击 layer track。
- 点击 Layer Table row。

字段：

- layer id / 层号
- 深度范围
- 厚度
- 行为类型
- 工程分组
- 正式土名确认状态
- 当前状态
- 来源类型
- source method / source run
- uncertainty kind / metric / value
- evidence summary
- downstream parameter advice
- actions：复制为人工修订、标记复核、查看来源

### 9.2 Boundary detail

触发：

- 点击 boundary marker。

字段：

- boundary depth
- adjacent layers
- boundary type
- uncertainty interval
- uncertainty kind
- evidence on both sides
- source method
- manual edit state
- actions：调整边界、复制为人工修订、标记复核

### 9.3 Scheme detail

触发：

- Scheme Navigator row detail。

字段：

- scheme name
- status
- point id / data version
- source method / source run
- layer count
- input freshness
- used by ParameterScheme
- created/modified
- adoption readiness

不默认显示：

- 完整 stdout/stderr。
- 完整 method-run JSON。
- 长 license 文本。

## 10. Bottom Panel

Bottom Panel 不是页面内部卡片；它使用 VSCode-like `EditorArea Row 2` 的 Workbench Bottom Panel。

默认折叠。用户点击 `对比`、Activity Bar 或出现阻断问题时展开。

### 10.1 方案对比 tab

用途：

- 支持科研和审查，而不是默认工程视图。

子视图：

1. Boundary Compare
   - 多个 scheme 沿深度轴并列显示边界。
   - 一屏看出谁分得更细、哪些边界一致。

2. Unified Interval Matrix
   - 合并所有选中 scheme 的边界。
   - 每个统一深度段显示各 scheme 土类/行为类型。

3. Summary Metrics
   - layer count
   - mean boundary offset
   - agreement rate
   - high uncertainty intervals
   - review-needed depth ranges

规则：

- 默认最多比较 2-4 个用户选择的方案。
- 方法差异不等于错误，冲突标记用低饱和 highlight。
- 点击差异区间联动 Profile Board。

### 10.2 方法日志 tab

用途：

- 查看 selected scheme 的 method run 日志。

默认内容：

- run id
- status
- warnings count
- artifacts
- concise error if failed

完整 stdout/stderr 需要二次展开，不默认占据屏幕。

### 10.3 输出预检 tab

用途：

- 判断当前 `LayerScheme` 是否能进入参数解译和成果输出。

检查项：

- 当前点位匹配
- data version freshness
- layer intervals cover required depth
- no reversed/overlapping intervals
- no missing adopted scheme
- parameter scheme dependency status
- engineering soil group mapping complete
- unknown/mixed layers require explicit parameter method decision

## 11. 状态模型

### 11.1 Scheme status

| 状态 | 含义 | 默认 UI |
| --- | --- | --- |
| `Adopted` | 当前工程采用的分层方案 | 蓝色 rail / adopted label |
| `Candidate` | 方法生成但未采纳 | neutral label |
| `Draft` | 人工修订中 | edit marker / unsaved indicator |
| `Archived` | 历史方案 | muted row |
| `Invalid` | 输入过期或结构错误 | error label，不能设为参数输入 |

### 11.2 Input freshness

| 状态 | 含义 |
| --- | --- |
| `current` | 与当前点位数据版本一致 |
| `stale` | 来源数据或 official run 已变化 |
| `missingInputs` | 方法输入不满足 |
| `unknown` | 无法验证来源 |

`stale` 不是错误，但不能静默作为当前工程采用方案。

## 12. 通用性规则

本页面不得写死：

- pyCPT
- Groundhog
- Ic/SBT
- 某个公式名
- 某个 runner 路径

可以显示具体方法名的位置：

- scheme row 的来源摘要
- Right Side Panel 的 source method
- Bottom Panel 的 method logs
- Method picker 的 list row

页面结构、控件和验收必须只依赖 capability/output object。

## 13. 必要性分层

默认工程视图必须显示：

- 当前点位
- 当前方案
- scheme list
- curve + layer track
- SBT/classification evidence if available
- selected layer/boundary details
- adopt/use-for-parameter action

默认不显示：

- 所有历史 runs
- 完整 method registry
- 完整 JSON
- stdout/stderr
- 长 license/provenance
- 多方法批量矩阵
- 敏感性分析

高级/科研展开才显示：

- 多方案 boundary comparison
- unified interval matrix
- agreement metrics
- raw artifacts
- detailed provenance

## 14. 后续实现切片边界

### GMW-P1B

目标：

- 定义 mock `LayerScheme` / `ClassificationEvidence` 数据。
- 不改 database schema。
- 为静态 UI 提供真实形状的数据。

数据边界：

- 优先使用 fixture JSON 或内存 projection。
- fixture 建议放在 `sample_data/stratification/` 或 `sample_data/method-lab/stratification/`，具体路径在 P1B 确认。
- 临时运行或截图数据可写入 `app_data/temp/`。
- 除非单独确认，P1B/P1C 不写 `app_data/method_lab/runs/` 作为正式方法运行产物。
- 严禁写 SQLite official tables。
- UI 必须标识 `projection / candidate / draft`，不能伪装为正式成果。

### GMW-P1C

目标：

- WinUI 静态布局骨架。
- 只使用 mock 或 existing read-only projection。
- 不新增正式采纳/保存逻辑。

route 过渡策略：

- 推荐新增业务 route：`stratification`，显示名 `地层分层`。
- 过渡期可以复用现有 `InterpretationPage` 的只读曲线投影，但不应继续把新蓝图命名为 `测试解译`。
- Legacy `interpretation` / `测试解译` 路由在迁移前保留，避免破坏现有 QA。
- P1C 必须明确 Explorer、Editor Tab、Status Bar、Right Side Panel 对 `stratification` 的同步规则。

### GMW-P1D

目标：

- UIA / screenshot / focused checks。
- 验证 scheme list、profile board、SBT evidence、right detail、bottom comparison 可见。
- SBT brush/highlight 可以延期，不作为 P1D 初版阻断，除非该切片明确实现交互联动。

### GMW-P1E

目标：

- 将现有 Ic/SBT 分层显示映射为第一套 `LayerScheme` projection。
- 不改变正式算法。

## 15. AutomationId 建议

后续实现建议使用：

| AutomationId | 含义 |
| --- | --- |
| `StratificationPageRoot` | 地层分层页根 |
| `StratificationCommandRow` | 顶部命令区 |
| `CurrentLayerSchemeSelector` | 当前方案 selector |
| `LayerTrialParameterInputButton` | 设为试算输入 |
| `LayerAdoptSchemeButton` | 采纳为当前分层 |
| `LayerOfficialParameterInputButton` | 设为正式参数解译输入 |
| `LayerSchemeComparisonToggle` | 打开/关闭底部方案对比 |
| `LayerSchemeNavigator` | 局部分层方案列表 |
| `AdoptedLayerSchemeRow` | 当前采用方案 row，实际可带 scheme id 后缀 |
| `CandidateLayerSchemeRow` | 候选方案 row，实际可带 scheme id 后缀 |
| `DraftLayerSchemeRow` | 草稿方案 row，实际可带 scheme id 后缀 |
| `LayerSchemeCreateButton` | 新建方案 |
| `LayerSchemeMethodPicker` | 分层方法选择器 |
| `LayerProfileBoard` | 曲线 + 分层主画布 |
| `LayerTrack` | 当前方案 layer track |
| `SelectedLayerInterval` | 当前选中层段 summary/probe |
| `SelectedBoundaryMarker` | 当前选中边界 summary/probe |
| `ClassificationEvidencePanel` | SBT/分类证据区 |
| `LayerTable` | 分层表 |
| `LayerDetailContext` | 右侧 layer detail context |
| `BoundaryDetailContext` | 右侧 boundary detail context |
| `StratificationComparisonPanel` | 底部方案对比 |
| `BoundaryCompareView` | 边界对比视图 |
| `UnifiedIntervalMatrix` | 统一区间对比表 |
| `StratificationMethodLogPanel` | 底部方法日志 |
| `StratificationPreflightPanel` | 底部输出预检 |
| `SchemePreflightStatus` | 当前方案预检状态 |

Canvas accessibility 规则：

- 如果 `LayerProfileBoard` 使用 Canvas 自绘，必须提供可被 UIA 读取的 probe/summary 元素。
- `SelectedLayerInterval` 和 `SelectedBoundaryMarker` 可以是可见或 offscreen summary，但必须包含当前 depth、status 和 scheme id。
- 不能只依赖像素截图证明选中层存在。

## 16. 截图验收

P1A 是文档蓝图，不要求截图。

后续 P1C/P1D 实现验收至少需要：

- `1920x1080` 全物理桌面截图。
- 当前前景 app 为 `SIGS-OGLab | 海上风电岩土勘察解译`。
- Explorer 当前节点为 `地层分层` 或过渡期对应节点。
- Editor 显示 scheme list + profile board + SBT/classification evidence。
- Right Side Panel 显示 selected layer/boundary detail。
- Bottom Panel 至少可展开 scheme comparison。

## 16.1 后续 focused checks

P1C/P1D 至少需要以下检查。脚本名称可在实现时调整，但检查语义必须覆盖。

### Static layout/token check

检查：

- `StratificationPageRoot`
- `LayerSchemeNavigator`
- `LayerProfileBoard`
- `ClassificationEvidencePanel`
- `LayerTable`
- `LayerDetailContext`
- `StratificationComparisonPanel`
- 禁止在页面结构中硬编码具体方法名作为布局条件。
- 不出现页面内部大圆角卡片化 shell。

建议脚本：

```text
tools/uiregression/check_stratification_workbench_contract.ps1
```

### Mock data contract check

检查：

- mock/projection 数据包含 `Adopted / Candidate / Draft / Archived`。
- 至少包含一个 `SharpBoundary`、一个 `GradationalBoundary`、一个 `UncertainBoundary`。
- 至少包含 `soilBehaviorType`、`engineeringSoilGroup`、`uncertaintyKind`。
- 无统计来源时不出现伪造 confidence。

建议脚本：

```text
tools/stratification-check/run-layer-scheme-mock-check.ps1
```

### Projection safety check

检查：

- 不写 SQLite official tables。
- 不改 `InterpretationRuns`、`InterpretationResults`、`ParameterInterpretationRuns`、`ExportRecords`。
- 不改变现有 official interpretation algorithm。
- mock/projection 在 UI 上标识为 `projection / candidate / draft`，不得伪装 official。

### Runtime UIA check

检查：

- 导航到 `地层分层` 或过渡 route。
- 当前方案 selector 可见。
- adopted/candidate/draft rows 可见。
- 选择一个 layer 后，Right Side Panel 更新。
- 展开 bottom comparison 后，`BoundaryCompareView` 和 `UnifiedIntervalMatrix` 可见或有明确 empty/projection state。

### Screenshot check

输出目录建议：

```text
app_data/temp/ui-regression/stratification-workbench/<timestamp>/
```

必须记录：

- physical resolution
- foreground app title
- active document
- screenshot path
- visual conclusion

## 17. Reviewer assignments

### Product architecture reviewer

必须检查：

- 页面是否围绕 `LayerScheme` / `ClassificationEvidence`，而不是具体方法名。
- 未来 20 个分层方法是否还能用同一布局。
- MethodRun 是否只作为来源，不直接等于 Adopted result。
- 参数解译是否能消费 selected/adopted LayerScheme。

### Geotechnical domain reviewer

必须检查：

- SBT/分类证据与分层判断的关系是否正确。
- 连续层位、边界、不确定性、土类表达是否符合 CPT/CPTU 工作。
- 无统计置信度时是否避免伪造 confidence。
- 分层方案能否合理支持后续参数解译。

### UI/layout reviewer

必须检查：

- 是否符合 VSCode-like 工作台区域。
- 默认工程视图是否直接看见结果。
- 右侧详情和底部对比是否没有抢主图。
- 是否避免卡片堆叠和调试信息泛滥。

### Implementation/QA reviewer

必须检查：

- 是否能用 WinUI 原生布局落地。
- 是否能先用 mock/projection 实现，不改 schema。
- AutomationId 是否覆盖验收。
- 后续 focused check 和截图路径是否清楚。

## 18. P1A 关闭标准

P1A 可关闭必须满足：

- 本蓝图通过四类 reviewer 审核，或 reviewer 风险已被记录并处理。
- `Plan-total.md` 和 `docs/method-workflow-generalization-plan.md` 同步指向本蓝图。
- `plan.md` 记录 P1A 完成状态和下一候选 P1B。
- `Process.md` 和 `process_logs/Process38.md` 记录验证和 closure review。
- 文档 diff check 通过。

不得关闭条件：

- reviewer 认为蓝图仍围绕具体方法名。
- SBT/ClassificationEvidence 位置仍不清楚。
- 默认界面同时塞入工程结果、科研矩阵和调试日志，导致主目标不直接。
- 需要 schema 或算法变更才能解释蓝图。
