# Process131 - AI 导入保存检查与同名重导恢复

Date: 2026-07-26

Status: `closed / implemented / verified / independently reviewed`

## Goal

- 修复 AI 整理完成后，删除过的同名点位重新导入时触发保存检查失败的问题。
- 保留严格原子保存，不绕过项目内部记录校验。
- 让保存失败说明具体对象、原因、影响和下一步，并保留 AI 草稿。

## Diagnosis

- 真实 SCPT1 工作簿在确定性的 AI 草稿映射下完成验证：3 个工作表，Sheet1 第 9 行表头，7,832 行测量数据，qc 源单位为 MPa，fs、u2 为 kPa；在线模型自行识别这些字段的稳定性不在本切片验收范围。
- 根因不是文件大小、token、qc、fs 或 u2 数值。
- 被删除的点位与同名重新导入的新点位复用了同一个内部 `pointId`；严格保存检查为避免覆盖删除历史而拒绝写入。
- 原页面只显示“当前项目状态未通过保存检查”，没有说明是哪两条记录没有对上。

## Result

- 同名重新导入会分配新的系统内部编号；旧删除快照、来源证据和历史执行记录继续保留。
- 校验器允许历史执行引用已删除点位，但仍拒绝活动点位与删除记录重复、缺失数据块、孤立草稿或半份引用。
- 保存错误改为“项目内部记录没有对上”等普通语言，并明确说明这不是 qc、fs、u2 工程数值检查。
- AI 草稿在保存失败后保持可见；普通写入失败可直接再次确认且不重复调用 AI。
- 多标签版本冲突不会盲目重试，右侧先引导用户处理上方保存说明。
- 页面保存提示进入正常文档流，不遮挡五步工作流；非配额错误不展示容量。
- 分层共享虚线移除额外像素位移，继续严格贴合真实土层接缝。

## Verification

- `npm.cmd run build`：通过；仅保留既有大 chunk 提示。
- `domain-fast`：239/239 通过。
- `ui-isolated`：106/106 通过。
- `real-serial`：32/32 通过。
- Process131 目标回归：7/7 通过。
- 验收包含保存失败恢复和真实规模 SCPT1 流程，不以按钮状态代替工程语义。
- 真实 SCPT1：3 个工作表；Sheet1 共 7,841 行，第 9 行为深度/qc/fs/u2 表头，qc 源单位为 MPa、fs/u2 为 kPa；7,832 条测量行写入 `manifest-v3-primary` 后从 IndexedDB 重载并再次校验通过。
- 首/中/末代表值在标准化与重载后完全一致：0.01 m / 20 kPa / 0.3 kPa / -2.2 kPa；49.97 m / 36,780 kPa / 828.2 kPa / 83.3 kPa；100.30 m / 11,610 kPa / 659.3 kPa / -147.9 kPa。
- 同名重导：新活动点位和旧删除快照的 `pointId` 不同，来源指纹与 7,832 行数据保持一致。
- 1440×900、1920×1080：普通写入失败与多标签冲突均无页面或右侧工具横向溢出；普通失败可直接再次确认并在刷新后重载，恢复前后 AI 调用次数不变。
- Visual、Copy/IA、Geotechnical/Data 三类只读评审均为 `Safe to close: Yes`，无 P0/P1。
- 知识门禁：KPB-004、KPB-006、KPB-012 全部 covered。

## Evidence

- `process_logs/playwright-mcp/process131-import-integrity/save-recovery-1440x900.png`
- `process_logs/playwright-mcp/process131-import-integrity/save-recovery-1920x1080.png`
- `process_logs/playwright-mcp/process131-import-integrity/conflict-recovery-1440x900.png`
- `process_logs/playwright-mcp/process131-import-integrity/conflict-recovery-1920x1080.png`
- `process_logs/playwright-mcp/process131-import-integrity/browser-check.json`
- `process_logs/playwright-mcp/process131-import-integrity/conflict-browser-check.json`
- `process_logs/playwright-mcp/process131-import-integrity/evidence-manifest.json`
- `process_logs/knowledge-reviews/Process131.json`
- `process_logs/reviews/Process131.md`

## Known Problems

- KPB-004：失败原因、影响、责任位置、冲突处理和普通重试均有明确入口。
- KPB-006：保存仍作用于权威 IndexedDB；真实重载证明没有绕过严格校验。
- KPB-011：失败留在数据导入责任页，保留原文件和 AI 草稿并续接确认。
- KPB-012：真实 SCPT1 行数、来源指纹、新旧身份、双分辨率和三层回归共同证明工程语义。

## Boundaries

- “完整性校验”只检查项目内部记录能否一一对应，不判断 qc、fs、u2 是否工程合理。
- AI 仍只生成待确认草稿；原文件和现有工作数据不会被静默修改。
- 同名重导不会删除旧历史，也不会放宽原子保存或多标签版本控制。
