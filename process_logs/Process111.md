# Process111 - 工程师确认当前参数范围并进入成果输出

Date: 2026-07-20

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 工程师认为当前已成功计算的参数已经足够时，可一次确认本次成果范围，将未完成参数明确留痕为“本阶段不纳入”，随后直接进入成果输出。

## Result

- 参数页中央新增唯一主操作“确认当前参数并进入成果输出”，不再要求工程师逐项完成并非本阶段必需的参数。
- 紧凑确认窗口只列出“本次纳入”和“本阶段不纳入”；取消不写入，双击只提交一次，失败留在原页并说明原因。
- 确认通过一次不可变参数包重算原子提交，保留原始测量、JTS 分类、地层分层与历史运行。
- 已确认范围在刷新后保持；再次修改或运行参数会清除旧确认，要求工程师重新确认新范围。
- 成果页明确显示“可生成部分成果”“范围已确认”，并列出纳入数量、排除数量和 Su/OCR/St 等具体排除项，避免把部分成果误读为完整成果。
- 确认时间、纳入/排除清单、方法唯一性、交集、未知方法、排除决定及实际运行 checklist 均受完整性校验；损坏快照被拒绝。
- 隔离 UI 测试固定为 4 workers，避免 12 个并发浏览器造成重型分层用例的资源争用与假超时。

## Verification

- `npm.cmd run verify:slice -- --process 111 --mode closure` - passed。
- Build、测试分层、流程脚本、知识门禁全部通过。
- `domain-fast`：85/85 passed。
- `ui-isolated`：76/76 passed。
- `real-serial`：29/29 passed；营口三份真实工作簿流程通过。
- 关闭级 Playwright 总计 190/190 passed。
- 1440x900 与 1920x1080 的确认弹窗、确认后参数页和部分成果页均无横向溢出，console/page errors 为 0。

## Review

- Visual Layout Taste Auditor：PASS，P0/P1/P2 均为 0。
- Geotechnical Domain Reviewer：PASS，P0/P1/P2 均为 0；专业范围和审计语义可信。
- Copy / IA / Performance Reviewer：PASS，P0/P1 均为 0；确认后不再重复询问，右栏不再制造红色竞争状态。

## Evidence

- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/parameter-scope-dialog-1440x900.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/parameter-scope-dialog-1920x1080.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/parameter-confirmed-1440x900.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/parameter-confirmed-1920x1080.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/output-ready-1440x900.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/output-ready-1920x1080.png`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/browser-check.json`
- `process_logs/playwright-mcp/process111-parameter-scope-confirmation/evidence-manifest.json`
- `process_logs/verification/Process111-closure.json`
- `process_logs/knowledge-reviews/Process111.json`

## Known Problems Covered

- KPB-001、KPB-002、KPB-003、KPB-004、KPB-005、KPB-006、KPB-007、KPB-008、KPB-009、KPB-011、KPB-012、KPB-013。

## Boundaries

- 不把无效值或未完成参数伪装成有效成果。
- 不修改公式、原始测量、JTS 分类、地层分层或成果文件格式。
- 不新增云端、后端服务或正式工程采纳语义。
