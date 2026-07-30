# Process134 - 快捷出图 AI 结构化判断与原子导入

Date: 2026-07-27

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 让 DeepSeek 判断非标准 CSV/XLSX 的工作表、表头或无表头、数据范围、depth/qc/fs/u2 列及单位。
- 用户先查看并确认完整判断；浏览器只按受控 JSON 引用原始单元格，经全文件校验后原子导入。
- 未知表头可由 AI 推测并交给用户确认，明确冲突、旧响应、坏协议和保存失败不得静默进入工作数据。

## Result

- 建立 `sigs.ai-import/1` 协议；AI 终态只能是一个结构化问题或一份结构化建议，自由文本、多工具、未知工具和坏 JSON 均被拒绝。
- 来源身份绑定 operation、fingerprint、request、context、服务实例和协议版本；换文件、切页、服务重启及迟到响应会令旧建议失效。
- 无表头与数据起始行分离，第一条数值行不会被当作表头丢失；未知标题可由 AI 推测，qt/qnet/Qtn、Rf、u0/u1/u3、标高等明确冲突仍被程序否决。
- AI 只提交源列、行范围、字段和单位决策；浏览器从不可变来源逐值换算，保留坏行、空行、重复深度和深度回退的完整账本，不排序、不补造、不修改测量值。
- 建议区只保留“判断不对”和一个“确认并导入/替换”主操作；字段、单位、样例、未使用列、跳过行和替换影响都在确认前可见。
- 提交使用同步锁、proposal hash、幂等键、CAS 和可等待的 IndexedDB 保存。保存失败保留当前建议；保存中禁止更换文件，提交完成后再次校验来源身份。
- DeepSeek `deepseek-v4-pro` 思考模式使用兼容的自动工具选择参数，应用层继续强制唯一结构化终态，并把截断、协议错误和服务错误分别处理。
- 开发启动器会识别 8787 上的旧版或不兼容服务并给出明确重启提示，避免网页继续连接旧协议进程。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- `npm.cmd run verify:slice -- verify --process 134 --mode closure`：通过。
  - domain-fast：253/253。
  - ui-isolated：114/114。
  - real-serial：32/32；包含 7,832 行 SCPT1 解析、替换、重导、IndexedDB 保存和刷新恢复。
- Assistant server：21/21。
- Quick import domain：38/38。
- Process134 UI：3/3；覆盖无表头首行、临时保存失败原位重试、保存中来源切换竞态。
- 真实 DeepSeek smoke：`deepseek-v4-pro` 两轮无表头判断通过；服务、实例、协议和来源身份一致。
- 三位只读 Agent 分别以随机 seed `517201917`、`2149432443`、`511745401` 执行 500 个完整随机文件、300 个过期身份/显式冲突迭代和异常账本，最终全部 `PASS`。
- 1440×900 与 1920×1080：建议、映射、样例、替换说明和主操作可见，无横向溢出，浏览器错误为 0。

## Evidence

- `process_logs/playwright-mcp/process134-quick-ai-import/proposal-1440x900.png`
- `process_logs/playwright-mcp/process134-quick-ai-import/proposal-1920x1080.png`
- `process_logs/playwright-mcp/process134-quick-ai-import/browser-check.json`
- `process_logs/playwright-mcp/process134-quick-ai-import/evidence-manifest.json`
- `process_logs/verification/Process134-closure.json`
- `process_logs/knowledge-reviews/Process134.json`
- `process_logs/reviews/Process134.md`

## Known Problems

- KPB-004：失败、停止、纠错、重试和恢复均留在当前文件与当前判断位置。
- KPB-006：成功状态只在权威浏览器存储完成后出现；临时失败可用同一建议重试。
- KPB-008：确认中心只有一个最终导入/替换主操作。
- KPB-011：错误恢复续接当前文件，随机高压断言原始来源未被静默改写。
- KPB-012：真实 DeepSeek、真实规模文件、字段单位语义、双分辨率和三类独立评审共同验收。
- KPB-013：默认首屏只显示当前判断和必要证据，协议与完整账本按需展开。
- KPB-015：保存锁、幂等键、CAS 和来源二次校验阻止迟到回写覆盖新会话。
- KPB-025：思考模型使用兼容工具参数，应用层继续拒绝非唯一结构化终态并区分错误类型。

## Boundaries

- AI 不修改、补造、插值、平滑、删除或排序测量值。
- 本轮只改变快捷出图 AI 文件整理和相关同源助手协议，不改变专业解译流程、工程公式、分类方法或图册确定性计算。
- API Key 仍只存在于当前标签页内存；浏览器 IndexedDB 仍是权威项目存储。
- P2 仍可在后续精简窄侧栏中的重复“AI 推测”辅助文字，但不影响本轮理解、操作或数据安全。
