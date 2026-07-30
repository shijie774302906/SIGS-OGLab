# Process126 - 受控 DeepSeek 专业解译助手

Date: 2026-07-24

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 在专业工作台加入可对话的工程辅助操作员，让模型能够读取最小必要的当前状态、解释证据并形成受控修改建议。
- 继续以浏览器内既有领域规则、修订、门禁和人工确认为唯一工程权威；模型不得直接修改项目或原始测量。

## Result

- 专业模式右侧功能坞新增“当前工具 / AI 助手”切换，不新增独立页面，也不挤占中心工程图表。
- 助手支持受控读取当前工作流摘要，以及泥面以下、向下为正、跨度不超过 20 m、最多 120 行的 qc/fs/u2 深度窗口。
- 深度窗口明确使用 m 与 kPa，保留空值且不插值；抽样结果明确禁止用抽样点间距判断原始深度间断。
- V1 只开放四个白名单工具：读取摘要、读取深度窗口、建议修改当前层工程大类、建议移动当前选中边界。
- 模型文字本身不能写入项目。修改先形成含对象、前后值、理由、影响、来源和 authority hash 的建议卡，由工程师确认后才调用既有分层命令。
- 已确认分层的首次修改会创建工作草稿；已有草稿时只更新草稿。旧确认修订、原始测量和下游权威保持不变，直到工程师通过原流程提交新修订。
- 项目、点位、页面或权威状态变化会终止旧对话上下文；迟到响应、重复 commandId 和 stale proposal 均不能覆盖当前状态。
- 本机代理持有 DeepSeek 密钥，浏览器只调用本地 `/api/assistant`；源码、客户端包、日志、项目数据和精选证据不含密钥。
- 无服务、限流、取消、错误格式和重连均有简洁恢复路径；原专业流程不依赖 AI 服务。
- 新轮换密钥的最小只读 DeepSeek smoke test 已通过，模型按要求返回 `read_workflow_summary` 工具调用。

## Verification

- `process_logs/verification/Process126-closure.json`：`closure`，69/69 个测试文件，10 个编排步骤全部退出码 0。
- `npm.cmd run build`：通过。
- Assistant server：5/5 通过。
- Domain fast：233/233 通过。
- UI isolated：95/95 通过。
- Real serial：30/30 通过；包含营口完整 JTS 工作流、持久化、快速图册和全规模分层性能。
- Assistant final UI：7/7 通过；覆盖只读、建议、取消、确认、429 重试、用户取消、上下文隔离、已确认分层草稿和重连。
- 1440×900、1920×1080：水平溢出 0，右侧坞在视口内，console/page error 0，未确认写入 0。
- 三类只读复查：Visual、Geotechnical workflow、Copy/IA 均为 PASS，无 P0/P1。
- `npm.cmd run process:test`：13/13 通过。
- `npm.cmd run knowledge:gate -- --context process_logs/Process126.md --report process_logs/knowledge-reviews/Process126.json`：关闭门禁通过。

## Evidence

- `process_logs/playwright-mcp/process126-assistant/assistant-proposal-1440x900.png`
- `process_logs/playwright-mcp/process126-assistant/assistant-applied-1920x1080.png`
- `process_logs/playwright-mcp/process126-assistant/assistant-confirmed-upstream-1440x900.png`
- `process_logs/playwright-mcp/process126-assistant/browser-check.json`
- `process_logs/playwright-mcp/process126-assistant/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process126.json`
- `process_logs/verification/Process126-closure.json`
- `process_logs/verification/Process126-real-serial.stdout.log`

## Known Problems

- KPB-001、KPB-002：可见回答、请求运行态、建议前后值、取消和确认结果均有机器断言。
- KPB-003、KPB-008：上游修改只创建或更新工作草稿，每个建议只有一个显式执行入口。
- KPB-004、KPB-011：失败、取消、重试、重连和跨页上下文恢复均不改变工程权威。
- KPB-006、KPB-015：确认后复用现有 IndexedDB 持久化；迟到响应、重复执行和 stale 状态被拒绝。
- KPB-007、KPB-009：真实规模数据与 20 m/120 行边界均通过；空值、深度间断和抽样语义不被伪造。
- KPB-012、KPB-013：双分辨率证据和三类独立评审共同验证工程语义与首屏可操作性。
- KPB-016：计划、验证 JSON、知识报告、精选证据、索引和本归档由关闭门禁绑定。

## Boundaries

- 助手只提供建议，不代表工程采纳；土类、边界、公式、门禁和最终修订仍由工程师与既有领域流程决定。
- V1 不提供任意 JSON Patch、自由代码、SQL、URL、文件读取或原始测量写入工具。
- V1 只实现 DeepSeek 真实适配器；provider-neutral 合同为后续扩展保留，但未实现第二家真实供应商。
- 仍为本地单用户工作区与本机代理，不包含公网鉴权、计费、多用户协作、云存储或跨设备会话。
- 完整测量文件与整孔数据默认不发送；本地 `.env.local` 中的密钥不属于项目数据或可提交文件。
