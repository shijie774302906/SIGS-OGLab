# GMW-P4D 报告模板与正式 PDF Gate

日期：2026-06-30

适用范围：`成果输出`、`ReportReadinessService`、`CptuExportService`、正式 PDF 后续入口。

## 1. 目标

P4D 不实现正式 PDF。P4D 固化正式 PDF 的准入 gate：

```text
HTML / Markdown / manifest 可作为内部审查成果。
正式 PDF 只有在报告模板、图件策略、审计标准和业务签发规则都确认后才允许进入后续实现。
```

当前系统禁止：

- 自动生成正式 PDF；
- 生成占位 PDF；
- 用 HTML/Markdown 报告冒充签发版 PDF；
- 在模板未确认时将 PDF 标为可交付；
- 因 `CanGeneratePdf=true` 就直接创建 PDF 文件。

## 2. 当前可交付层级

| 层级 | 输出 | 当前状态 |
| --- | --- | --- |
| 报告 readiness 包 | `report-manifest.json`、`report-preview.md` | 允许生成 |
| 解译报告文档包 | `interpretation-report.html`、`interpretation-report.md`、`report-manifest.json` | 允许生成，内部审查 |
| 正式 PDF | `interpretation-report.pdf` | 禁用，不生成占位记录 |

## 3. PDF Gate 条件

正式 PDF 实现前，至少需要全部确认：

- `report-template.v1` JSON 模板；
- 模板名称、版本、状态、审计标准；
- 必需章节；
- 图件策略；
- 表格和数值精度策略；
- 采纳对象 manifest 投影；
- 审核/签发责任；
- 输出路径、命名、导出记录类型；
- 与 HTML/Markdown 草案报告的关系。

## 4. 当前系统行为

当前 `ReportReadinessService` 可以判断模板是否已确认：

- 模板缺失：`PendingTemplate`
- 模板无效：`PendingTemplate`
- 模板有效：readiness 可显示 `CanGeneratePdf=true`

但 P4D 明确：

```text
CanGeneratePdf=true 只表示“证据与模板 gate 已满足”，不是“当前版本会生成 PDF”。
```

当前 `CptuExportService.ExportInterpretationReportDocument` 仍只生成：

- HTML
- Markdown
- manifest

并且必须继续满足：

```text
No placeholder PDF
No formal PDF export record
No PDF side-effect when template is confirmed
```

## 5. 验收标记

Focused check 必须输出：

```text
REPORT_PDF_GATE_DISABLED=PASS
REPORT_TEMPLATE_CONFIRMED_NO_PDF_GENERATION=PASS
```

含义：

- `REPORT_PDF_GATE_DISABLED=PASS`：无模板或内部草案报告路径不会创建 PDF。
- `REPORT_TEMPLATE_CONFIRMED_NO_PDF_GENERATION=PASS`：即使 readiness 中存在有效模板，当前导出仍不会自动创建正式 PDF。

