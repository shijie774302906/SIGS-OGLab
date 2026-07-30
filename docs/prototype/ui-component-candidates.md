# UI Component Candidates

日期：2026-07-08

用途：记录 Web Prototype 后续可调用或可接入的 UI 组件资源。当前代码仍以本地 React + CSS 为主，本清单用于后续需要组件化、接入开源库或做视觉二次重构时快速定位。

## 1. 当前本地组件落点

| 组件/模式 | 当前路径 | 当前状态 | 后续建议 |
| --- | --- | --- | --- |
| VSCode-like Workbench Shell | `src/App.tsx` / `src/styles.css` | 已实现 | Web-P2 可拆到 `src/components/workbench/` |
| Top Chrome / Command Center | `src/App.tsx` `TopChrome` | 已实现 | 可拆为 `src/components/workbench/TopChrome.tsx` |
| Activity Bar | `src/App.tsx` `ActivityBar` | 已实现 | 可拆为 `src/components/workbench/ActivityBar.tsx` |
| Explorer Workflow Tree | `src/App.tsx` `Explorer` | 已实现 | 可拆为 `src/components/workbench/WorkflowExplorer.tsx` |
| Editor Tabs | `src/App.tsx` `EditorTabs` | 已实现 | 可拆为 `src/components/workbench/EditorTabs.tsx` |
| Bottom Panel | `src/App.tsx` `BottomPanel` | 已实现 | 可拆为 `src/components/workbench/BottomPanel.tsx` |
| Right Properties Panel | `src/App.tsx` `StratificationRightPanel` / `GenericRightPanel` | 已实现 | 可拆为 `src/components/workbench/RightPanel.tsx` |
| Pro-style Page Header | `src/App.tsx` `StratificationDocument` / `SupportingDocument` | 本轮引入 | 可抽为 `src/components/pro/PageHeader.tsx` |
| Statistic Tiles | `src/App.tsx` `SummaryTile` | 本轮引入 | 可抽为 `src/components/pro/StatisticTile.tsx` |
| Query Bar | `src/App.tsx` `pro-query-bar` markup | 本轮引入 | 可抽为 `src/components/pro/QueryBar.tsx` |
| ProList-like Scheme List | `src/App.tsx` `SchemeList` | 本轮引入 | 可抽为 `src/components/stratification/SchemeList.tsx` |
| ProTable-like Layer Table | `src/App.tsx` `LayerTable` | 本轮引入 | 可抽为 `src/components/stratification/LayerTable.tsx` |
| Layer Track | `src/App.tsx` `LayerTrack` / `DepthAxis` | 已实现 | 可抽为 `src/components/stratification/LayerTrack.tsx` |
| SBTn Evidence Scatter | `src/App.tsx` `EvidenceScatter` | 已实现 | 可抽为 `src/components/stratification/EvidenceScatter.tsx` |

## 2. Priority Reference: Ant Design Pro

| 可借鉴对象 | 来源 | 可用于本项目 | 推荐接入方式 | 建议本地路径 |
| --- | --- | --- | --- | --- |
| Ant Design Pro | https://github.com/ant-design/ant-design-pro | 企业后台页面骨架、路由/菜单/权限组织、页面级布局 | 先借鉴结构，不整仓迁移 | `docs/prototype/ant-design-pro-notes.md` |
| ProComponents | https://github.com/ant-design/pro-components | ProTable、ProForm、ProCard、StatisticCard、Descriptions 等企业组件 | Web-P2 后按需安装 `@ant-design/pro-components` | `src/components/pro-adapters/` |
| Ant Design Table | https://ant.design/components/table/ | 层位表、参数表、质量问题列表 | 若表格交互复杂，再用 `antd` Table 替换本地表格 | `src/components/table/` |
| Ant Design Component Overview | https://ant.design/components/overview/ | Button、Tag、Tabs、Descriptions、Alert、Result 等基础件 | 优先作为组件命名和状态模式参考 | `src/components/antd-inspired/` |

当前已落地的 Ant Design Pro 借鉴点：

- `PageContainer` 思路：页面头、面包屑、状态标签和动作区。
- `StatisticCard` 思路：四个摘要指标优先展示当前方案、层位、质量门和正式参数输入。
- `ProTable` 思路：表格上方带标题、记录数、列设置/导出占位，行点击联动右侧详情。
- `ProList` 思路：分层方案用列表项表达名称、状态、来源和复核数量。
- `Descriptions` 思路：右侧面板用属性行表达当前对象，而不是长说明文。

## 3. Other Open-source Candidates

| 资源 | 来源 | 适合用途 | 接入条件 | 建议本地路径 |
| --- | --- | --- | --- | --- |
| shadcn/ui | https://github.com/shadcn-ui/ui | 高可定制控件、Dialog、Dropdown、Command、Form、Tabs | 需要 Tailwind 或本地化改造；适合做小而精控件 | `src/components/shadcn-inspired/` |
| shadcn/ui Docs | https://ui.shadcn.com/docs | open code 组件组织方式、可复制组件源码策略 | 如果需要“组件源码归仓”而不是依赖库 | `docs/prototype/shadcn-notes.md` |
| Tabler | https://github.com/tabler/tabler | 开源后台模板、空状态、列表、表格、状态页 | 若需要成套 admin 页面样式，可参考但不直接覆盖 VSCode shell | `docs/prototype/tabler-notes.md` |
| Tabler Core | `@tabler/core` | HTML/CSS dashboard kit | 只在需要 Bootstrap 体系时考虑 | `src/components/tabler-inspired/` |
| Tabler Icons | https://github.com/tabler/tabler-icons | 大量 MIT 图标 | 当前已用 lucide；只有缺图标时再考虑 | `src/icons/` |

## 4. Recommended Integration Order

1. Keep current VSCode-like shell local and stable.
2. Extract current reusable components into `src/components/workbench/`, `src/components/pro/`, `src/components/stratification/`.
3. If tables need sorting/filtering/pagination/column settings, install `antd` first and wrap Table locally.
4. If page-level CRUD and query forms expand, install `@ant-design/pro-components` and map to local adapters.
5. Use shadcn/ui only for components that benefit from source-level ownership, such as command palette, drawer, dialog, popover, and segmented controls.
6. Use Tabler only as a visual reference for simple admin page density, not as the main shell.

## 5. Non-goals

- Do not migrate this prototype into a full Ant Design Pro app until routing, data contracts, and persistence boundaries are confirmed.
- Do not replace the VSCode-like shell with a generic admin dashboard shell.
- Do not introduce desktop `app_data`, SQLite schema changes, formal formulas, or production export behavior as part of component integration.
- Do not display unimplemented controls as successful actions.

