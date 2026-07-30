# Process127 - DeepSeek 会话连接入口

Date: 2026-07-25

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 让普通用户直接在专业 AI 助手内连接自己的 DeepSeek API Key，不再要求编辑本机环境文件。
- 密钥只在当前标签页内存中存在；工程数据外发和工程对象修改继续分别由用户同意与既有人工确认门禁控制。

## Result

- 专业模式右侧 AI 助手新增紧凑连接卡和 API Key 弹窗，明确“目前仅支持 DeepSeek”“仅本次打开有效”。
- 连接状态分为“尚未连接、验证中、密钥已验证、DeepSeek 已启用、服务暂不可用”；普通用户能原位重试、更换密钥或断开。
- 首次连接和更换密钥使用不同标题、说明与主按钮；新密钥验证失败或取消时保留原连接。
- Key 仅由应用根部 Connection Provider 的 `useRef` 持有，不进入 localStorage、sessionStorage、IndexedDB、项目快照、日志、截图或客户端构建。
- `/connect` 只验证临时 Key，不接收工程上下文；`/turn` 每次临时携带 Key，服务端不保存 session、nonce 或 Key。
- 平台无关的无状态请求核心与本地 Node HTTP 适配器分离；未来部署只需增加具体 Serverless 平台薄适配器。
- 提问前必须明确同意工程数据发送范围；请求层再次强制检查该同意，不能只依赖输入框禁用。
- 发送范围明确披露项目/点位名称、流程状态、最多 80 层的深度与土类摘要，以及按需读取的不超过 20 m、最多 120 行 qc/fs/u2 窗口；不发送上传文件或整孔数据。
- 项目、点位、页面、权威状态、密钥、断开或取消变化都会终止旧请求并拒绝迟到响应；模型仍只能生成需人工确认的建议。
- 无选中土层时隐藏不适用的土层解释快捷入口；连接弹窗提供 DeepSeek 开放平台帮助链接。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- Domain fast：234/234 通过。
- UI isolated：98/98 通过。首次并行运行出现两个既有分层抖动用例失败；两条单独复现均通过，随后按原并行配置完整重跑 98/98 通过。
- Real serial：30/30 通过；包含营口真实工作流、持久化、快速图册和全规模分层性能。
- Assistant server：12/12 通过；覆盖无状态能力、无项目数据连接验证、每请求临时 Key、错误脱敏和 Node 适配合同。
- Assistant domain/UI：8/8、10/10 通过；覆盖外发同意底层门禁、连接、失败保留、取消、断开、刷新、迟到响应和工程建议确认。
- 真实 DeepSeek opt-in smoke：通过，模型返回受允许的 `read_workflow_summary` 工具调用；密钥未输出。
- 1440×900、1920×1080：页面与助手面板水平溢出均为 0，右侧面板位于视口内，console/page error 为 0，Web Storage 无 Key 标记。
- Visual、Geotechnical/Security、Copy/IA 三类只读复查均为 PASS，P0/P1/P2 为 0。
- `npm.cmd run process:test`：13/13 通过。
- `npm.cmd run test:tiers:test`：5/5 通过。
- `npm.cmd run knowledge:validate`：22 个问题、57 条更新有效。

## Evidence

- `process_logs/playwright-mcp/process127-assistant-connection/assistant-connect-dialog-1440x900.png`
- `process_logs/playwright-mcp/process127-assistant-connection/assistant-connected-1920x1080.png`
- `process_logs/playwright-mcp/process127-assistant-connection/assistant-replace-failed-1440x900.png`
- `process_logs/playwright-mcp/process127-assistant-connection/assistant-proposal-1440x900.png`
- `process_logs/playwright-mcp/process127-assistant-connection/assistant-applied-1920x1080.png`
- `process_logs/playwright-mcp/process127-assistant-connection/assistant-confirmed-upstream-1440x900.png`
- `process_logs/playwright-mcp/process127-assistant-connection/browser-check.json`
- `process_logs/playwright-mcp/process127-assistant-connection/connection-browser-check.json`
- `process_logs/playwright-mcp/process127-assistant-connection/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process127.json`

## Known Problems

- KPB-002：连接验证显示运行、禁用、成功、失败和取消恢复状态；不预置已连接结果。
- KPB-003：更换、断开、页面或权威变化会取消旧请求并清空旧对话；迟到响应不能写回。
- KPB-004：无效 Key、上游失败、限流、网络、超时和本地中继不可用均使用固定脱敏文案与原位恢复入口。
- KPB-006：Key 不进入任何浏览器权威存储、项目快照、日志、构建或精选证据。
- KPB-007：营口真实数据 30 条串行用例通过，包含首次运行、切换、持久化和完整 JTS 工作流。
- KPB-011：连接问题在 AI 功能坞原位修复，恢复后继续原专业流程；原始测量和工程权威不变。
- KPB-012：双分辨率、真实营口数据、浏览器机器断言和三类独立评审共同证明用户动作与工程语义。
- KPB-015：取消验证、更换、断开、刷新和迟到响应均不能恢复或覆盖已清除的 Key/连接。

## Boundaries

- 当前只实现 DeepSeek；未实现第二家模型供应商。
- 当前提供平台无关核心和本地 Node 适配器，但尚未绑定或部署 Vercel、Netlify、Cloudflare 等具体云平台。
- 纯 Vite 静态托管不能独立完成 API 转发；公网使用 AI 助手时仍需部署同源 Serverless 适配器。
- Key 不持久化，因此刷新、关闭或新开标签页后需要重新连接。
- 助手只能按白名单读取和形成建议；工程公式、土类、分层修订、原始测量和最终采纳仍由既有规则与工程师决定。
