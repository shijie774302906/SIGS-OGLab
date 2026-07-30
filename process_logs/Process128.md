# Process128 - DeepSeek 辅助数据整理与受控导入

Date: 2026-07-25

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 在专业模式的数据导入阶段，让用户把结构不规范的 CSV 或 Excel 交给 DeepSeek 整理。
- AI 只形成可追溯的新导入草稿；用户查看、确认后，才由现有确定性导入管线原子写入并进入数据检查。

## Result

- 默认模型切换为 `deepseek-v4-pro`，服务端新增仅限导入场景的白名单工具和严格 schema。
- AI 可识别工作表、表头、字段、单位及常见格式问题，一次只提出一个结构化问题，并提供推荐选项和安全的手动返回。
- 原始附件、来源指纹、源行和源单元格永久保留；AI 建议与原始证据分离，旧来源、迟到响应和无效 schema 均不能提交。
- 测量值修改默认禁止。工程师显式授权后，仍必须逐项查看原值、新值、理由和源行，并在最终确认时写入真实确认时间。
- 整理结果提供摘要、预览和清理后 CSV 下载；中心旧操作在 AI 草稿待确认时移除，只保留一个“确认并导入”主操作。
- 缺失的可选 u2 在预览、CSV 和重新导入链路中保持空白，不会被默认值伪造成实测 0。
- 最终提交复用既有字段映射、单位换算、点位拆分、标准化和浏览器本地原子持久化；失败保留原始来源和待确认草稿。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- Assistant server：14/14 通过；覆盖 v4-pro、导入工具隔离、schema、错误和临时 Key。
- Test tier audit：72 个 spec 唯一归属；domain-fast 34、ui-isolated 28、real-serial 10。
- Domain fast：237/237 通过。
- UI isolated：103/103 通过。
- Real serial：31/31 通过（约 6.7 分钟）；包括真实营口 `CPT09数据.xlsx`、4,282 行、3 个工作表、表头第 9 行和原有三点营口工作流。
- AI 导入专项证据：6/6 通过；覆盖结构化提问、测量值复核、下载、确认、刷新持久化、迟到响应、版本冲突和双分辨率布局。
- 1440×900、1920×1080：文档、右侧功能坞和预览水平溢出均为 0，console/page error 为 0。
- Visual、Geotechnical/Security、Copy/IA 三类只读复查均为 PASS，P0/P1 为 0。

## Evidence

- `process_logs/playwright-mcp/process128-import-assistant/cleanup-review-1440x900.png`
- `process_logs/playwright-mcp/process128-import-assistant/confirmed-import-1920x1080.png`
- `process_logs/playwright-mcp/process128-import-assistant/value-edit-preview-1440x900.png`
- `process_logs/playwright-mcp/process128-import-assistant/value-edit-preview-1920x1080.png`
- `process_logs/playwright-mcp/process128-import-assistant/yingkou-real-cleanup-1920x1080.png`
- `process_logs/playwright-mcp/process128-import-assistant/browser-check.json`
- `process_logs/playwright-mcp/process128-import-assistant/preview-browser-check.json`
- `process_logs/playwright-mcp/process128-import-assistant/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process128.json`

## Known Problems

- KPB-002：真实上传后才启动整理，运行、禁用、成功和失败恢复状态均有专项验证。
- KPB-003：来源修订、字段/单位选择或操作身份变化会使旧建议失效，迟到响应不能写回。
- KPB-004：取消、超时、手动返回、保存冲突和重试均说明影响并在原位恢复。
- KPB-005：使用真实项目/点位身份；并发版本冲突不会产生半提交草稿或数据块。
- KPB-006：AI 临时会话不进入 IndexedDB 权威存储；最终确认复用现有 CAS 持久化边界。
- KPB-007：真实营口 4,282 行、3 个工作表工作簿进入整理、确认和既有导入管线，完整串行层通过。
- KPB-008：开始、追问、返回、修改和完成路径只到达一个“确认并导入”主操作。
- KPB-011：无法确定时回到字段/单位责任工具，原始测量和既有草稿保持不变。
- KPB-012：双分辨率、浏览器机器断言、真实营口工作簿和三类独立评审共同证明工程语义。
- KPB-023：缺失 u2 在整理后文件中保持空白；已有真实零值仍按源值保留。
- KPB-022：不适用。本切片不新增、修改或采用工程公式，仅使用现有导入单位换算。

## Boundaries

- 当前只实现 DeepSeek，不实现第二家模型供应商。
- AI 不直接写 IndexedDB、项目清单、数据块或用户原始文件，也不生成工程公式、土类、分层和参数结论。
- 只有用户显式授权并完成变更复核后，测量值修改建议才可能进入待确认草稿。
- 最终工程数据检查仍由既有确定性流程负责；AI 整理不等于数据已检查或工程结论已采纳。
