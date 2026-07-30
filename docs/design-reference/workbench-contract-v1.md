# Workbench Contract v1

日期：2026-06-27

适用阶段：`UX-V2 i=1A` 到 `i=1D`

本文档定义 VSCode-like 专业岩土/CPTU 工作台的第一版工程合同。它不是最终视觉稿，而是后续 `WorkbenchHost`、面板生命周期、布局持久化和截图验收必须共同遵守的边界。

## 1. 目标

把当前固定页面导航逐步升级为单主窗口、多文档、多面板、可恢复布局的工程工作台：

- 顶部显示当前项目上下文、视图/窗口入口、流程文档入口和重置布局入口。
- 左侧承载工程流程树，用项目范围 -> 数据导入 -> 数据检查 -> 测试解译/参数解译 -> 成果输出表达工作推进顺序。
- 中央承载流程文档和主工程证据区，使用文档 Tab 管理。
- 右侧承载随当前对象变化的属性、方法、参数、预检 inspector。
- 底部承载问题、运行日志、导出记录、QA 消息。
- 关闭、折叠、最大化、恢复面板只改变视图状态，不改变业务数据。

## 2. 非目标

当前阶段不做：

- 任意拖拽 docking。
- OS 级浮动窗口。
- Tab tear-out。
- 插件系统。
- 多编辑器分屏。
- 数据库 schema 改动。
- 导入提交语义改动。
- 解释算法、公式、SBT 边界改动。
- 导出文件内容合同改动。

## 3. 截图与运行基线

- 工作区：`D:\CPT-UIQA`
- 启动：`Launch-OffshoreGeotechWorkbench.cmd`
- 主机验收截图：物理桌面全截图 `1920x1080`
- DPI 路线：优先 per-monitor DPI awareness，再读 `SM_XVIRTUALSCREEN`、`SM_YVIRTUALSCREEN`、`SM_CXVIRTUALSCREEN`、`SM_CYVIRTUALSCREEN`
- 结果路径：`app_data/temp/`
- 当前 UIA 验收优先使用 ASCII `AutomationId`，避免中文选择器依赖。

## 4. 默认布局尺寸

这些尺寸是当前工作台壳层合同。布局状态可以持久化和 clamp，但不能让中心证据区被辅助面板挤到不可读。

| 区域 | 默认 | 最小 | 最大/折叠 |
| --- | ---: | ---: | ---: |
| Top bar | 48 px | 44 px | 56 px |
| Left pane | 280 px | 220 px | collapsed rail 44 px |
| Right inspector | 320 px | 280 px | 420 px |
| Bottom panel | compact strip 36 px | 36 px | expanded drawer 160 px |
| Status bar | 24 px | 22 px | 28 px |

中心主证据区合同：

- 在 `1920x1080` 全屏、左右面板显示且底部保持默认紧凑状态时，`WorkbenchViewport` 可见尺寸不得小于 `960x560`。
- 默认状态下，`WorkbenchViewport` 面积必须大于任一单个辅助面板面积。
- 中央文档 host 不可关闭；只能最大化/还原。
- 当辅助面板关闭或折叠时，释放空间必须回到 `WorkbenchDocumentHost`。

## 5. AutomationId 合同

工作台壳层必须提供以下稳定 ASCII `AutomationId`：

| AutomationId | 含义 |
| --- | --- |
| `WorkbenchTopBar` | 顶部项目上下文和命令入口 |
| `WorkbenchViewMenuButton` | 显示/恢复面板入口 |
| `WorkbenchOpenDocumentButton` | 打开流程文档入口 |
| `WorkbenchOpenDocumentMenuItem_ProjectOverview` | 顶部打开项目概览文档命令 |
| `WorkbenchOpenDocumentMenuItem_DataImport` | 顶部打开数据导入文档命令 |
| `WorkbenchOpenDocumentMenuItem_DataCheck` | 顶部打开数据检查文档命令 |
| `WorkbenchOpenDocumentMenuItem_Interpretation` | 顶部打开测试解译文档命令 |
| `WorkbenchOpenDocumentMenuItem_Parameters` | 顶部打开参数解译文档命令 |
| `WorkbenchOpenDocumentMenuItem_Export` | 顶部打开成果输出文档命令 |
| `WorkbenchResetLayoutButton` | 恢复默认布局 |
| `WorkbenchObjectTreePane` | 左侧工程流程树 |
| `WorkbenchDocumentHost` | 中央文档 Tab 宿主 |
| `WorkbenchDocumentTab_ProjectOverview` | 默认项目概览文档 Tab |
| `WorkbenchDocumentTab_DataImport` | 数据导入文档 Tab |
| `WorkbenchDocumentTab_DataCheck` | 数据检查文档 Tab |
| `WorkbenchDocumentTab_Interpretation` | 测试解译文档 Tab |
| `WorkbenchDocumentTab_Parameters` | 参数解译文档 Tab |
| `WorkbenchDocumentTab_Export` | 成果输出文档 Tab |
| `WorkbenchViewport` | 中央主工程证据区 |
| `WorkbenchInspectorPane` | 右侧属性/方法/预检面板 |
| `WorkbenchBottomPanel` | 底部质量/运行/成果事件区；默认紧凑状态条 |
| `WorkbenchBottomSummary` | 底部紧凑状态摘要 |
| `WorkbenchBottomTab_Issues` | 底部问题 Tab |
| `WorkbenchBottomTab_Log` | 底部运行日志 Tab |
| `WorkbenchBottomTab_Exports` | 底部导出记录 Tab |
| `WorkbenchStatusBar` | 底部状态条 |

## 6. 布局状态合同

布局持久化从 i=1D 开始，文件位置为：

```text
app_data/settings/workbench-layout.v1.json
```

规则：

- 当前版本写入 JSON；`Version` 为 `2` 时使用底部默认紧凑状态。
- JSON 只保存 UI layout，不保存或修改业务数据。
- 坏 JSON、旧版本、越界尺寸、分辨率变化必须 fallback 或 clamp，不能导致白屏、离屏或启动失败。

## 7. i=1A 关闭条件

i=1A 可关闭必须满足：

- `FIXED_ROUTES.md` 当前主机路线为 `D:\CPT-UIQA` 和 `1920x1080`。
- 关键截图脚本默认路线为 `D:\CPT-UIQA` 和 `1920x1080`。
- 本文档记录工作台 AutomationId、默认尺寸、非目标和布局状态边界。
- `tools/uiregression/check_workbench_contract.ps1` 返回 `WORKBENCH_CONTRACT_CHECK=PASS`。
- `git diff --check` 通过，允许既有 CRLF warning，但不得有 whitespace error。
