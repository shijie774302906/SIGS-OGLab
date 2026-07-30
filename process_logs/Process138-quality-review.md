# Process138 本地公开前质量审查

日期：2026-07-30

结论：本地产品质量门禁通过，P0 为 0，当前功能范围内 P1 为 0。尚未授权上传 GitHub 或部署。`release:audit --mode public` 仍按设计失败：正式公开前必须处理许可证、营口真实数据公开分发依据和公网 AI 转发服务部署边界。

## 1. 审查范围

- 模块集成：项目/点位、导入、检查、分层、参数、输出、快捷图册、反馈、AI 助手。
- 软件质量：TypeScript、生产依赖图、死代码、依赖漏洞、测试隔离、错误与恢复。
- 系统集成：专业模式和快捷模式从首次进入到 PDF/Excel 的跨页面交接。
- 系统质量：真实数据、持久化、性能、Chrome/Edge 双分辨率、WebKit/Firefox 冒烟。
- 安全：临时 API Key、受控工具、请求上限、CORS、超时、错误脱敏和版本库敏感信息。

## 2. 模块、接口与验证矩阵

| 区域 | 主要实现 | 关键交接 | 主要验证 |
| --- | --- | --- | --- |
| 项目/点位 | `App.tsx`、`workspaceV2.ts`、`workspaceDatabase.ts` | 项目/点位选择到当前导入草稿 | collection、lifecycle、persistence、V2 runtime |
| 数据导入 | `importPipeline.ts`、`excelImport.ts` | 原始附件到规范化草稿 | import domain/UI、Excel、多点位、真实营口/SCPT1 |
| 数据检查 | `checkDomain.ts`、`CheckDocument.tsx` | 当前检查权威到分层门禁 | check domain、governance、handoff、曲线 |
| 地层分层 | `stratificationDomain.ts`、规则与薄层模块 | 当前分层修订到参数包 | rule、simplification、drag/split/merge、Yingkou |
| 参数解译 | parameter workbench/JTS package | 分类与分层权威到参数修订 | formula goldens、异常忽略、持久化、UI 向导 |
| 成果输出 | JTS output domain/UI | 当前参数包到 PDF/Excel | authority hash、失败恢复、导出 UI |
| 快捷图册 | `QuickPlotWorkspace.tsx`、`quickPlotDomain.ts` | 粘贴/AI 整理到 15 页图册 | 600 DPI PDF、Excel、无 u2、真实营口 |
| AI 助手 | browser provider、Node BFF、DeepSeek adapter | 临时 Key 与显式数据范围 | server 24 项、UI/domain、真实 DeepSeek |
| 本地持久化 | IndexedDB + boot pointer | CAS、刷新、损坏、恢复、多标签 | database、runtime、migration、recovery |
| 反馈 | feedback UI/API | 显式字段与截图到反馈服务 | 成功、失败重试、邮箱回退、文件限制 |

## 3. 代码与冗余审查

- `tsconfig.app.json`、`tsconfig.node.json` 已启用 `noUnusedLocals` 与 `noUnusedParameters`。
- 删除 59 个经 TS6133、生产依赖和目标回归共同证明不可达的顶层声明。
- 删除后构建、最终 88 项高风险目标回归及 412 项分层产品回归均通过。
- 生产入口依赖图：68 个模块可达，0 个孤立生产模块，0 个无法解析的代码导入。
- `App.tsx` 当前约 13,939 行 / 800 KB，`styles.css` 约 8,514 行 / 257 KB。它们是 P2 维护债务；本轮不做高风险拆分。
- 构建主包约 1,559 KB（gzip 440 KB），存在代码分包优化空间，列为 P2 性能债务。

## 4. 安全审查

- 生产依赖和全部依赖 `npm audit` 均为 0 个漏洞；PostCSS/Nanoid 已更新到修复版本。
- 版本库跟踪文件中未发现 `.env`、`mishi.md`、私钥文件或真实 DeepSeek Key 模式。
- Key 只保存在 React ref 内存中；刷新、断开和卸载会清除。
- DeepSeek 连接与每次 turn 都必须携带临时 Key；Node 服务不建立 Key 会话，也不复用验证 Key。
- Node BFF 仅允许 localhost/127.0.0.1 来源，限制 512 KB 请求、2 个并发和 60 秒超时。
- 工具白名单按专业、导入、快捷导入和图册解读隔离；写操作必须形成待确认提案。
- 对外发送同意凭据绑定 `scope + authorityHash`；切换工程、点位、导入来源或图册权威后必须重新确认。
- 数据导入页只保留路由专属“AI 整理数据”入口，不会误打开专业解译助手。
- 真实 DeepSeek 固定数据冒烟通过，未输出 Key。

## 5. 最终测试结果

- `npm run build`：通过。
- `release:audit:test`：4/4。
- assistant server：24/24。
- domain-fast：260/260。
- ui-isolated：120/120。
- real-serial：32/32。
- 产品分层回归：412/412。
- Chrome 与 Edge：1440×900、1920×1080 通过，无页面错误、控制台错误或不可接受横向溢出。
- WebKit：1440×900 冒烟通过。
- Firefox：Playwright Firefox 在进入网页前因本机 SWGL framebuffer 初始化失败而启动超时；属于测试主机限制，未形成产品通过结论。

机器证据见：

- `process_logs/Process138-release-audit.json`
- `process_logs/playwright-mcp/process138-release-readiness/browser-check.json`
- `process_logs/playwright-mcp/process138-release-readiness/*.png`

## 6. 剩余项

### P0

无。

### P1

当前本地功能范围内无。

正式上传公开仓库前：

1. 维护者必须选择并确认开源许可证；当前 `UNLICENSED`、`private: true` 与缺少 `LICENSE` 是公开门禁。
2. `sample_data/source/yingkou` 的真实 XLSX 必须移除，或补齐数据所有者许可、脱敏记录及 `PUBLIC-DISTRIBUTION` 记录。
3. 若公网继续提供 AI 助手，需单独设计同源 HTTPS BFF、允许来源、速率限制和运维；当前服务刻意只接受本机来源。

### P2

- 拆分 `App.tsx`、`styles.css` 和主 JS 包，降低维护与首次加载成本。
- 在另一台有可用无头 Firefox 图形环境的 Windows 主机补跑 Firefox 冒烟。
- 将模块/页面/测试映射继续机械化，避免新功能遗漏测试分层。
- 为 Fuzzy、Modified Robertson 2016、Schneider 2008 三种“研究性对照”方法逐步补齐独立方法合同和外部黄金样例。
