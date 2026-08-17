# Process155 - AI 文件整理等待与专业界面呈现优化

Date: 2026-08-18

Status: `closed / implemented / verified / mainland deployed`

## Goal

统一专业解译与快捷出图的 AI 文件整理等待体验，在 CloudBase 单请求时间边界内提供可信的等待、停止和恢复反馈；同时清理专业六页日常界面的内部编码与开发术语。

## Result

- 专业导入和快捷文件整理固定使用 `deepseek-v4-flash` 并关闭思考模式；专业问答与图册解读继续使用 `deepseek-v4-pro`，共用同一服务端密钥。
- 服务端上游窗口为 58 秒，浏览器等待窗口为 70 秒；55 秒后仍保持运行状态，可停止、重试并保留已上传文件。
- 等待区只显示可证明的状态：“AI 正在分析文件”或本地生成草稿，不再按时间伪装识别阶段，也不再重复显示两个停止入口。
- AI 只判断工作表、表头、字段和单位；数千行解析、换算、缺失值保留和草稿生成由确定性本地代码完成。
- 专业导入支持 CSV、XLSX 和无表头数据；无表头时第一行作为测量数据，不再误丢首行。
- 上传文件后模板区自动收起，首屏优先展示字段与草稿；专业六页不再平铺内容哈希、内部状态枚举、公式包编号或来源键。
- JTS 证据使用真实运行状态与公开方法版本，公式修订改为人类可读的冻结/追溯说明。
- 正式 Flash smoke 使用 5000 行固定种子合成元数据与 40 行有界预览完成两次模型调用，总耗时约 7.1 秒；模型漏掉表头明确的 u2 后，新增确定性补充规则，只补唯一、名称明确且带单位的 fs/u2，不猜测模糊、重复或无单位列，也不修改测量值。

## Verification

- `npm.cmd run build:release`: passed；构建清单为 Process155。
- `npm.cmd run test:assistant-server`: 45/45 passed。
- `npm.cmd run test:domain-fast`: 276/276 passed。
- `npm.cmd run test:ui-isolated`: 151/151 passed。
- `npm.cmd run test:real-serial`: 26 passed；2 个可选公开 GoG 6 样本因本机未提供而 skipped。
- Process155 规模/对抗测试：5000 行 CSV、XLSX、无表头、快捷转换和专业 UI 共 5/5 passed。
- 56 秒模拟上游：55.2 秒仍运行，56 秒成功；1440x900、1920x1080 无横向溢出和浏览器错误。
- `npm.cmd run cloudbase:preflight`: 16/16 passed。
- `npm.cmd run release:parity -- --allow-dirty`: 16/16 passed。
- Release audit：0 errors；4 个既有非阻断警告为 package private、开源许可证尚未选择以及超大源文件维护成本。
- Visual、Geotechnical/Domain、Copy/Performance 三类只读 Agent 均为 P0=0、P1=0、safe-to-close。
- 显式可选字段回归：专业与快捷领域测试 59/59 passed，覆盖模型漏掉 u2、重复候选、无单位候选和额外列。

## Performance And External Service Boundary

- 5000 行文件只向模型发送有界来源预览；完整行转换在浏览器内约亚秒至 2 秒完成，具体机器耗时记录在证据 JSON。
- 真实 `deepseek-v4-flash` 网络速度受服务状态和访问线路影响，不作为可重复的本地关闭门禁；本轮已使用不含密钥、私有文件名和完整工程数据的 5000 行合成元数据执行 smoke，两次调用均成功，总耗时约 7.1 秒。

## Boundaries

- 本切片没有修改 CPT/CPTU 公式、分类算法、分层算法、原始测量或正式工程判断。
- 没有引入营口或其他私有工程数据、DeepSeek/API 密钥、`.env`、独立 AI 实验室或临时领导页面。
- 本地门禁只使用固定种子合成数据；真实模型 smoke 仅验证正式服务连通性，不替代确定性工程验收。
- 开源许可证和 `App.tsx`/`styles.css` 拆分属于公开源码前的后续独立工作。

## Evidence

- `process_logs/playwright-mcp/process155-ai-timeout-copy/evidence-manifest.json`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/slow-import-browser-check.json`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/flash-live-smoke.json`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/slow-import-1440x900.png`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/slow-import-1920x1080.png`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/professional-formula-revisions-1440x900.png`
- `process_logs/playwright-mcp/process155-ai-timeout-copy/professional-stratification-evidence-1920x1080.png`
- `process_logs/knowledge-reviews/Process155.json`

## Known Problems Covered

- KPB-001, KPB-003, KPB-004, KPB-009, KPB-011, KPB-012
- KPB-015, KPB-023, KPB-024, KPB-037, KPB-038
- KPB-022: not applicable；本轮不改变公式、单位换算、参数计算或导出采用逻辑。
