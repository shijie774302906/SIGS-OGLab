# Flow 1 - CPT09 数据准备到数据检查案例闭环

Date: 2026-07-09

Status: `superseded / replaced by random synthetic Flow 1 research`

Superseded by:

- `docs/prototype/flow-1-functional-research-random-case-2026-07-09.md`

Reason:

- The next Flow 1 implementation should not use the fixed Yingkou/CPT09 sample.
- It should use seed-driven random synthetic CPTU data and Playwright human-flow acceptance evidence.

## 1. 目的

本文件定义第一个按用户操作顺序组织的产品闭环：

```text
项目/点位数据 -> 数据导入 -> 数据检查
```

Flow 1 不是普通页面巡检，也不是只用 Playwright 做结果验收。它应先定义一个具体工程案例，再围绕该案例设置功能、页面结构、可见标签、测试标签和人类操作路径，最后再用 Playwright 模拟用户完整走一遍。

目标是让用户在浏览器原型中完成一次真实感较强的数据准备与数据检查判断：

- 当前项目和点位是否正确。
- 当前样例数据是否已读入。
- 字段、单位、深度范围和预览数据是否能进入检查。
- 数据检查结论是 `无问题`、`仅提示` 还是 `存在问题`。
- 如果有提示或问题，用户能否定位到来源并知道下一步去哪。
- 当前数据是否可以进入 `地层分层`。

## 2. 案例设定

Case ID: `F1-CPT09-standard`

Case name: `CPT09 数据准备到数据检查闭环`

Flow ID: `flow-1-data-prep-check`

业务对象：

| Object | Value |
| --- | --- |
| 项目 | 营口 CPTU 样例 |
| 点位 | `CPT09` |
| 点位别名 | `CPT9-19-S1` |
| 数据批次 | `yingkou-cptu-sample-table` |
| 样例来源 | copied local sample data |
| Flow 起点 | `项目/点位数据` |
| Flow 终点 | `数据检查` 已判断可进入 `地层分层` |

案例结果预期：

- 点位已选择。
- 导入批次可读。
- 样例字段已映射。
- 数据检查没有会阻止继续分析的用户可见问题。
- 至少存在一个 `仅提示` 项，用来验证问题定位、说明和下一步建议。
- 用户最终可以点击进入 `地层分层`。

## 3. Flow 边界

In scope:

- `项目/点位数据` 页面功能设置。
- `数据导入` 页面功能设置。
- `数据检查` 页面功能设置。
- Flow 1 顶部案例条和步骤标签。
- 每页右侧功能区的工具化设置。
- Flow 1 相关可见标签和测试标签。
- Playwright 人类操作流验收。

Out of scope:

- 真实文件上传。
- 真实数据编辑或修复。
- 保存工程状态。
- 写入 desktop `app_data`。
- 修改 SQLite schema。
- 实现官方公式。
- 正式 PDF、DXF、Excel 或报告导出。
- 将 `项目/点位数据` 和 `数据导入` 合并成一个路由。
- 重做 `地层分层` 之后的完整业务。

## 4. 总体交互模型

Flow 1 继续使用三栏工作台：

```text
Left fixed workflow nav | Center primary work area | Right page functional dock
```

三栏职责：

| Area | Responsibility |
| --- | --- |
| 左侧固定导航 | 告诉用户当前处于哪个工作环节，并允许切换六个既有页面 |
| 中间主工作区 | 展示当前步骤最重要的工程结果、表格、预览或检查清单 |
| 右侧功能区 | 放置当前页面的工具、筛选、选择、定位、建议和下一步动作 |

右侧功能区规则：

- 不做第二套左侧导航。
- 不重复中间主表格。
- 不以状态罗列为主要目的。
- 每个模块必须对应一个明确动作：选择、筛选、核对、定位、查看建议、进入下一步。
- 状态文字只作为工具上下文。

## 5. Flow 顶部案例条

Flow 1 涉及的三个页面顶部都应出现一致的案例条。

推荐可见结构：

```text
Flow 1 数据准备 -> 数据检查
F1-CPT09 标准检查案例
步骤 1/3 确认项目与点位
当前交接物：CPT09 / yingkou-cptu-sample-table / 待运行检查
```

页面切换后步骤文案变化：

| Route | Step label | Handoff label |
| --- | --- | --- |
| `project` | `步骤 1/3 确认项目与点位` | `当前交接物：CPT09 / 待核对导入` |
| `import` | `步骤 2/3 核对导入数据` | `当前交接物：yingkou-cptu-sample-table / 可检查` |
| `check` | `步骤 3/3 运行数据检查` | `当前交接物：检查结论 / 可进入地层分层` |

建议可见标签：

- `Flow 1`
- `F1-CPT09`
- `数据准备 -> 数据检查`
- `步骤 1/3`
- `步骤 2/3`
- `步骤 3/3`
- `已选择点位`
- `已映射`
- `可检查`
- `无问题`
- `仅提示`
- `可进入地层分层`

## 6. 页面一：项目/点位数据

### 6.1 用户问题

用户在本页应能回答：

- 当前项目是什么。
- 当前点位是不是 `CPT09`。
- 这个点位的数据覆盖情况如何。
- 是否可以进入导入核对。

### 6.2 中间主工作区

中间区应展示：

- 当前项目摘要。
- 当前点位摘要。
- 点位列表。
- 数据覆盖卡片或表格。
- 样例预览摘要。

推荐模块：

| Module | Purpose | Main action |
| --- | --- | --- |
| 当前项目 | 确认项目上下文 | 查看项目名称、数据版本 |
| 当前点位 | 确认 `CPT09` | 选择或保持当前点位 |
| 点位列表 | 查看可选点位 | 点击点位行 |
| 数据覆盖 | 判断深度范围、记录数是否可读 | 查看覆盖摘要 |
| 进入导入 | 进入下一步 | `核对导入` |

### 6.3 右侧功能区

右侧功能区应是点位与数据覆盖工具，不是状态面板。

推荐模块：

| Dock module | Tool action | Output |
| --- | --- | --- |
| 点位选择 | 快速选择当前点位 | 更新当前点位 |
| 覆盖筛选 | 查看记录数、深度范围、数据版本 | 确认数据覆盖 |
| 数据入口 | 进入导入核对 | 跳转 `数据导入` |

### 6.4 可见状态

- `已选择点位`
- `数据可读`
- `待核对导入`

### 6.5 交接物

交给 `数据导入`：

- project id
- point id
- point name
- point alias
- data version
- source record count
- source depth range

### 6.6 验收点

- 页面存在 Flow 1 案例条。
- `CPT09` 是当前点位。
- 中间区有点位、深度范围和记录数。
- 右侧有进入导入的功能模块。
- 点击 `核对导入` 后进入 `数据导入`。

## 7. 页面二：数据导入

### 7.1 用户问题

用户在本页应能回答：

- 当前导入批次是什么。
- 关键字段是否已映射。
- 深度、单位、行数预览是否可检查。
- 是否可以运行数据检查。

### 7.2 中间主工作区

中间区应展示：

- 当前导入批次。
- 字段映射表。
- 单位和深度预览摘要。
- 预览数据表。

推荐模块：

| Module | Purpose | Main action |
| --- | --- | --- |
| 导入批次 | 确认当前样例批次 | 查看批次名称 |
| 字段映射 | 核对 DepthM、Qc/Qt、Fs/Fr、U2 | 查看映射状态 |
| 单位/深度预览 | 判断数据是否可检查 | 查看深度范围、单位、行数 |
| 数据预览 | 查看样例行 | 滚动或选择预览行 |
| 运行检查 | 进入检查 | `运行数据检查` |

### 7.3 右侧功能区

右侧功能区应放置导入核对工具。

推荐模块：

| Dock module | Tool action | Output |
| --- | --- | --- |
| 批次选择 | 选择或确认 `yingkou-cptu-sample-table` | active import batch |
| 映射核对 | 查看字段是否已映射 | mapping result |
| 单位/深度检查 | 查看单位、深度范围、行数 | import readiness |
| 预览控制 | 控制预览行或字段 | preview focus |
| 运行检查 | 进入数据检查 | route to `check` |

### 7.4 可见状态

- `已映射`
- `可检查`
- `仅提示`

### 7.5 交接物

交给 `数据检查`：

- active import batch
- field mapping result
- normalized preview rows
- unit/depth summary
- import notice candidates

### 7.6 验收点

- 页面存在 Flow 1 案例条。
- 当前步骤为 `步骤 2/3 核对导入数据`。
- 中间区展示 `DepthM`、`Qc / Qt`、`Fs / Fr`、`U2`。
- 右侧有批次、映射、单位/深度检查工具。
- 点击 `运行数据检查` 后进入 `数据检查`。

## 8. 页面三：数据检查

### 8.1 用户问题

用户在本页应能回答：

- 当前检查结论是什么。
- 是否有 `存在问题`。
- 哪些只是 `仅提示`。
- 选中一个提示后，来源和建议是什么。
- 当前是否可以进入 `地层分层`。

### 8.2 中间主工作区

中间区应展示：

- 检查结论摘要。
- 检查规则组。
- 问题/提示清单。
- 选中项的证据定位。

推荐模块：

| Module | Purpose | Main action |
| --- | --- | --- |
| 检查结论 | 判断是否可继续 | 查看 `无问题`、`仅提示`、`可进入地层分层` |
| 规则组 | 按类型查看检查项 | 选择规则组 |
| 问题/提示清单 | 查看具体检查项 | 点击检查项 |
| 证据定位 | 查看受影响字段或数据范围 | 高亮选中项 |
| 进入分层 | 继续下一步 | `查看分层` 或 `进入地层分层` |

### 8.3 右侧功能区

右侧功能区应放置检查工具。

推荐模块：

| Dock module | Tool action | Output |
| --- | --- | --- |
| 规则筛选 | 按必需字段、深度连续性、SBT/SBTn 输入筛选 | filtered issue list |
| 问题定位 | 定位选中项来源 | selected issue source |
| 处理建议 | 显示下一步建议 | recommended next action |
| 继续判断 | 判断是否可进入地层分层 | continue decision |

### 8.4 可见状态

- `无问题`
- `仅提示`
- `存在问题`
- `可进入地层分层`

### 8.5 交接物

交给 `地层分层`：

- current point data
- check summary
- remaining notice list
- permitted analysis scope

### 8.6 验收点

- 页面存在 Flow 1 案例条。
- 当前步骤为 `步骤 3/3 运行数据检查`。
- 检查规则包含深度连续性、必需字段、SBT/SBTn 输入。
- 点击 `SBT/SBTn 输入` 后，中间选中对应项。
- 右侧显示来源、说明和建议。
- 页面明确显示 `可进入地层分层`。
- 点击继续动作后进入 `地层分层`。

## 9. 标签体系

### 9.1 可见产品标签

这些标签面向用户显示：

| Label | Usage |
| --- | --- |
| `Flow 1` | 当前案例流 |
| `F1-CPT09` | 当前案例编号 |
| `数据准备 -> 数据检查` | Flow 名称 |
| `步骤 1/3 确认项目与点位` | project route |
| `步骤 2/3 核对导入数据` | import route |
| `步骤 3/3 运行数据检查` | check route |
| `已选择点位` | project state |
| `已映射` | import mapping state |
| `可检查` | import readiness |
| `无问题` | check conclusion |
| `仅提示` | warning-level check item |
| `存在问题` | issue that requires action |
| `可进入地层分层` | handoff state |

### 9.2 测试标签

这些标签用于 Playwright，不一定直接展示给用户：

| Attribute | Value |
| --- | --- |
| `data-flow` | `flow-1-data-prep-check` |
| `data-case-id` | `F1-CPT09-standard` |
| `data-flow-step` | `select-point` |
| `data-flow-step` | `review-import` |
| `data-flow-step` | `run-check` |
| `data-flow-step` | `inspect-issue` |
| `data-flow-step` | `continue-stratification` |

Recommended test ids:

| Test id | Purpose |
| --- | --- |
| `flow-case-banner` | Flow 顶部案例条 |
| `flow-step-select-point` | 步骤 1 容器 |
| `flow-step-review-import` | 步骤 2 容器 |
| `flow-step-run-check` | 步骤 3 容器 |
| `flow-handoff-summary` | 当前交接物 |
| `project-current-point` | 当前点位 |
| `project-coverage-summary` | 数据覆盖 |
| `project-dock-point-tools` | 项目页右侧工具 |
| `import-active-batch` | 当前导入批次 |
| `import-field-mapping` | 字段映射 |
| `import-readiness-dock` | 导入页右侧工具 |
| `check-summary` | 检查结论 |
| `check-rule-groups` | 检查规则组 |
| `check-issue-list` | 问题/提示清单 |
| `check-issue-detail-dock` | 检查页右侧问题详情 |
| `flow-continue-stratification` | 进入地层分层动作 |

## 10. 人类操作路径

```mermaid
flowchart LR
  A[打开工作台] --> B[进入项目/点位数据]
  B --> C[确认 CPT09]
  C --> D[查看覆盖与记录数]
  D --> E[点击 核对导入]
  E --> F[核对字段映射]
  F --> G[查看单位/深度/预览行]
  G --> H[点击 运行数据检查]
  H --> I[查看检查结论]
  I --> J[选择 SBT/SBTn 输入]
  J --> K[查看右侧来源与建议]
  K --> L[确认可进入地层分层]
  L --> M[进入地层分层]
```

## 11. Playwright 验收方案

Playwright 应模拟用户，不只检查页面是否存在。

Scenario: `F1-CPT09 数据准备到数据检查闭环`

Viewport:

- `1440x900`
- `1920x1080`

Steps:

1. 打开工作台。
2. 点击左侧 `项目/点位数据`。
3. 断言 Flow 案例条出现：`Flow 1`、`F1-CPT09`、`步骤 1/3`。
4. 断言当前点位为 `CPT09`。
5. 断言中间区有深度范围、记录数、数据版本。
6. 断言右侧是点位/覆盖/导入工具，而不是重复中间表格。
7. 点击 `核对导入`。
8. 断言进入 `数据导入`，案例条变为 `步骤 2/3`。
9. 断言字段映射包含 `DepthM`、`Qc / Qt`、`Fs / Fr`、`U2`。
10. 断言出现 `已映射` 和 `可检查`。
11. 点击 `运行数据检查`。
12. 断言进入 `数据检查`，案例条变为 `步骤 3/3`。
13. 断言规则组包含深度连续性、必需字段、SBT/SBTn 输入。
14. 点击 `SBT/SBTn 输入`。
15. 断言中间区选中该项。
16. 断言右侧显示来源、说明和建议动作。
17. 断言当前结论包含 `无问题` 或 `仅提示`，并显示 `可进入地层分层`。
18. 点击 `查看分层` 或 `进入地层分层`。
19. 断言进入 `地层分层`。
20. 检查 console error、page error、文字溢出和截图。

Required screenshots:

| Screenshot | Viewport |
| --- | --- |
| project step | `1440x900` |
| import step | `1440x900` |
| check selected issue | `1440x900` |
| check selected issue | `1920x1080` |

## 12. 验收标准

Flow 1 可关闭的条件：

- `plan.md` 指向 Flow 1，而不是孤立的 `Slice B`。
- 三个页面都出现 Flow 1 案例条。
- 三个页面都有对应步骤标签。
- 三个页面的右侧功能区都服务当前页面动作。
- 用户能按案例从 `项目/点位数据` 走到 `数据检查`。
- 用户能选择一个 `仅提示` 项并看到来源、说明和建议。
- 用户能看到 `可进入地层分层` 并继续进入下一步。
- Playwright 人类 flow 测试通过。
- `npm.cmd run build` 通过。
- `npm.cmd run test:e2e` 通过。
- 截图检查没有明显遮挡、错位、文字溢出。
- 没有 desktop repo、desktop `app_data`、SQLite schema、官方公式或正式成果交付改动。

## 13. 停止条件

出现以下情况时，应停止当前实现并重新确认：

- 需要真实文件上传。
- 需要真实修复和写回工程数据。
- 需要保存到 desktop runtime state。
- 需要正式算法或官方公式判断。
- 需要正式报告、PDF、DXF、Excel 导出。
- 需要把 Flow 1 扩展到地层分层之后的完整链路。
- 右侧功能区开始承担全局导航，或重复中间主表格。

## 14. 确认清单

Confirmed requirement:

- Goal: 建立 `F1-CPT09 数据准备到数据检查闭环`，让用户按真实业务顺序完成点位确认、导入核对、检查判断和进入分层前的交接。
- Scope: `项目/点位数据`、`数据导入`、`数据检查` 三页；Flow 案例条；功能模块；页面结构；可见标签；测试标签；Playwright 人类流验收。
- Non-goals: 不做真实上传、真实修复、持久化、desktop 写入、官方公式、正式成果交付。
- Acceptance criteria: 用户能完整走通 Flow 1，并能查看一个 `仅提示` 项的来源、说明和建议。
- Verification: build、E2E、Playwright 人类 flow、截图、console/page error、文字溢出检查。
- Closure review: 当前 slice 关闭前需要检查功能、flow、标签和截图证据，不只看测试是否通过。
- Stop conditions: 见第 13 节。

Open questions:

- 是否将 `查看分层` 统一改为 `进入地层分层`，以便 Flow 1 的终点动作更清楚。

Implementation may start: no. Wait for user confirmation of this document.
