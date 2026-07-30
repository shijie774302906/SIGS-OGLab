# Process129 - AI 导入 CSV 鲁棒性与 V4-Pro

Date: 2026-07-25

Status: `closed / implemented / verified`

## Goal

- 不再要求用户提供真实工程文件；用五类固定种子的约 100 行 CSV 验证 AI 导入整理。
- 修复制表符、分号、BOM、前置说明、表头乱序和字段别名导致的错误识别。
- 确保网页与真实服务使用 `deepseek-v4-pro`，并把无效 AI 操作转换成用户能理解、能恢复的选择。

## Result

- 新增共享定界文本解析器，统一供普通导入和 AI 来源读取使用；支持逗号、制表符、分号、UTF-8 BOM、UTF-16、GB18030 回退、前置说明与表头证据评分。
- 新增固定种子 `process129-csv-20260725` 的五类生成器，每类包含 100 行 CPTU 数据：表头乱序、BOM 与前置说明、制表符、分号、别名与单位混排。
- 五类文件均能定位唯一 Depth、qc、fs、u2 映射；源单元格、待确认草稿和确认后标准化数据逐项一致，没有补值、插值、删行或默认测量值修改。
- 导入页只向 DeepSeek 暴露三个导入工具；模型返回其他页面工具或普通说明时，页面提供“重试”和“手动映射或换文件”，原始文件与当前草稿保持不变。
- `.env.local`、默认配置、实际配置测试和真实最小连通性验证均使用 `deepseek-v4-pro`；修复了只改代码默认值、却被本地环境继续覆盖为旧模型的问题。
- 保留 Process128 已有的高级人工授权测量值修改路径；本轮默认生成测试不触发该路径。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- Assistant server：15/15 通过；包含加载实际 `.env.local` 后的最终 V4-Pro 身份和导入工具隔离。
- DeepSeek 最小真实连通性：通过；返回 `connected=true`、`model=deepseek-v4-pro`，只发送虚构 `CPT-SMOKE` 摘要。
- Test tier audit：72 个 spec 唯一归属；domain-fast 34、ui-isolated 28、real-serial 10。
- Domain fast：238/238 通过。
- UI isolated：105/105 通过；导入助手专项 7/7 通过。
- Real serial：31/31 通过；包括真实营口 4,282 行工作簿和完整工作流。
- Process129 目标流程：5/5 生成 CSV 成功；每份 100 行、0 个 AI 测量值覆盖。
- 1440×900、1920×1080：文档与右侧功能坞水平溢出为 0，console/page error 为 0。
- Process129 最终 manifest 审计有效；全局 evidence lifecycle 审计另记录 Process111/117/120 历史精选证据已被后续运行覆盖，本轮未改写或伪造这些历史证据。

## Evidence

- `process_logs/playwright-mcp/process129-import-csv/five-layout-cleanup-1440x900.png`
- `process_logs/playwright-mcp/process129-import-csv/confirmed-import-1920x1080.png`
- `process_logs/playwright-mcp/process129-import-csv/browser-check.json`
- `process_logs/playwright-mcp/process129-import-csv/input/05-别名与单位混排.csv`
- `process_logs/playwright-mcp/process129-import-csv/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process129.json`

## Known Problems

- KPB-004：AI 无法生成导入草稿时说明当前未修改原始文件，并提供重试、手动映射或换文件。
- KPB-006：最终确认继续复用既有 CAS 持久化边界；保存冲突保留来源和待确认草稿。
- KPB-008：待确认状态只有一个“确认并导入”主操作；取消和手动返回不会产生并行提交入口。
- KPB-011：无法整理时回到导入责任工具，源单元格和既有标准化数据不被静默改写。
- KPB-012：五类 100 行确定性数据、真实营口串行层、双分辨率截图和数值逐项断言共同证明语义。
- KPB-016：计划、知识报告、关闭记录、测试命令和双分辨率证据由最终 manifest 绑定。
- KPB-024：运行配置测试覆盖真实本地环境覆盖值，避免默认模型升级后页面仍使用旧模型。

## Boundaries

- 生成 CSV 只用于测试，不代表真实场地或工程结论。
- 默认 AI 整理只处理结构、表头、字段、单位和分隔符，不修改测量值。
- 原始上传文件始终保留；确认后仍由确定性数据检查负责工程质量判断。
- 当前只实现 DeepSeek，不扩展其他模型供应商或任意文件写入。
