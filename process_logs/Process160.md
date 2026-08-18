# Process160 - 图册图例与版面可读性

Date: 2026-08-18

Status: `closed / implemented / verified / local only`

## Goal

统一提高快速图册与专业成果图册的文字可读性，保证图例、越界提示、标题、表格和图框在常规及高密度数据下不重叠、不截断，并保留明确回退点。

## Result

- 快速与专业图册的图例物理字号下限由 9 pt 提高到 11 pt，正文、标题和来源继续使用统一的物理字号合同。
- 长图例按可用宽度完整换行并自动增加图例区域；图框相应缩短，不用缩小字体强塞内容。
- 棕色超范围提示统一放在对应子图标题上方、水平居中，并与标题和图框保持固定垂直间距。
- 专业图中的长层名在分层带和 A4/A3 表格内完整换行；表格按同一行中最长单元格自动增加行高，不再用省略号隐藏工程名称。
- 当前版本可通过提交 `94e7285` 或标签 `pre-report-layout-process160` 回退。

## Verification

- `npm.cmd run build`: passed。
- `report-typography.spec.ts` 与 `report-rendering-ui.spec.ts`: 2/2 passed。
- `quick-plot-ui.spec.ts --grep PROCESS160`: 2/2 passed。
- 快速图册 15/15 页、dense 极端页 07/08/09、专业 A4 3/3 页、专业 A3 6/6 页完成逐页视觉检查。
- 1440×900、1920×1080、真实 80% 浏览器预览无结构性溢出，浏览器错误为 0。
- 独立只读视觉审阅首轮发现专业表格长层名截断；修正并重生成证据后 P0/P1/P2 均为 0，结论 `safe-to-close`。
- Known Problem Gate: passed；关闭上下文中的全部匹配问题均已处置。
- `git diff --check`: passed。

## Boundaries

- 本轮没有修改公式、分类、参数、单位、颜色语义、页面数量、页面顺序、AI、导入、存储或后端接口。
- 验收数据全部为确定性生成数据；没有使用、上传或归档私有工程数据。
- 本轮只完成本地实现与验收，没有部署到正式站。

## Evidence

- `process_logs/playwright-mcp/process160-report-layout/evidence-manifest.json`
- `process_logs/playwright-mcp/process160-report-layout/visual-review.json`
- `process_logs/playwright-mcp/process160-report-layout/atlas-browser-check.json`
- `process_logs/playwright-mcp/process160-report-layout/dense-extreme-check.json`
- `process_logs/playwright-mcp/process160-report-layout/professional-font-check.json`
- `process_logs/playwright-mcp/process160-report-layout/atlas-80-percent-1440x900.png`
- `process_logs/playwright-mcp/process160-report-layout/atlas-80-percent-1920x1080.png`
- `process_logs/playwright-mcp/process160-report-layout/atlas-page-01.jpg` 至 `atlas-page-15.jpg`
- `process_logs/playwright-mcp/process160-report-layout/dense-extreme-page-07.jpg`、`08.jpg`、`09.jpg`
- `process_logs/playwright-mcp/process160-report-layout/professional-a4-page-01.png` 至 `03.png`
- `process_logs/playwright-mcp/process160-report-layout/professional-a3-page-01.png` 至 `06.png`

## Known Problems Covered

- Covered: KPB-012、KPB-021、KPB-035。
- Not applicable: KPB-004、KPB-006、KPB-011、KPB-013；本切片没有改变错误恢复、跨页续接、权威存储或工作台交互。
