# Process117 - CPeT-IT 对照图册与双分类方法

Date: 2026-07-21

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 除参考报告第 15 页浅基础承载力外，使快捷 CPT/CPTU 图册的页面功能、图表类型、分类语义与版式对应 `CPeT-IT data report.pdf`。
- 补齐 Schneider 2008 与 Modified Robertson 2016 分类，并保留“一页输入、直接生成 PDF/Excel”的快捷流程。

## Result

- 输出固定为 15 页，对应参考报告第 1–14、16 页；第 1、5、15 页为竖版，其余为横版。
- 增加 Schneider 2008 五分类、Modified Robertson 2016 七分类以及 Robertson 2010 独立分类链；未复用 JTS 的 Qtn* 代替 Robertson Qtn。
- 第 2、6 页使用一致的 `qc/pa` 与 `fs/qc × 100` 输入语义；完整、部分和缺失 u2 路线均有明确行为。
- 部分 u2 数据保留 CPTU 路线，但缺失行在派生链和曲线上真实断开；不足两个有效 u2 时改走 CPT 路线，不补零、不跨缺口连线。
- PDF 与 Excel 均绑定同一次快捷修订；Excel 同时包含 JTS、Robertson、Schneider 与参数结果。
- 报告采用白底、黑框、统一网格、页眉标识和紧凑页脚，保持参考报告的工程图册结构但不复制其品牌。

## Engineering Verification

- 领域测试覆盖 Schneider 2008 边界、Modified Robertson 2016 的 Qtn/IB/CD 与七分类、Robertson 2010 独立 R11 分类、跨页输入一致性和部分 u2 真实断点。
- 营口真实 CPTU：4,282 行、15 页 PDF、双分辨率预览；机器证据检查页面顺序、纸张方向、分类数量、断点、溢出和浏览器错误。
- Schneider、Robertson 2016、IB/CD、K0、重塑/残余强度的变量、默认值和适用边界已由岩土评审复核。

## Verification

- `npm.cmd run build`：passed。
- `domain-fast`：220/220 passed。
- `ui-isolated`：78/78 passed。
- `real-serial`：30/30 passed。
- `npm.cmd run verify:slice -- --process 117 --mode closure`：passed；关闭结果见 `process_logs/verification/Process117-closure.json`。
- 首次统一关闭运行出现一条既有 Process100 并行选择漂移；该用例单独复跑通过，随后完整关闭运行再次全部通过。
- 1440×900 与 1920×1080 共 30 张逐页证据均已检查。

## Review

- Visual Layout Taste Auditor：PASS，无 P0/P1。
- Geotechnical Domain Reviewer：PASS，无 P0/P1。
- Copy / IA / Performance Reviewer：PASS，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process117-cpet-parity/generated-cpet-parity.pdf`
- `process_logs/playwright-mcp/process117-cpet-parity/generated-interpretation.xlsx`
- `process_logs/playwright-mcp/process117-cpet-parity/browser-check.json`
- `process_logs/playwright-mcp/process117-cpet-parity/pdf-parity.json`
- `process_logs/playwright-mcp/process117-cpet-parity/evidence-manifest.json`
- `process_logs/verification/Process117-closure.json`
- `process_logs/knowledge-reviews/Process117.json`

## Known Problems

- Covered：KPB-001、KPB-002、KPB-003、KPB-008、KPB-009、KPB-012、KPB-013。

## Boundaries

- 快捷报告是经验解译图册，不包含浅基础承载力页，也不替代正式工程采纳。
- 分类带属于方法证据，不等同于工程师确认的最终地层。
- 缺失、无效或部分测量保持为空白/断线，不生成零值或伪造证据。
