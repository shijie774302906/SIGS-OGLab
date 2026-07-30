# Plan-total：OffshoreGeotechWorkbench 重建路线图

日期：2026-06-30

工作区：`D:\CPT-UIQA`

产品：`SIGS-OGLab | 海上风电岩土勘察解译`

## 1. 文件定位与归档规则

`Plan-total.md` 是产品级重建路线图，只记录未来方向、阶段边界和验收原则，不再承载旧 GMW/UX 历史队列，也不作为当前执行状态的唯一来源。

当前计划层级：

- `Plan-total.md`：R0-R5 总路线、阶段目标、验收门槛和多 agent 工作规则。
- `plan.md`：唯一当前 active slice，只写当前正在执行的一小段工作。
- `Process.md`：轻量过程索引，记录当前主题、active process log 和 durable override。
- `process_logs/`：详细执行历史、验证证据、review finding 和关闭结论。
- `docs/archive/Plan-total-archive-20260630-before-reset.md`：本次重置前的旧 `Plan-total.md` 原样归档。

旧计划归档规则：

- 2026-06-30 之前 `Plan-total.md` 中的 GMW/UX/FUNC 历史队列不再作为当前路线图。
- 需要追溯旧计划、旧验收 token、旧截图和旧 slice 时，读取归档文件、`Process.md`、`process_logs/` 和 Git 历史。
- 后续若旧 P3Q 或其他旧队列仍有价值，必须作为历史/待定问题重新评估，不得自动回到当前 active slice。
- 新增路线必须从本文件的 R0-R5 中抽取，再落到 `plan.md` 的一个可执行 slice。

## 2. 当前问题诊断

当前 APP 的主要问题不是某个局部控件缺陷，而是整体产品表达失焦：

- 视觉丑：界面缺少统一、克制、工程软件感强的视觉骨架，局部堆叠和文本密度让用户难以形成信任。
- 布局乱：页面区域、左侧树、中央结果、右侧详情、底部日志/对比之间关系不稳定，用户不知道该从哪里开始。
- 功能不清楚：方法、结果、调试、采纳、导出之间边界混杂，页面容易像实验 demo，而不是工程解释工作台。
- 入口不闭环：从项目/点位到导入、检查、分层、参数、成果输出的主流程没有形成一条默认可消费路径。
- 旧计划不可指导：旧 GMW/UX 队列积累了大量局部实现和验证信息，但已经不能直接指导从“丑、乱、功能不清楚”出发的重建。

因此，本路线图从产品理解和主流程重建开始，而不是继续追加旧队列。

## 3. 重建目标

把 `OffshoreGeotechWorkbench` 重建为一个可理解、可使用、结果优先、VSCode-like 的 CPT/CPTU 工程解释工作台。

目标默认工作流：

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

命名衔接规则：

- 面向用户的主流程默认导航必须显示 `地层分层`。
- `测试解译` 只能作为历史实现标签、内部 route、旧日志或兼容说明出现。
- 新计划、新 UI 文案、新截图验收和新用户路径不得继续把 `测试解译` 作为面向用户的主流程名。
- 如果旧 route 暂时无法改名，必须在 R1/R2 的 UI 文案和 Explorer 节点中把它映射到 `地层分层`，避免继续制造“这是测试页还是正式分层页”的混乱。

默认界面必须先回答工程用户最关心的问题：

- 当前项目和点位是什么？
- 数据是否可用，有哪些阻断问题？
- 当前分层结果是什么，能否作为参数解译输入？
- 当前参数解译结果是什么，是否可以进入成果输出？
- 哪些结果已采纳，哪些只是候选或方法调试产物？

## 4. 重建原则

- 结果优先：默认界面先给工程结果、状态、阻断和下一步动作，方法细节、日志、debug 信息默认收敛到详情或底部面板。
- VSCode-like 不自由发挥：遵循 `docs/ux-v5-vscode-like-workbench-contract.md`，使用固定的 Activity Bar、Explorer、Editor Tabs、Right Side Panel、Bottom Panel、Status Bar 结构。
- 功能归位：主流程消费结果；方法实验室负责方法注册、能力声明、测试运行、日志和 provenance；成果输出只消费已采纳方案。
- 通用方法接入：围绕 `LayerScheme`、`ClassificationEvidence`、`ParameterSeries`、`ParameterScheme`、`MethodRun`、`AdoptedScheme` 等通用对象组织，不围绕少数方法名写死。
- 精简默认界面：默认页只保留完成工程判断所需的信息；多方法对比、长日志、输入输出 artifact、敏感性分析进入折叠区或高级视图。
- 保护现有边界：除非 slice 明确确认，不改 SQLite schema、CPTU 导入语义、数据检查规则、公式/算法、导出合同、打包/runtime 行为。

## 5. 总路线

### R0：计划重置与问题基线

目标：

- 原样归档旧 `Plan-total.md`。
- 用本路线图替代旧 GMW/UX 历史队列。
- 将当前 active slice 切到重建路线的第一步。
- 记录当前问题基线：视觉丑、布局乱、功能不清楚、入口不闭环。

验收：

- `docs/archive/Plan-total-archive-20260630-before-reset.md` 保留旧 `Plan-total.md` 原样内容。
- `Plan-total.md` 只保留未来 R0-R5 重建路线。
- `plan.md` active slice 为 `R0-A：Plan-total 存档与重置`。
- `Process.md` 和 `process_logs/Process79.md` 记录本次治理补丁、验证和 review 待执行状态。
- 文档 diff check 通过。

### R1：VSCode-like 工作台骨架

目标：

- 建立稳定、紧凑、工程软件感明确的 VSCode-like 外壳。
- 让 Activity Bar、Explorer、Editor Tabs、Right Side Panel、Bottom Panel、Status Bar 各自有清晰职责。
- 主流程入口在左侧工程树和中央文档页形成最小闭环。

R1 硬红线：

- 禁止顶部继续像产品 banner；顶部必须是 VSCode-style app/menu/command chrome。
- 禁止中央主区继续是大圆角卡片容器；中央必须是 Editor Tabs + document area。
- 必须有深色 Activity Bar、浅色 Explorer、Editor Tabs、Right Side Panel、Bottom Panel、蓝色 Status Bar。
- Explorer 节点必须可点击，并与当前 Tab、Status Bar 的项目/点位/页面状态同步。
- 默认页必须先给工程结论和下一步，而不是先展示装饰性介绍、方法宣传或卡片堆叠。

验收：

- 默认首屏能看出这是 `SIGS-OGLab | 海上风电岩土勘察解译` 的工程工作台。
- 左侧树能直接打开项目/点位、数据导入、数据检查、地层分层、参数解译、成果输出。
- 中央文档区有清晰 tab 和当前上下文。
- 右侧只放当前对象详情，底部只放问题、日志、预检、对比。
- 1920x1080 物理截图可证明界面像 VSCode-like 工程软件，不像松散 demo。
- 如果截图第一眼不像 VSCode-like、页面像 demo、出现卡片堆叠、默认页不先给工程结论，R1/R1-A closure 必须判定为 `blocking`。

### R2：主流程信息架构

目标：

- 把 `项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出` 固化为默认路径。
- 每个入口都明确输入、输出、状态、阻断和下一步。
- 清理方法实验室、研究候选、调试日志对主流程的干扰。

验收：

- 用户不需要进入方法实验室，也能理解当前点位数据、检查状态、分层结果、参数结果和成果输出状态。
- 每个主流程页都有结果对象和采纳/阻断状态。
- 方法实验室不再是消费工程结果的默认入口。
- 主流程信息架构有对应文档或 plan-step 分解。
- R2-A 必须按“逐页入口闭环检查格式”逐页验收，缺项视为 `blocking` 或至少 `risk`。

### R3：核心页面结果表达

目标：

- 重建地层分层、参数解译、成果输出三类核心页面的结果表达。
- 默认页面先给工程判断，再给方法/日志/对比细节。
- 每个核心页面都能用截图证明主要证据可读、路径直接、默认状态不依赖长 UIA token。

验收：

- 地层分层默认回答：有哪些方案、当前方案如何分层、每层深度/土类/来源/不确定性是什么、能否进入参数解译。
- 参数解译默认回答：采用哪个 `LayerScheme`、哪些参数槽可运行/被阻断、结果曲线和层统计是什么。
- 成果输出默认回答：哪些方案已采纳、预检缺什么、当前能导出什么、哪些内容仍被保护。
- UI 中文用户挑刺不得出现未解决的 `blocking` finding。

### 逐页入口闭环检查格式

R1-A 和 R2-A 必须按以下格式逐页验收主流程入口；R3 以后核心页面也继续沿用该格式做结果表达验收。

每个主流程页必须记录：

- 当前对象：当前项目、点位、方案或输出包是什么。
- 输入：本页消费哪些数据、检查结果、`LayerScheme`、`ParameterScheme` 或 adopted 对象。
- 主结果：默认可见的工程结论是什么。
- 状态/阻断：当前是否可继续，阻断原因是什么。
- 下一步：用户从默认页下一步应该做什么。
- 详情/日志位置：方法详情、运行日志、预检、对比或 provenance 放在哪个右侧/底部区域。

闭环判定：

- 以上任一页缺少当前对象、输入、主结果、状态/阻断或下一步，R1-A/R2-A 不得无条件关闭。
- 需要打开方法实验室或读长日志才能知道主结果时，按 UI 中文用户挑刺硬规则判定为 `blocking`。
- 详情/日志可以存在，但必须位于 Right Side Panel 或 Bottom Panel，不能抢占默认工程结论。

### R4：方法与结果对象通用接入

目标：

- 让内置、外部、用户定义方法都通过通用能力和结果对象进入主流程。
- 方法实验室只做注册、能力声明、测试、日志和 provenance。
- 主流程消费 `LayerScheme`、`ClassificationEvidence`、`ParameterSeries`、`ParameterScheme`、`AdoptedScheme`。

验收：

- 方法名不是主导航结构。
- 方法输出按能力路由到对应主流程页面。
- 候选、试算、采纳、导出状态有明确保护边界。
- 不通过硬编码少数方法名完成主要业务流。

### R5：成果输出与质量门槛

目标：

- 将已采纳分层方案和参数方案组织成可审查的成果输出。
- 明确正式 PDF、DXF、报告模板、审查标准等未确认项的 gate。
- 建立可重复的本地 QA、截图、文档 diff 和 closure review 证据。

验收：

- 成果输出只消费已采纳方案，不把研究候选或方法调试产物混入正式成果。
- 输出预检能直接说明缺项、阻断和下一步。
- 文档、截图、QA 证据能支撑 slice 关闭。
- 未确认的正式 PDF/DXF 不被伪装成已完成能力。

## 6. 多 Agent 循环

所有非平凡 slice 必须进入固定多 agent 循环，并在 `plan.md` 或 active process log 记录 handoff、owner、review 证据和关闭结论。

角色：

- Planning agent：整理目标、现有计划、日志、设计合同和风险，形成可执行 handoff；写清 scope、non-goals、verification、closure gate、stop conditions、reviewer assignments。
- Code-only agent：只执行 handoff 授权的文档或代码修改；不得重新规划、扩大范围、改变产品边界或把 reviewer 意见改写成新需求。
- Engineering critique agent：只做工程挑刺和集成审查；检查唯一 owner、实现边界、验证证据、回归风险、脚本/构建/数据合同一致性。
- UI 中文用户挑刺 agent：只用中文真实工程使用者视角挑刺；关注 UI 是否精简、路径是否直接、结果是否直接可用、默认页是否先给工程结论。

owner 规则：

- 每个 slice 必须有且只有一个 `slice owner`。
- 每个实现切片必须有且只有一个 `integration owner`。
- 小切片可以由同一人兼任，但必须显式记录。
- Code-only agent 不能把未审查结果写成最终 `pass`。

finding severity：

- `blocking`：阻止 slice 关闭，必须修复或明确改 scope 后重审。
- `risk`：可带风险关闭，但必须记录证据、影响面和后续检查。
- `nit`：不阻止关闭的小问题，必须说明为什么不阻塞。

## 7. UI 中文用户挑刺硬规则

以下情况必须标为 `blocking`：

- 默认界面看不到工程用户要用的结果。
- 用户必须绕到方法实验室或方法调试页才能消费工程结果。
- 页面像实验 demo，而不像工程软件。
- 关键状态必须读长日志或大量 UIA token 才能判断。
- 主流程入口不闭环，用户不知道下一步该点哪里。
- R1/R1-A 截图第一眼不像 VSCode-like。
- 顶部仍像产品 banner。
- 中央主区仍是大圆角卡片容器或卡片堆叠。
- 缺少深色 Activity Bar、浅色 Explorer、Editor Tabs、Right Side Panel、Bottom Panel、蓝色 Status Bar 中任一核心区域。
- Explorer 节点不可点击，或点击后不能与 Tab / Status Bar 同步。

以下情况至少标为 `risk`：

- UI 可用但冗余明显。
- 文案不够工程化。
- 结果可用性需要更多截图或真实数据证据。
- 可读性依赖过多隐藏 token。
- VSCode-like 骨架存在，但密度、边界、选中态或区域职责仍不稳定。

UI 中文用户挑刺结论必须用中文写入 closure review 或 active process log。

## 8. 当前路线状态

已完成：

```text
R0-A：Plan-total 存档与重置
R1-A：VSCode-like 壳体区域与主流程入口最小闭环
```

当前 active slice：

```text
R2-A：主流程信息架构与逐页入口闭环
```

下一步候选：

```text
R2-A：主流程信息架构与逐页入口闭环
```

R2-A 预期目标：

- 基于 R1-A 已完成的 VSCode-like 壳体，逐页定义六个主流程入口的信息结构。
- 每页默认回答当前对象、输入、主结果、状态/阻断、下一步和详情/日志位置。
- 清理主流程默认视图中的调试对象名、英文类名、长路径和内部 package 文案。
- 统一 `可继续 / 被阻断 / 可导出 / 下一步` 的状态表达。
- 将 R1-A 复查中提出的“成果输出像调试页、右侧 Details 工程结论弱、下一步不够直接”等问题拆入 R2-A/R3。
