# Process125 - 专业分类方案与动态成果输出

Date: 2026-07-24

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 保留既有六步专业分层流程，允许工程师每次只选择一种分类方法。
- 让最终分层、参数试算、PDF 和 Excel 共享同一冻结来源。
- 将专业成果统一到已确认的快捷图册视觉体系，并保留可追溯的工程判断。

## Result

- 地层分层支持 `JTS/T 242-2020`、`Zhang–Tumay Fuzzy`、`Modified Robertson 2016` 和 `Schneider 2008`；每次只运行当前选择的方法。
- 更换方法会建立新的候选方案，原方案、原始测量与既有工程决定保持不变。
- 原生类别、版本化工程大类映射、低置信度复核和最终工程师确认均保留来源。
- 既有大类合并、薄层筛选、拆分、恢复合并前结构、边界编辑、撤销和最终修订流程继续工作。
- 参数结果只采用与当前分类和最终分层同源的运行；旧公式修订不会进入当前成果。
- `Ch` 与 `kh` 按 JTS 文献单位显式换算为 SI，并冻结为 `jts-t242-2020-si-v2`。
- 专业 PDF 与 Excel 按一个快照成对生成和覆盖；成果中心明确显示当前文件。
- PDF 采用共享深度轴、局部参数横轴、最终地层配色以及实际公式/参考；长工程说明会自动换行、按内容高度分页并完整保留。
- Excel 包含测量数据、分类结果、最终分层、逐深度参数、层代表值、实际公式/参考、地层图和消散试验。
- 修正真实工作流测试助手：缺失细分类时只在当前工程大类内选择代表类型；参数问题按实际可见的局部忽略、强制忽略或整项不计算选项处理。
- 修复连续导入的保存竞态：同一活动批次、同一解析操作和同一源文件可安全从“待决定草稿”继续到“新建点位”；不同批次或来源仍按修订冲突拒绝。
- 点位创建保存失败会在当前弹窗内直接说明原因、保留状态和恢复步骤；不可重试的多标签冲突不再诱导用户反复点击创建。

## Verification

- `npm.cmd run build`：通过。
- Domain fast 全量：226/226 通过；最终目标选择回执为 143/143。
- UI isolated：88/88 通过。
- Real serial：最终全量 29/30，唯一失败为已更新的规则边界文案仍使用旧断言；修正断言后同配置单 worker 1/1 通过，等价 30/30。包含连续新建点位与两套检查历史、营口完整流程及损坏/旧版 Excel 恢复。
- `npm.cmd run verify:slice -- --process 125 --mode targeted`：通过，最终回执为 `process_logs/verification/Process125-targeted.json`。
- 专业 Fuzzy → 分层 → 参数 → PDF+Excel 浏览器闭环：1/1 通过。
- PDF 长说明换行与分页回归：通过，页数增加且源行、失败原因、未满足条件和确认时间完整绘制。
- 1440×900、1920×1080：方法选择与成果页无横向溢出，console error 0、page error 0。
- 只读评审：工作流/文案 PASS、视觉 PASS、岩土方法/来源/单位 PASS。

## Evidence

- `process_logs/playwright-mcp/process125-professional-output/method-selection-1440x900.png`
- `process_logs/playwright-mcp/process125-professional-output/method-selection-1920x1080.png`
- `process_logs/playwright-mcp/process125-professional-output/output-1440x900.png`
- `process_logs/playwright-mcp/process125-professional-output/output-1920x1080.png`
- `process_logs/playwright-mcp/process125-professional-output/point-save-conflict-1440x900.png`
- `process_logs/playwright-mcp/process125-professional-output/point-save-conflict-1920x1080.png`
- `process_logs/playwright-mcp/process125-professional-output/parameter-issue-1440x900.png`
- `process_logs/playwright-mcp/process125-professional-output/parameter-issue-1920x1080.png`
- `process_logs/playwright-mcp/process125-professional-output/pdf-page-01.png`
- `process_logs/playwright-mcp/process125-professional-output/pdf-page-02.png`
- `process_logs/playwright-mcp/process125-professional-output/pdf-page-03.png`
- `process_logs/playwright-mcp/process125-professional-output/pdf-page-10.png`
- `process_logs/playwright-mcp/process125-professional-output/pdf-page-11.png`
- `process_logs/playwright-mcp/process125-professional-output/professional-a3-atlas.pdf`
- `process_logs/playwright-mcp/process125-professional-output/professional-output.xlsx`
- `process_logs/playwright-mcp/process125-professional-output/workbook-style-audit.json`
- `process_logs/playwright-mcp/process125-professional-output/flow-run.json`
- `process_logs/playwright-mcp/process125-professional-output/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process125.json`

## Known Problems

- KPB-012：真实营口三点位、失败恢复、用户可见方法与成果对象、双分辨率和三类独立评审共同覆盖工程语义。
- KPB-016：计划、知识报告、验证结果、精选证据 manifest、索引和归档由关闭门禁检查。
- KPB-017：安全局部忽略、强制忽略、整项排除和成果声明继续由参数领域与 UI 回归覆盖。
- KPB-018：专业成果页复用共享报告结构，并逐页检查说明、坐标、公式和来源。
- KPB-020：四种方法按冻结方法身份分支；参数、PDF 和 Excel 使用一致的来源和工程大类映射。
- KPB-021：长说明使用真实字体测量、动态行高、跨页布局和完整绘制断言。
- KPB-022：Ch/kh 单位换算、公式修订和旧结果过滤由领域金标准与成果闭环覆盖。

## Boundaries

- 仍为浏览器本地工作区，不新增后端、云存储或正式工程采纳。
- 不同时运行多种分类方法，不生成综合推荐。
- 不推断缺失的 CPT/CPTU 工程上下文。
- 低置信度结果仍需工程师确认；系统只生成可追溯候选与试算成果。
- Excel 实际打开后的跨软件视觉截图未作为关闭条件；工作簿结构、字体、边框、居中和列宽已通过机器审计。
