# Process113 - 中文横版快捷出图与十四页工程图册

Date: 2026-07-20

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 为不了解 CPT/CPTU 解译的用户提供独立快捷路径：粘贴或导入数据，确认少量现场设置，直接生成中文横版工程图册和 PDF。

## Result

- 新建项目明确提供“快捷出图（推荐）”与“专业解译”二选一，既有专业流程保持独立。
- 快捷页采用固定 Depth/qc/fs/u2 表格，支持整块粘贴和 Excel；只拦截无法画图的致命输入，局部无效公式自然留空。
- u2 至少有两个有效点才进入完整 CPTU，否则统一按近似 CPT；原始数值不被自动修改。
- 生成 14 页中文横版图册及完整 PDF，包含实测曲线、JTS 九区 SBTn、深度土类带、砂土/黏土/物理指标、可用性和完整公式参考页。
- 曲线统一为 qc 红、fs 墨绿、u2 蓝；砂土黄、粉土过渡色、黏土棕。数据或设置修改后，旧图册明确标记“需要更新”。
- 公式页公开输入单位、适用土类和分段条件；物理指标与公开设置统一使用水重度 10.00 kN/m³。

## Verification

- `npm.cmd run verify:slice -- --process 113 --mode closure`：passed，66/66 spec。
- `domain-fast`：202/202 passed。
- `ui-isolated`：78/78 passed。
- `real-serial`：30/30 passed；营口 CPT09 4,282 行生成 14 页图册并刷新恢复。
- Build、测试分层、流程脚本和知识库校验均通过。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1。
- Copy / IA / Performance Reviewer：PASS，无 P0/P1。
- Geotechnical Domain Reviewer：经公式分段、单位、Kc 多项式和水重度一致性整改后 PASS，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process113-quick-plot/mode-choice-1440x900.png`
- `process_logs/playwright-mcp/process113-quick-plot/quick-input-1440x900.png`
- `process_logs/playwright-mcp/process113-quick-plot/fatal-input-recovery-1440x900.png`
- `process_logs/playwright-mcp/process113-quick-plot/stale-output-1440x900.png`
- `process_logs/playwright-mcp/process113-quick-plot/atlas-page-14-1440x900.png`
- `process_logs/playwright-mcp/process113-quick-plot/browser-check.json`
- `process_logs/playwright-mcp/process113-quick-plot/evidence-manifest.json`
- `process_logs/verification/Process113-closure.json`
- `process_logs/knowledge-reviews/Process113.json`

## Known Problems Covered

- KPB-001、KPB-002、KPB-003、KPB-004、KPB-006、KPB-007、KPB-009、KPB-011、KPB-012、KPB-013。

## Professional Conclusion

- 快捷图册提供可复核的工程参考结果，不替代工程师在专业流程中的正式判断与采纳。
- JTS 九分区证据、经验参数和公式适用域均按当前公开方法包生成；局部不适用不会补零、外推或阻止其他页面生成。
- 完整 CPTU 与近似 CPT 路径明确区分，缺失 u2、无效点和真实深度间断不会被伪造成有效曲线。

## Boundaries

- 数据与图册修订仅保存在各自浏览器本地；没有新增云端或多人共享存储。
- 本切片不做英文版、专业数据质量判断、逐参数向导或原始数值自动修复。
- PDF 在用户点击生成后按当前不可变图册修订导出，不作为正式工程采纳记录。
