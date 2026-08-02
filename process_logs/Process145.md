# Process145 - 图册解读持续会话与精确跨页证据

Date: 2026-08-02

Status: `closed / verified / deployed`

## Goal

修复快捷图册 AI 在长回答、跨页和多轮对话中的超时、会话割裂、重复回答与证据漂移；使同一图册保持一段只读会话，并让 DeepSeek 按问题自主读取当前页、其他页、方法、图表和有限深度测点证据。

## Result

- 同一图册切换页面不会清空对话；每轮问题都绑定当时页面来源，旧回答继续保留原来源。
- 当前页随每轮请求携带有界同源证据；跨页精确比较缺少原始证据时，模型必须重新调用目标页只读工具，不能把历史回答当作工程证据。
- 页面、方法、图表和深度窗口工具保持只读；没有导入、修改、重算或写回权限。
- Markdown 标题、列表、表格、引用和代码可安全渲染，HTML 与工具协议不会作为页面内容执行或泄露。
- 统一了 Fuzzy/JTS 窗口总宽 1.0 m、半径 0.5 m、Schneider 5 类、逐点有效数与连续层覆盖等证据语义；Bq 公式保持 `(u2-u0)/(qt-σv0)`。
- 超时等待扩大到 2 分钟并保留内部恢复；上下文过长时压缩早期对话而不破坏工具调用关联。

## Verification

- `npm.cmd run build`：通过。
- `npm.cmd run test:assistant-server`：41/41 通过。
- `npx.cmd playwright test tests/e2e/quick-plot-domain.spec.ts tests/e2e/quick-plot-ui.spec.ts --workers=1`：75/75 通过。
- 生产环境连续 10 轮跨页问答：10 条用户消息、10 条助手回答、0 次刷新、0 个可见错误、0 次恢复提示。
- 精确深度读取：20–21 m 共 5 点；qc 1702–2008 kPa、fs 110–124 kPa、u2 505–522 kPa。
- 跨页来源专项复测：从砂土参数页切到黏性土参数页比较时，第二轮重新读取两页原始证据，R05/R06 来源未混淆。
- Markdown 验收：3 个标题、11 个列表项、1 个表格；无原始 Markdown、脚本或工具协议泄漏。
- 1440×900 与 1920×1080 均通过页面、滚动、对话来源和 Markdown 检查。
- Known Problem Gate 与 evidence manifest audit：通过。

## Evidence

- `process_logs/playwright-mcp/process145-quick-ai-timeout/evidence-manifest.json`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/production-validation.json`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/production-cross-page-engineering.json`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/production-cross-page-engineering.png`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/production-cross-page-engineering-scope-followup.json`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/production-cross-page-engineering-scope-followup.png`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/cross-page-conversation-1440x900.png`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/cross-page-conversation-1920x1080.png`
- `process_logs/playwright-mcp/process145-quick-ai-timeout/markdown-answer-1440x900.png`
- `process_logs/knowledge-reviews/Process145.json`

## Release

- Commit: `edae629`
- Production: `https://sigs-oglab.com`

## Boundaries

- 图册助手仍为只读，不修改输入、分类、分层、参数或图册。
- 深度窗口工具精确读取 qc、fs、u2；不把这三条原始曲线擅自转换为土类结论。
- AI 回答用于解释图册与证据，不替代工程师复核和正式工程采用。
