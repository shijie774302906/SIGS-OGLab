# Process159 - 快捷 AI 自由协商与用户选表

Date: 2026-08-18

Status: `closed / implemented / verified`

## Goal

把快捷出图 AI 文件整理从“每轮强制唯一工具、问题也必须终态 JSON”改为“自由只读探索、自然语言协商、最终结构化提交”，并在多工作表文件中由用户先选择数据所在工作表。

## Result

- 多工作表文件先显示工作表名称、行数和列数；未选择时不能启动 AI，选择后 AI 只能读取该工作表。
- AI 可在一轮请求多个不同的只读窗口，也可直接用自然语言询问；最终草稿仍由严格结构化协议校验，确认前不写入工作表。
- 浏览器负责绑定来源身份；模型不再被要求回显哈希或猜测工作表。相同窗口重复读取、混合读取/提交、过期来源和最多 6 轮协商均有明确处理。
- 缺失 fs/u2 保持缺失，真实 0 保留；本轮没有修改 CPT/CPTU 公式、分类、分层、图册算法或原始测量值。
- 真实 DeepSeek 使用本机私有多工作表完成两轮调用；测试没有注入表头、列号、单位或标准 proposal，私有文件名、原始值和工作簿均未归档。

## Verification

- `npm.cmd run build`: passed。
- assistant server：36/36 passed。
- 快捷 domain：57/57 passed。
- 快捷 UI：29/29 passed。
- 真实 DeepSeek：1/1 passed；读取请求 1627 ms，草稿提交 7398 ms。
- 多工作表 1440×900 与 1920×1080：无横向溢出，浏览器错误为 0。
- Known Problem Gate：7 个关闭问题已覆盖，1 个提示已记录。

## Boundaries

- 私有工作簿仅用于本机非归档 smoke，不进入 Git、截图、报告、发布包或永久证据。
- AI 只生成待确认草稿，不能直接改原始文件或绕过最终用户确认。
- 多工作表选择属于用户判断；AI 不在工作表之间自行猜测。
- 本轮没有部署到正式站。

## Evidence

- `process_logs/playwright-mcp/process159-free-negotiation/evidence-manifest.json`
- `process_logs/playwright-mcp/process159-free-negotiation/browser-check.json`
- `process_logs/playwright-mcp/process159-free-negotiation/real-ai-smoke.json`
- `process_logs/playwright-mcp/process159-free-negotiation/sheet-selection-1440x900.png`
- `process_logs/playwright-mcp/process159-free-negotiation/sheet-selection-1920x1080.png`
- `process_logs/verification/Process159-targeted.json`
- `process_logs/knowledge-reviews/Process159.json`

## Known Problems Covered

- KPB-002, KPB-004, KPB-009, KPB-011, KPB-012, KPB-013, KPB-023, KPB-025
