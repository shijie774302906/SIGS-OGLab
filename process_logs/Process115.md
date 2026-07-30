# Process115 - 快捷 PDF 工程制图式视觉统一

Date: 2026-07-21

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 统一快捷图册 14 页的表格、图表、标题、外框和线条层级，使 PDF 更接近整洁、可打印、可逐页阅读的工程制图成果。

## Result

- 建立共享报告绘图规范：近黑外框、分级坐标轴与灰色网格、白色画布、等宽数字和统一标题层级。
- 页面主标题与各绘图区标题加粗居中；单位保留在轨道标题中，图例固定在绘图区外。
- 第 13、14 页表格使用黑色外框、完整内网格、浅灰表头和加粗居中表头；数字与短标签居中，说明、公式和参考文献保留左对齐。
- 第 5 页明确为“各深度窗口的土类占比（非分层）”，增加深度刻度，并将标题、图例、绘图区拆为三行，避免遮挡与正式地层误读。
- 第 6 页明确为“沿深度 Ic 与土类证据（非正式分层）”；第 5–12 页就地说明空白、数据断点、方法不适用、不补零和不跨段连线。
- 极端值仅在显示层钉在图框内缘并计数，计算值与 Excel 原值不变；第 8 页图例、三面板标题和超范围提示完全分离。
- 本轮不改变公式、数值、土类判定、路线选择、PDF 页数或 Excel 内容。

## Verification

- `npm.cmd run build`：passed。
- `domain-fast`：206/206 passed。
- `ui-isolated`：并行 76/78 passed；两条受既有并行 IndexedDB 状态影响的用例随后单 worker 2/2 passed。此差异按事实记录，不将并行结果写成一次全绿。
- `real-serial`：30/30 passed，包含营口完整端到端流程。
- Process115 定向测试：14/14 passed；营口 4,282 行真实数据 1/1 passed。
- 14 页均生成 1440×900 与 1920×1080 证据；PDF 14 页、Excel 3 Sheet、浏览器错误 0、横向溢出 0。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1。
- Geotechnical Domain Reviewer：PASS，无 P0/P1。
- Copy / IA / Performance Reviewer：PASS，无 P0/P1。
- 三位评审共同保留一个非阻断 P2：若未来新增 A4 模板，可单独提高页底安全说明字号；当前 A3 图册无需继续挤占绘图区。

## Evidence

- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-05-1440x900.png`
- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-05-1920x1080.png`
- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-08-1440x900.png`
- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-08-1920x1080.png`
- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-13-1920x1080.png`
- `process_logs/playwright-mcp/process115-pdf-visual/atlas-page-14-1920x1080.png`
- `process_logs/playwright-mcp/process115-pdf-visual/browser-check.json`
- `process_logs/playwright-mcp/process115-pdf-visual/evidence-manifest.json`
- `process_logs/verification/Process115-closure.json`
- `process_logs/knowledge-reviews/Process115.json`

## Known Problems

- Covered：KPB-001、KPB-009、KPB-012、KPB-013。
- Not applicable：KPB-003（未改变分类或下游修订）、KPB-006（未改变保存、清理或权威存储）。

## Professional Conclusion

- 当前图册已形成一致的工程制图层级，表格边界、面板归属、标题、图例和曲线在双分辨率下均可独立识别。
- 土类色带继续作为窗口或逐点分类证据，不冒充正式工程分层；缺失和不适用区间继续留白。
- 黑色外框没有压过数据曲线，极端值标记与图框保持内缩间距；显示稳健化不改变任何计算或导出数据。

## Boundaries

- 视觉规则采用“外框最重、坐标轴次之、主网格再次、辅助网格最轻”，没有采用所有线条同黑同宽的方案。
- 长说明、公式和参考文献不强制居中，以保留工程核查效率。
- 本切片只修改快捷图册绘制与相关验收，不改变专业工作流、工程公式或正式采纳边界。
