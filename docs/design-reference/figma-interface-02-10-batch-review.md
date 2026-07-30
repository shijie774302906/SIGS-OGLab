# Figma/UI 批次 02-10 草稿记录

日期：2026-07-04  
状态修正：2026-07-08

## 1. 本轮对象

本轮继续补齐 `03 数据导入`、`04 数据检查` 之后的 UI 设计稿。起初 Figma MCP 连续返回 `MCP startup cancelled`，因此先生成本地可审阅 PNG 图稿并保留可重复生成脚本；随后 connector 恢复，已同步为一组可编辑 Figma frames。

生成脚本：

- `tools/design/generate_ui_design_drafts.ps1`

本轮没有修改 WinUI 代码、SQLite schema、导入解析、质量检查规则、公式或导出语义。

2026-07-08 审计结论：本批次整体降级为 `draft / blocked for review`。这些图稿只保留为后续单页循环的业务素材，不得作为开发 handoff 或实现依据。

降级原因：

- 本批次一次覆盖 `02/05/05A/05B/06/06A/07/08/09/10`，不符合当前“每轮只处理一个页面或一组强相关弹窗”的 workflow。
- 初始批次未完成独立 agent review。
- 图稿使用了相似 VSCode-like 壳层，但未证明严格复制已验收 `01 Workbench shell` 或已验收 `03/04` 页面版型。
- `08 方法实验室`、`09 研究模式` 是高级入口草稿，`10 全局状态集` 是 QA/状态规范画板，不能进入默认主流程。
- Figma sync 和 PNG export 只证明素材存在，不等于设计验收通过。

## 2. 图稿清单

| 图稿 | 类型 | 截图 | 尺寸 |
| --- | --- | --- | --- |
| `02 项目/点位数据` | 主流程页 | `app_data/temp/figma-02-project-points.png` | 1920 x 1080 |
| `05 地层分层默认页` | 主流程页 | `app_data/temp/figma-05-stratification-main.png` | 1920 x 1080 |
| `05B 地层分层方法选择器` | 页面内弹窗 | `app_data/temp/figma-05b-stratification-method-selector.png` | 780 x 560 |
| `05A 地层分层对比/详情态` | 主流程高级状态 | `app_data/temp/figma-05a-stratification-comparison.png` | 1920 x 1080 |
| `06 参数解译默认页` | 主流程页 | `app_data/temp/figma-06-parameter-interpretation-main.png` | 1920 x 1080 |
| `06A 参数方法选择器` | 页面内弹窗 | `app_data/temp/figma-06a-parameter-method-selector.png` | 820 x 560 |
| `07 成果输出` | 主流程页 | `app_data/temp/figma-07-output-main.png` | 1920 x 1080 |
| `08 方法实验室` | 高级入口页 | `app_data/temp/figma-08-method-lab.png` | 1920 x 1080 |
| `09 研究模式` | 高级入口页 | `app_data/temp/figma-09-research-mode.png` | 1920 x 1080 |
| `10 全局状态集` | 设计验收画板 | `app_data/temp/figma-10-global-states.png` | 1920 x 1080 |

## 2.1 Figma 可编辑节点

| 图稿 | Figma 节点 | 说明 |
| --- | --- | --- |
| `02 项目/点位数据 - synced editable` | `52:2` | 可编辑 frame |
| `05 地层分层默认页 - synced editable` | `52:137` | 可编辑 frame |
| `05A 地层分层对比详情态 - synced editable` | `52:301` | 可编辑 frame |
| `06 参数解译默认页 - synced editable` | `52:412` | 可编辑 frame |
| `07 成果输出 - synced editable` | `52:548` | 可编辑 frame |
| `08 方法实验室 - synced editable` | `52:680` | 可编辑 frame |
| `09 研究模式 - synced editable` | `52:800` | 可编辑 frame |
| `10 全局状态集 - synced editable` | `52:894` | 可编辑 frame |
| `05B 地层分层方法选择器 - synced editable` | `52:1039` | 可编辑弹窗 frame |
| `06A 参数方法选择器 - synced editable` | `52:1050` | 可编辑弹窗 frame |

Figma 同步检查截图：

- `app_data/temp/figma-05-stratification-synced-editable-screenshot.png`

## 3. 设计判断

主流程顺序保持：

```text
项目/点位数据 -> 数据导入 -> 数据检查 -> 地层分层 -> 参数解译 -> 成果输出
```

本批图稿重点锁定三个产品事实：

- `地层分层` 是第一个核心消费页：显示方案、曲线剖面、层位、SBT/分类证据摘要、层表和采纳动作。
- `参数解译` 必须消费已选择或已采纳的分层方案：按参数项组织方法，不按 pyCPT/Groundhog 等方法名组织主页面。
- `成果输出` 只消费已采纳分层方案和已采纳参数方案：候选、研究和调试结果不直接进入正式成果包。

`08 方法实验室` 和 `09 研究模式` 被明确设计为高级入口，不抢默认主流程；它们的结果必须路由回 `05 地层分层` 或 `06 参数解译` 作为候选/草稿。

## 4. 入口闭环

| 入口 | 落点 | 状态规则 |
| --- | --- | --- |
| `运行分层` | `05B 地层分层方法选择器` | 运行结果先成为候选方案，不覆盖已采纳方案。 |
| `采纳为当前分层` | `05 地层分层` 二次确认/采纳动作 | 采纳后成为 `06 参数解译` 默认输入。 |
| `用于参数试算` | `06 参数解译` 试算态 | 不写正式成果，不能直接输出。 |
| `选择方法` | `06A 参数方法选择器` | 按参数项、土类、输入可用性筛选方法。 |
| `采纳参数方案` | `06 参数解译` 采纳动作 | 成为 `07 成果输出` 输入。 |
| `生成成果包` | `07 成果输出` | 仅预检通过且格式真实支持时可用。 |
| `发送到主流程` | `08/09` 到 `05/06` | 只能作为候选/草稿，不直接成为正式成果。 |

## 5. 自检结论

以下为 2026-07-04 初始自检，已被 2026-07-08 独立审计覆盖，不再作为通过依据。

| 检查项 | 结论 | 说明 |
| --- | --- | --- |
| VSCode-like 壳层 | superseded | 初始自检只证明存在 VSCode-like 元素，未证明严格继承已验收版型。 |
| 中文 UI | superseded | 后续 Figma metadata 审计发现多个按钮文本节点仍为 `Button label`，需要单页重审。 |
| 信息边界 | risk | 主流程默认未展示内部 runner，但 08/09/10 的级别需要重新收敛。 |
| 地层/参数重点 | risk | 05/06/07 方向可保留，但不能跳过单页 gate。 |
| 入口闭环 | risk | 关键入口有粗略落点，但采纳、失败、禁用和数据改写影响仍需逐页补齐。 |
| Agent 审阅 | blocking | 初始批次未完成独立 agent re-check；后续补审判定本批次为 draft only。 |
| Figma 同步 | evidence only | Connector 创建了可编辑 frames，但同步不等于通过。 |

## 5.1 2026-07-08 独立审计结论

Blocking：

- `02-10` 批量生成破坏单页精修流程。
- `52:*` 主页面外壳大坐标基本正确，但像重新绘制的相似壳层，未严格复用 `01 Workbench shell`。
- `docs/ui-02-10-mainflow-development-handoff.md` 已降级为 `draft reference`，不得作为开发依据。
- `05B/06A` 方法选择器需要重画统一弹窗/抽屉，当前按钮宽度、文案和能力筛选逻辑不足。
- `08/09` 降级为 P2 高级入口草稿；`10` 只保留为 QA/状态规范画板。

Risk：

- `02/05/06/07` 可保留业务内容，但必须重套已验收壳层。
- `05A` 只能作为 `05` 的高级状态，不能作为独立主流程页。
- 方法选择器必须按输出类型、适用土类、所需输入、工程/研究等级筛选，再展示方法名。

## 6. 后续动作

1. 停止批量推进。
2. 从 `05 地层分层默认页` 开始单页循环。
3. 每页先补功能定义、版型继承对照、入口闭环、状态覆盖和 reviewer assignments。
4. 单页无 blocking 后，才允许生成页面级 development handoff。
