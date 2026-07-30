# Process114 - 快捷图册视觉整理与 Excel 数据导出

Date: 2026-07-21

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 将快捷图册整理成白底工程报告样式，统一砂土、粉土、黏土的颜色和外置图例，并为当前图册修订增加可追溯的数据表导出。

## Result

- 14 页图册改为白色紧凑页眉、细分割线和自有矢量标识；左侧保留用户确认的 `SIGS-OGLab support`，右侧明确项目、孔位、路线、方法包和页码。
- 土类颜色统一为砂土黄 `#F2D66B`、粉土淡蓝 `#9FD8EA`、黏土棕 `#9A7258`；有土类色义的页面均在绘图区外提供共享图例。
- 第 3 页非分类孔压响应点改为中性色，避免与 JTS Zone 色义混淆；第 8 页 Ir 使用 1%–99% 稳健显示范围，范围外点钉在边缘并计数，计算值和 Excel 原值不变。
- `full_cptu` 只在全部可用 depth/qc 行均有有效 u2 时成立；部分 u2 覆盖回落为近似 CPT，不再误称“完整”或丢弃其他可画行。
- 结果页保留 PDF 主操作，并增加“导出数据表”次操作。工作簿固定包含“原始数据”“快捷解译结果”“设置与方法”三个 Sheet，并绑定当前不可变图册修订。
- stale 图册禁止导出；Excel 失败保留图册并允许重试，用户提示不暴露内部技术异常。

## Verification

- `npm.cmd run build`：passed。
- `domain-fast`：205/205 passed。
- `ui-isolated`：并行运行 72/78 passed；全部 6 个受影响文件随后单 worker 22/22 passed。一次全套单 worker 运行达到 15 分钟工具上限且未返回结果，不计作通过；关闭结论采用项目既有的等价隔离证据。
- `real-serial`：30/30 passed，包含营口完整端到端流程。
- Process114 目标测试：13/13 passed；营口 4,282 行生成 14 页图册、PDF 14 页和三 Sheet 数据表。
- 双分辨率 1440×900、1920×1080 均无横向溢出；浏览器错误 0。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1。
- Copy / IA / Performance Reviewer：PASS，无 P0/P1。
- Geotechnical Domain Reviewer：PASS，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-03-1440x900.png`
- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-05-1440x900.png`
- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-06-1440x900.png`
- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-07-1920x1080.png`
- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-08-1920x1080.png`
- `process_logs/playwright-mcp/process114-quick-exports/atlas-page-14-1920x1080.png`
- `process_logs/playwright-mcp/process114-quick-exports/browser-check.json`
- `process_logs/playwright-mcp/process114-quick-exports/evidence-manifest.json`
- `process_logs/verification/Process114-closure.json`
- `process_logs/knowledge-reviews/Process114.json`

## Known Problems Covered

- KPB-001、KPB-002、KPB-003、KPB-004、KPB-007、KPB-009、KPB-011、KPB-012。

## Professional Conclusion

- 图册颜色、图例和路线文字与当前快捷解译语义一致；视觉稳健范围仅改变显示，不改变工程计算或导出数据。
- 部分孔压覆盖不会冒充完整 CPTU；近似 CPT 路线保留所有仍可绘图的数据行。
- Excel 与 PDF 均消费同一当前修订，导出失败或输入变化不会静默改写原始测量。

## Boundaries

- Logo 为 SIGS-OGLab 自有代码绘制标识，仅参考工程报告的左标识/右元数据布局，不复制第三方商标。
- 数据和导出仍在浏览器本地生成，不增加云端、多人共享或独立 Excel 历史对象。
- 本切片不改变已确认的快捷经验公式、专业工作流或正式工程采纳边界。
