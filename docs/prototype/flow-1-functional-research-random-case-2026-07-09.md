# Flow 1 功能调研与随机案例验收方案

Date: 2026-07-09

Status: `implemented / verified`

Implementation record:

- `process_logs/Process044.md`
- `process_logs/playwright-mcp/flow-1-random-case/flow-run.json`

## 1. 这次调研要回答什么

用户指出旧 `F1-CPT09` 方案有三个问题：

- 没有说清楚什么才算验收成果。
- 没有先确认用户期待的效果。
- 使用营口/CPT09 固定样例不够真实，容易把已有数据背答案，应改成随机生成数据，再让 Playwright 像用户一样走一遍。

因此本次调研目标是收敛四件事：

1. 完整功能应该具备哪些模块。
2. 用户到底要哪些模块，不要哪些复杂内容。
3. 这些模块如何设计成连续 Flow。
4. 如何用随机生成数据和 Playwright 证明验收有效。

## 2. 调研来源

只读调研了桌面仓库 `D:\CPT-UIQA`，未修改任何桌面文件。

主要来源：

| Source | What it contributed |
| --- | --- |
| `D:\CPT-UIQA\docs\workbench-functional-design-spec.md` | 主流程、页面职责、对象模型、页面-对象-动作矩阵、全局状态和验收口径 |
| `D:\CPT-UIQA\docs\ui-03-data-import-development-handoff.md` | 数据导入页面功能入口、状态规则、右侧属性和验收门槛 |
| `D:\CPT-UIQA\docs\ui-04-data-check-development-handoff.md` | 数据检查页面质量门、状态机、问题定位、右侧详情和进入分层判定 |
| `D:\CPT-UIQA\docs\ui-02-10-mainflow-development-handoff.md` | 主流程页边界和哪些高级入口不应抢默认主流程 |
| `D:\CPT-UIQA\tools\first-user-flow\README.md` | 新用户合成 CPTU 数据验收思路 |
| `D:\CPT-UIQA\tools\first-user-flow\Program.cs` | 合成 CPTU 数据字段、检查标记和端到端 PASS marker 思路 |
| `D:\CPT-UIQA\sample_data\manual_walkthrough\README.md` | 人工 walkthrough 的最小字段与人工测试路径 |

## 3. 关键结论

Flow 1 不应该再绑定营口/CPT09。

新的 Flow 1 应该是：

```text
随机生成 CPTU 点位数据
  -> 用户确认当前随机案例
  -> 核对导入批次、字段和预览
  -> 运行数据检查
  -> 查看一个提示或问题
  -> 确认是否可进入地层分层
```

验收不应该只写 `npm test passed`。必须产出可复核证据：

- 随机案例种子。
- 随机点位名。
- 生成行数、深度范围、水深、最终孔深。
- 字段映射结果。
- 检查结果计数。
- Playwright 点击过的检查项。
- 最终是否进入 `地层分层`。
- 截图和浏览器检查记录。

## 4. 用户真正要的内容

用户不需要复杂的公式、真实导入或长说明。用户要的是：

| User need | Product response |
| --- | --- |
| 知道页面应该有哪些模块 | 给出每页模块矩阵 |
| 知道模块如何设计 | 每个模块说明用途、位置、动作、输出 |
| 知道模块如何串成 Flow | 明确对象交接和下一步条件 |
| 知道验收是否可信 | 使用随机数据 + Playwright 人类流 + 截图和记录 |
| 不相信自检 | 自动化必须从 UI 操作，不只读代码或 DOM |
| 不想要复杂内容 | 先做原型语义，不做真实上传、保存、正式成果交付 |

## 5. Flow 1 必备对象

| Object | Created in | Consumed by | Required visible proof |
| --- | --- | --- | --- |
| `SyntheticCase` | 随机生成器 | 三个 Flow 页面 | 案例 ID、随机种子、生成时间 |
| `Project` | 随机案例 | 项目/点位数据 | 项目名、工程海域或场址名 |
| `Point` | 随机案例 | 全 Flow | 点位名、点位编号、水深、最终孔深 |
| `ImportBatch` | 数据导入 | 数据检查 | 批次名、来源类型、行数 |
| `FieldMapping` | 数据导入 | 数据检查 | 必需字段和映射状态 |
| `PreviewRows` | 数据导入 | 数据检查 | 前几行随机数据 |
| `CheckRun` | 数据检查 | 地层分层 | 检查结论、计数、运行时间 |
| `IssueEvidence` | 数据检查 | 右侧功能区 | 字段、深度范围、行号、说明、建议 |

Flow 1 最小对象链：

```text
SyntheticCase
  -> Point
  -> ImportBatch
  -> FieldMapping + PreviewRows
  -> CheckRun + IssueEvidence
  -> HandoffToStratification
```

## 6. 随机数据方案

### 6.1 为什么要随机但可复现

随机数据能避免页面只服务固定 CPT09 样例。  
但完全不可复现的随机会让失败难以定位。

推荐方案：

```text
Playwright 生成 seed
  -> 打开 /?flow=1&case=random&seed=<seed>
  -> Web 原型用 seed 生成同一份随机 CPTU 数据
  -> UI 展示 seed 和案例摘要
  -> Playwright 按 UI 显示值验证 flow
```

这样每次测试都是随机案例，但一旦失败，可以用同一个 seed 复现。

### 6.2 随机案例字段

每个随机案例至少生成：

| Field | Rule |
| --- | --- |
| `caseId` | `F1-RANDOM-<seed>` |
| `projectName` | 随机海域/场址名，例如 `北海合成场址 42` |
| `pointName` | `AUTO-CPTU-<短随机码>` |
| `waterDepthM` | 0.8-35.0 m |
| `finalDepthM` | 12.0-60.0 m |
| `rowCount` | 24-80 行 |
| `depthM` | 严格递增 |
| `Qc` | 正值，kPa |
| `Qt` | 正值，kPa，通常大于或接近 Qc |
| `Fs` | 正值，kPa |
| `U2` | 正值，kPa |
| `Fr` | 由 Fs / Qt 派生或直接生成 |
| `sourceType` | `synthetic-csv` / `synthetic-excel` / `synthetic-paste` 中选一种 |

### 6.3 标准场景

Flow 1 默认使用：

```text
scenario = valid-with-notice
```

规则：

- 没有会阻止继续的数据问题。
- 至少有 1 个 `仅提示`，用于验证问题选择、说明和建议。
- 所有核心字段存在。
- 深度严格递增。
- 水深和最终孔深存在。
- 检查结果应显示 `可进入地层分层`。

后续可以增加问题场景，但不放入 Flow 1 首个实现：

| Scenario | Purpose |
| --- | --- |
| `missing-required-field` | 验证返回数据导入 |
| `non-increasing-depth` | 验证存在问题时不能进入分层 |
| `duplicate-point` | 验证重复点位处理 |
| `range-warning` | 验证警告可继续 |

## 7. 功能模块矩阵

### 7.1 页面：项目/点位数据

用户问题：

```text
我现在处理的是哪个随机案例？当前点位有没有数据？下一步应该去哪里？
```

| Module | Area | Purpose | Main action | Output | Current prototype status |
| --- | --- | --- | --- | --- | --- |
| Flow 案例条 | Top | 显示 `Flow 1`、随机 seed、步骤 | 无 | 当前案例上下文 | 缺失 |
| 当前随机工程 | Center | 显示项目名、案例 ID、生成时间 | 查看 | Project summary | 缺失 |
| 当前点位卡 | Center | 显示随机点位、水深、最终孔深 | 确认点位 | selected point | 部分已有但绑定 CPT09 |
| 点位列表 | Center | 展示当前点位和少量干扰点位 | 点击点位 | selected point | 已有展示，选择弱 |
| 数据覆盖 | Center | 展示行数、深度范围、字段覆盖 | 查看 | coverage summary | 已有但需随机化 |
| 下一步入口 | Center / Right | 进入导入核对 | `核对导入` | route to import | 已有 |
| 点位工具 | Right dock | 快速选择点位、覆盖筛选 | 选择/筛选 | updated focus | 缺失或偏展示 |

最小实现模块：

- Flow 案例条。
- 当前随机点位。
- 数据覆盖。
- 点位列表。
- `核对导入`。
- 右侧点位工具。

### 7.2 页面：数据导入

用户问题：

```text
随机数据是否像一次导入批次一样可读？字段、单位和预览能否进入检查？
```

| Module | Area | Purpose | Main action | Output | Current prototype status |
| --- | --- | --- | --- | --- | --- |
| Flow 案例条 | Top | 显示步骤 2/3 和交接物 | 无 | flow state | 缺失 |
| 导入批次 | Center | 显示随机来源和批次名 | 查看 | active import batch | 部分已有 |
| 来源类型 | Center / Right | 标识 synthetic-csv/excel/paste | 切换或查看 | source type | 缺失 |
| 字段映射 | Center | 核对必需字段映射 | 查看/选择字段 | mapping result | 已有但需补必需字段 |
| 单位策略 | Center / Right | 核对 kPa、m、Fr 百分比 | 查看 | unit readiness | 缺失 |
| 深度预览 | Center | 检查深度范围和递增 | 查看 | depth summary | 部分已有 |
| 数据预览 | Center | 显示随机前几行 | 查看 | preview rows | 已有但固定数据 |
| 预检摘要 | Right dock | 显示可检查、提示、问题 | 查看详细报告 | import precheck | 缺失 |
| 运行检查 | Center / Right | 进入数据检查 | `运行数据检查` | route to check | 已有 |

必需字段：

- `PointName`
- `DepthM`
- `Qc`
- `Qt`
- `Fs`
- `U2`
- `Fr`
- `WaterDepthM` 或 `HydrostaticPressureKpa`
- `FinalDepthM`

最小实现模块：

- 导入批次。
- 来源类型。
- 字段映射。
- 单位/深度预览。
- 预检摘要。
- `运行数据检查`。

### 7.3 页面：数据检查

用户问题：

```text
随机数据检查后是否能进入地层分层？如果有提示，提示在哪里，怎么处理？
```

| Module | Area | Purpose | Main action | Output | Current prototype status |
| --- | --- | --- | --- | --- | --- |
| Flow 案例条 | Top | 显示步骤 3/3 和交接物 | 无 | flow state | 缺失 |
| 检查结论 | Center | 显示无问题/仅提示/存在问题 | 查看 | can continue decision | 已有但不够强 |
| 规则组 | Center / Right | 按类型查看规则 | 选择规则组 | filtered issues | 缺失 |
| 问题/提示清单 | Center | 展示规则结果 | 点击行 | selected issue | 已有 |
| 证据定位 | Center | 显示字段、深度、行号 | 点击检查项 | issue evidence | 部分缺失 |
| 右侧问题详情 | Right dock | 显示来源、影响、建议动作 | 查看/返回导入 | recommended action | 已有但需模块化 |
| 检查规则 | Right dock / panel | 查看规则说明 | 打开规则面板 | rule explanation | 缺失或未显式 |
| 重新检查 | Header / Right | 重新运行检查 | rerun | new check run | 缺失 |
| 返回导入 | Right dock | 存在问题时回导入 | route to import | fix path | 缺失 |
| 进入分层 | Header / Right | 无问题或仅提示时继续 | `进入地层分层` | route to stratification | 已有但文案需统一 |

Flow 1 标准检查规则：

| Rule group | Required result |
| --- | --- |
| 必需字段 | 通过 |
| 深度递增 | 通过 |
| 最终孔深 | 通过 |
| 水深/静水压力 | 通过或仅提示 |
| qc/qt/u2/Fr 缺失率 | 通过 |
| 非正值/范围提示 | 通过或仅提示 |
| 重复点位 | 通过 |

最小实现模块：

- 检查结论。
- 规则组。
- 问题/提示清单。
- 证据定位。
- 右侧问题详情。
- `进入地层分层`。

## 8. 当前 Web 原型的功能差距

| Capability | Current state | Needed for Flow 1 |
| --- | --- | --- |
| 随机案例生成 | 缺失 | 新增 seed 驱动的 synthetic case |
| Flow 案例条 | 缺失 | 三页统一展示 |
| 步骤标签 | 缺失 | `步骤 1/3`、`步骤 2/3`、`步骤 3/3` |
| 当前交接物 | 缺失 | 每页显示上一页产物和下一步目标 |
| 点位选择 | 弱展示 | 当前点位可点击，右侧同步 |
| 导入来源类型 | 缺失 | synthetic source 显示 |
| 字段映射 | 已有基础 | 补齐必需字段和状态标签 |
| 单位策略 | 缺失 | kPa/m/Fr/水深来源 |
| 导入预检 | 缺失 | 可检查/仅提示/存在问题 |
| 检查规则组 | 缺失 | 可筛选或至少可见 |
| IssueEvidence | 弱 | 字段、深度、行号、建议 |
| 重新检查 | 缺失 | 原型可模拟刷新 run id |
| 返回导入 | 缺失 | 存在问题时的路径 |
| 进入分层判断 | 有但弱 | 明确 `可进入地层分层` |
| Playwright 随机流 | 缺失 | seed + UI flow + evidence JSON |

## 9. 模块设计原则

Flow 1 的模块必须遵守：

- 每个模块回答一个用户问题。
- 每个模块有一个输出对象。
- 每个按钮有承接页面、面板或明确禁用态。
- 中间区展示结果和证据。
- 右侧功能区放工具、筛选、定位、建议和下一步动作。
- 状态词使用 `无问题`、`仅提示`、`存在问题`、`可检查`、`可进入地层分层`。
- 不出现内部调试词、长日志、真实导出承诺。

## 10. Flow 保证方式

每一步必须显式写出：

| Step | Consumes | Produces | Continue condition |
| --- | --- | --- | --- |
| 确认项目与点位 | SyntheticCase | selected Point | 点位有随机数据 |
| 核对导入数据 | selected Point | ImportBatch + FieldMapping + PreviewRows | 必需字段存在，深度可读 |
| 运行数据检查 | ImportBatch + PreviewRows | CheckRun + IssueEvidence | `存在问题 = 0` |
| 查看提示/问题 | CheckRun | selected IssueEvidence | 右侧显示来源和建议 |
| 进入地层分层 | CheckRun | HandoffToStratification | `无问题` 或仅有 `仅提示` |

页面按钮必须沿对象链推进，不能只改路由。

## 11. 有效验收定义

Flow 1 的验收成果必须包含：

| Evidence | Required content |
| --- | --- |
| `flow-run.json` | seed、caseId、pointName、rowCount、depthRange、field mapping count、check counts、clicked issue、final route |
| Project screenshot | Flow 条、随机点位、数据覆盖、右侧点位工具 |
| Import screenshot | Flow 条、字段映射、单位/深度预览、预检摘要 |
| Check screenshot | Flow 条、检查结论、规则组、选中提示、右侧建议 |
| 1920 screenshot | 验证宽屏无溢出/遮挡 |
| Playwright trace or step log | 用户路径：进入项目 -> 核对导入 -> 运行检查 -> 点提示 -> 进入分层 |
| Console/page error check | 无 console error、无 page error |
| Text safety scan | 不出现旧词和内部开发词 |

验收通过条件：

- Playwright 使用新 seed 启动随机案例，而不是固定 CPT09。
- UI 显示 seed 和随机点位名。
- Playwright 从 UI 读取随机点位名并沿 flow 验证，不硬编码固定样例。
- 三页都有 Flow 条、步骤标签和交接物。
- 右侧功能区在三页分别承担不同工具角色。
- 至少点击一个 `仅提示` 项，并验证右侧来源、影响、建议动作。
- 检查结论显示 `可进入地层分层`。
- 点击后确实进入 `地层分层`。
- 截图无明显重叠、错位、文字溢出。

验收失败条件：

- 页面仍显示营口/CPT09 作为 Flow 1 案例。
- Playwright 只检查静态文案，不执行用户路径。
- 没有保存 seed 或无法复现失败。
- 没有点击检查项。
- 没有最终进入地层分层。
- 右侧功能区只是状态列表，没有工具动作。

## 12. 不进入首个 Flow 1 的复杂内容

以下内容不做，或只显示禁用/未来状态：

- 真实文件上传。
- 真实 Excel/CSV 解析。
- 真实数据修复。
- 写回桌面数据库。
- 保存工程状态。
- 正式算法或官方公式。
- 正式成果交付。
- 多问题场景矩阵。
- 地层分层之后的完整链路。
- 方法实验室、研究模式、高级日志。

## 13. 建议替换旧方案

旧文档：

- `docs/prototype/flow-1-cpt09-data-prep-check-design-2026-07-09.md`

建议状态：

```text
superseded by random synthetic Flow 1 design
```

新的 Flow 1 名称：

```text
Flow 1 - 随机 CPTU 数据准备到数据检查闭环
```

新的 Case ID 模式：

```text
F1-RANDOM-<seed>
```

## 14. 确认清单

Confirmed from research:

- Goal: Flow 1 应改为随机生成 CPTU 案例，而不是固定营口/CPT09。
- Scope: 三页功能模块、随机数据、Flow 条、交接物、右侧功能区、Playwright 人类流验收。
- Non-goals: 不做真实上传、真实修复、持久化、desktop 写入、官方公式、正式成果交付。
- Acceptance criteria: 以随机 seed 生成案例，Playwright 从 UI 走完整用户路径，并产出截图和 `flow-run.json`。
- Verification: build、E2E、Playwright flow、截图、console/page error、文字安全扫描、溢出检查。
- Closure review: 用户必须能看见模块、Flow、验收证据，而不是只听自检结论。
- Stop conditions: 需要真实导入、写回数据库、正式算法或扩展到全链路时停止重新确认。

Open question:

- 用户是否认可首个随机场景采用 `valid-with-notice`：数据整体可进入地层分层，但保留一个 `仅提示` 项用于验证问题定位和右侧建议。

Implementation may start: no. Wait for user confirmation of the desired effect and random scenario.
