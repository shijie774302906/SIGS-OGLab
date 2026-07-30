# Process137 - A3 600 DPI 高清 PDF 导出

Date: 2026-07-30

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 修复快捷图册 PDF 放大后模糊的问题，同时保持网页预览轻量。
- 导出时逐页生成 A3、600 DPI 图册，并提供明确进度、单任务保护、过期终止和失败重试。

## Result

- PDF 不再放大低分辨率 JPEG 预览；15 页均按 A3 600 DPI 独立重绘。
- 竖版为 7016×9921 像素，横版为 9921×7016 像素；PDF 使用无损 Flate RGB 图像流，未使用 JPEG。
- 每次仅保留一个高清 Canvas，分条读取并压缩，页面完成后立即释放，避免同时持有 15 张大画布。
- 按钮直接显示“正在准备 0/15”“正在生成 n/15”或“正在打包 15/15”；导出期间禁止重复导出和修改输入。
- 导出任务同时绑定活动修订、冻结输入哈希和实时输入哈希；数据或设置变化会终止旧任务，不下载过期图册。
- 失败时保留当前图册并显示“重试导出 PDF”；新图册、重新导入或清空数据会清理旧导出状态。
- 网页明确说明轻量预览与 A3 600 DPI 交付文件的区别；未修改工程计算、分类、分层、参数或 Excel 导出。

## Verification

- `process_logs/verification/Process137-closure.json`：关闭级验证通过，74/74 个 spec。
  - domain-fast：259/259。
  - ui-isolated：119/119。
  - real-serial：32/32。
- `tests/e2e/quick-plot-domain.spec.ts`：600 DPI 像素合同及实时 authority 变化测试通过。
- `tests/e2e/quick-plot-ui.spec.ts`：按钮进度、重复点击保护、修改输入禁用、失败与重试、15 页无损 PDF 通过。
- `tests/e2e/quick-plot-real.spec.ts`：营口 4,282 行真实数据完整导出通过。
- build、测试分层、Process 工具、知识库校验和知识门禁全部通过。
- Visual、Geotechnical、Copy/IA 三类只读 Agent 复查最终 P0=0、P1=0。

## Evidence

- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/report-ready-1440x900.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/report-ready-1920x1080.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/export-progress-1440x900.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/yingkou-a3-600dpi-atlas.pdf`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/pdf-page06-100pct.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/pdf-page06-200pct.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/pdf-page06-400pct.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/pdf-page06-detail-400pct.png`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/browser-check.json`
- `process_logs/playwright-mcp/process137-a3-600dpi-pdf/evidence-manifest.json`
- `process_logs/reviews/Process137.md`

## Known Problems

- KPB-001：真实 PDF 页面在 100%、200%、400% 下验证标题、曲线、网格与图例清晰。
- KPB-003：PDF authority 包含活动修订、冻结输入和实时输入哈希；过期任务停止。
- KPB-004：高清 Canvas 失败后图册保留、重试入口明确且恢复成功。
- KPB-012：营口真实规模、双分辨率、PDF 内部尺寸和多倍率渲染共同证明工程语义。

## Boundaries

- 未修改 15 页内容、工程公式、分类方法、分层、参数计算、原始测量或 Excel 导出。
- 未新增服务器导出；PDF 仍在浏览器本地生成。
- 600 DPI 导出是高质量位图 PDF，不是矢量 PDF；文件体积和生成时间高于网页预览。

## Residual P2

- 快捷图册页标题在部分滚动位置可能被粘性顶栏裁切，属于既有页面布局问题，不影响导出 PDF；后续页面布局切片处理。
