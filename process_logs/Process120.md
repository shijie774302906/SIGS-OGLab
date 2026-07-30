# Process120 - 真实网页与 PDF 图册视觉迁移

Date: 2026-07-23

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 将 Process119 已确认的 15 页工程图册迁移到真实网页预览和 PDF 导出。
- 网页与 PDF 复用同一组 Canvas 页面，保留 Excel 数据、公式和来源追溯。
- 让只需出图的用户只确认必要输入，并能从失败、旧结果和不确定 u2 状态中原位恢复。

## Result

- 生成 15 页混合横竖版中文工程图册；网页预览、JPEG 单页和 PDF 使用同一页面对象。
- 统一白底报告骨架、完整坐标名称和颜色：qc/qt 红、fs/Rf 墨绿、u2 蓝、Ic 黄；分类使用固定九区色板。
- 第 5 页使用 Zhang–Tumay Fuzzy 最高概率分层与深度窗口组成；第 6 页采用五联图；第 9 页并列 JTS、Modified Robertson 2016、Schneider 2008 分层与 G0/K0。
- 第 15 页只列本次实际产生结果的方法、适用条件、公式、系数和来源；full、partial、raw-only、无 u2 路线分别显示真实 qt 公式。
- 局部 u2 缺失时保留全部 qc/fs 行，只逐行停用孔压方法；用户也可选择“只展示原始 u2”。
- 输入未变化可返回当前图册；输入变化后旧预览失效并要求重新生成；生成或导出失败保留当前输入与最后成功结果。
- Excel 保留原始数据、快捷解译结果、设置与方法三个 Sheet，并明确区分方法库公式索引与本次实际方法。
- 项目入口移除重复集合统计；快捷输入支持一键清空并同步清理旧图册修订。

## Verification

- `npm.cmd run verify:slice -- --process 120 --mode closure`：通过。
- domain-fast：222/222。
- ui-isolated：81/81（4 workers）。
- real-serial：30/30；包含营口 4,282 行完整工作流。
- Process120 目标测试：domain 28/28、UI 5/5、真实营口 1/1。
- 构建、测试分层审计、流程脚本测试、知识库校验与知识门禁均通过。
- 知识门禁覆盖 KPB-003、KPB-004、KPB-007、KPB-009；KPB-013 提示已记录。
- Visual Layout Taste、Geotechnical Domain、Copy/IA 三类只读 Agent 最终均为 `PASS / P0=0 / P1=0`。

## Evidence

- `process_logs/playwright-mcp/process120-report-migration/evidence-manifest.json`：final，12 个绑定输入、57 个精选证据。
- `process_logs/playwright-mcp/process120-report-migration/generated-cpet-parity.pdf`
- `process_logs/playwright-mcp/process120-report-migration/generated-interpretation.xlsx`
- `process_logs/playwright-mcp/process120-report-migration/report-page-01.jpg` 至 `report-page-15.jpg`
- `process_logs/playwright-mcp/process120-report-migration/browser-check.json`
- `process_logs/playwright-mcp/process120-report-migration/pdf-parity.json`
- `process_logs/knowledge-reviews/Process120.json`
- `process_logs/verification/Process120-closure.json`

## Boundaries

- 图册是快捷经验解译结果，需要工程复核，不作为设计值直接采用。
- 本切片不增加后端、云协作或生产级正式采纳语义。
- CPeT-IT 报告用于版式与图件类型对照；工程计算仍以本项目已记录的方法、系数和来源为准。
