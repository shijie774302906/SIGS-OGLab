# Process087 - 数据准备与检查连续指南

Date: 2026-07-14

Status: `closed / implemented / verified / independently reviewed`

## Goal

把“项目/点位数据 → 数据导入 → 数据检查 → 地层分层”收敛为连续、可恢复的五步指南；让工程师只处理当前需要判断的一件事，并把探头、水与孔压及 JTS 数值问题在进入地层分层前解决。

## Implemented

- 新项目自动从探头选择开始；导入后确认 u2 路线、水深和压力基准，再自动进入数据检查。
- 三页共享五步进度：完成为绿色、当前步骤明确、刷新和切换点位后从当前状态恢复。
- 项目页根据最高已完成步骤给出唯一下一步；检查通过后只在中心保留“进入地层分层”，右栏已确认配置折叠为摘要。
- 数据检查默认一次显示一个问题、必要 qc/fs/u2 与 JTS qt/qnet/Fr 证据，以及三个固定工程选择：排除此行、手动调整、保留原值。
- 来源定位降为次级链接；规则、历史、全量曲线和平滑治理默认折叠。
- 单元格修订只允许当前定位行的原始输入字段；保存原值、有效值、原因、来源行和修订，上传附件与原始测量不变。
- JTS 前置检查与正式分类共用 `qc + (1-a)u2`、qnet 和 Fr 计算路径；无 u2 路线不再把孔压绘制为 0。
- 检查运行冻结探头上下文、探头规格、水位上下文和 JTS 上下文；选择器和数据库完整性检查会拒绝不一致的当前结果。
- 保留、排除和数值修订均可追溯；重复确认相同探头/水位不新增修订，也不会误使检查失效。
- 三点位的导入草稿、检查运行和当前选择相互隔离；批量导入不会跨点位串写。

## Verification

- `npm.cmd run build`: passed。
- 上下文、数值恢复、检查交接、数据治理、无 u2、参数/成果和真实营口受影响回归：passed；最终受影响集合 `12/12` passed。
- 最终 Chromium Playwright 全量：`225/225` passed，耗时 `6.8m`。
- 真实营口工作流：passed，单文件耗时 `5.7m`。
- `1440x900` 与 `1920x1080`：页面、主文档和右栏横向溢出均为 `0`；浏览器错误为空。
- 交互证据：指南打开约 `103 ms`、检查提交约 `214 ms`、修订后复检约 `140 ms`、刷新恢复约 `254 ms`；记录到的长任务为空。
- 三个只读 review agents 最终均为 P0=0、P1=0、`Safe to close: Yes`。

## Evidence

- `process_logs/playwright-mcp/process087-preparation-guide/01-probe-guide-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/02-water-guide-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/03-check-issue-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/04b-manual-edit-ready-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/05-check-recovered-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/06-project-ready-after-reload-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/06-three-point-after-reload-1440x900.png`
- `process_logs/playwright-mcp/process087-preparation-guide/07-project-right-panel-hidden-1440x900.png`
- 对应 `1920x1080` 截图。
- `process_logs/playwright-mcp/process087-preparation-guide/browser-check.json`
- `process_logs/playwright-mcp/process087-preparation-guide/cross-point-reload.json`

## Boundary

- 本轮没有覆盖上传附件或原始测量，没有实现整表自由编辑。
- 本轮没有新增云服务、后端数据库或多用户协作；数据继续保存在各自浏览器本机工作区。
- 工程师仍负责对异常点、土层和参数适用性作最终判断；系统只提供受限选择、证据、可追溯修订和流程引导。

