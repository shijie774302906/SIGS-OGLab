# Process132 - 快捷出图 AI 文件整理与图册解读

Date: 2026-07-27

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 在快捷出图输入页增加受控 AI 文件整理，让非标准 CSV/XLSX 可通过固定确认转换为现有快捷输入表格。
- 识别中英文同义表头与单位，排除额外列；AI 只提供结构化建议，不修改原始测量值。
- 在已生成图册中增加当前页解读，同时禁止模型把不存在的数值、土类或施工结论带入页面。

## Result

- 快捷输入和图册页面提供同一套可收起 AI 助手，复用 DeepSeek 临时连接与工程数据外发同意。
- 浏览器从用户文件建立不可变来源摘要与指纹；`depth + qc` 必须唯一有效，`fs/u2` 可选，额外列明确列为未使用。
- 支持中文与英文同义字段，例如深度、锥尖阻力、摩阻力和孔隙水压力；标准单位只按明确的 m/cm/mm 与 kPa/MPa 做等值换算。
- 每个歧义选项绑定工作表、表头行、源列、目标字段和源单位；一个字段的选择不能授权另一个字段。
- 重复目标映射、未知必需单位、表头与声明单位冲突、来源草稿过期时禁止确认导入。
- AI 草稿确认前不写入；确认后复用现有快捷工作区的一次性行替换与浏览器持久化，刷新后仍保留结果。
- 服务失败时保留文件和草稿，并在原位提供重试与手动导入，不清空当前快捷数据。
- 图册助手必须先读取当前修订和当前页。模型仅可选择解释重点；最终文字由浏览器依据冻结页面事实确定性生成，模型自由文本不会进入结果。
- 当前页解读只说明已显示内容、方法和限制，不生成新土类、设计或施工结论。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- `npm.cmd run test:assistant-server`：19/19 通过。
- `npm.cmd run test:domain-fast`：245/245 通过。
- `npm.cmd run test:ui-isolated -- --workers=1`：109/109 通过。
- `npm.cmd run test:real-serial`：32/32 通过。
- Process132 目标领域测试：6/6 通过。
- Process132 目标 UI 测试：3/3 通过。
- 领域测试覆盖中文别名、额外列、重复映射、错误单位、逐字段歧义隔离、缺失 u2 保持空值，以及虚构数值/持力层/施工建议无法进入图册解释。
- UI 测试覆盖上传、固定选择、确认导入、刷新持久化、图册解读、直接回答拒绝、503 后保留文件与重试。
- 1440×900 与 1920×1080 均已验证；确认导入动作在视口内，浏览器检查无页面错误、控制台错误或横向溢出。
- Visual、Copy/IA、Geotechnical/Data 三类只读评审最终均为 `Safe to close: Yes`，无 P0/P1。

## Evidence

- `process_logs/playwright-mcp/process132-quick-ai/input-proposal-1440x900.png`
- `process_logs/playwright-mcp/process132-quick-ai/input-proposal-1920x1080.png`
- `process_logs/playwright-mcp/process132-quick-ai/report-assistant-1440x900.png`
- `process_logs/playwright-mcp/process132-quick-ai/report-assistant-1920x1080.png`
- `process_logs/playwright-mcp/process132-quick-ai/browser-check.json`
- `process_logs/playwright-mcp/process132-quick-ai/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process132.json`
- `process_logs/reviews/Process132.md`

## Known Problems

- KPB-003：文件草稿和图册页解读均绑定来源指纹、活动修订与当前页，换文件或换页不使用旧上下文。
- KPB-004：AI 服务失败保留文件和草稿，并提供原位重试与手动导入。
- KPB-006：确认导入复用快捷工作区权威浏览器存储，刷新后数据仍存在。
- KPB-012：完整测试分层、真实规模、双分辨率和三类只读评审共同证明工程语义。
- KPB-013：默认只显示当前步骤、少量固定选择和一个固定确认动作，高级信息不争夺主工作面。
- KPB-015：不适用；AI 草稿为只读，确认时一次性替换行，没有连续编辑的异步回写。
- KPB-022：不适用；未增加文献公式或 Ch/kh 参数，只做明确的单位等值换算。
- KPB-023：缺失可选测量保持 `null`，不以 0 伪造成实测值。

## Boundaries

- AI 不修改原始文件，也不能创建、平滑、补齐或修正 qc、fs、u2 测量值。
- AI 不替代快捷图册的确定性计算，不决定正式地层或专业工程采用。
- 未知字段或单位不能依赖自然语言确认；必须通过页面提供的固定选项形成可校验的精确确认。
- 图册解读是当前页说明，不是新的解译结果或工程建议。
