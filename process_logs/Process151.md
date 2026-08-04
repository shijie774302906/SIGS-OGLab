# Process151 - 专业成果物理字号统一

Date: 2026-08-04

Status: `closed / implemented / verified`

## Goal

把 Process147 已用于快捷图册的物理字号语义扩展到专业成果 A3/A4，使标题、正文、图例、刻度、单位、来源和层名在真实页面预览及 PDF 中保持可辨认，同时避免放大后重叠和截断。

## Result

- 新增共享图册字号规则：来源 8 pt、图例与刻度 9 pt、正文 10 pt、标题 12 pt。
- 专业成果 A3/A4 的标题、正文、图例、刻度、层名和表格均通过页面物理尺寸换算，不再混用不可比较的裸像素字号。
- A4 分类标题改为紧凑双行，分类图例按可用宽度换行；没有通过缩小字体掩盖空间不足。
- 调整 A4 证据页绘图区与消散区留白，放大后的标题、图表和说明互不遮挡。
- 未修改测量数据、分类、分层、参数、公式或单位换算。

## Verification

- `npm.cmd run build`：通过。
- `tests/e2e/report-typography.spec.ts`：8/9/10/12 pt 角色及 A3/A4 换算通过。
- `tests/e2e/report-rendering-ui.spec.ts`：专业 A4/A3 实际 Canvas 字号与代表页通过。
- `tests/e2e/jts-output-domain.spec.ts`、`tests/e2e/jts-output-ui.spec.ts`：专业成果、PDF/Excel、长说明和失败恢复回归通过。
- 1440×900、1920×1080 与 A3/A4 视觉复核通过；没有使用营口私有数据。

## Evidence

- `process_logs/playwright-mcp/process151-professional-typography/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process151.json`

## Boundaries

- 不修改普通工作台字号。
- 不修改图册页数、品牌、工程算法或成果数据结构。
- 本切片未执行生产部署。
