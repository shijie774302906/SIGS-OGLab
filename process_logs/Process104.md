# Process104 - 分层边界拖动与原位拆分

Date: 2026-07-16

Status: `closed / implemented / verified`

## Goal

修复拖动分层边界时共享虚线没有稳定随指针移动的问题，并把合并层拆分放回右侧当前层的“调整层结构”，提供可解释的恢复来源与指定深度两种固定选择。

## Root Cause

- 边界预览深度保存在整个分层工作台文档组件中，每次 pointer move 都触发较大范围重渲染；松手时又先清除预览再异步写入修订，容易产生滞后或瞬时回跳。
- 当前层结构区只有“从中间拆分”，没有使用大类合并和手工合并已经保存的 `mergeSources`，工程师无法从正在查看的土层恢复合并前结构。
- 指定拆分缺少当前层范围、最小层厚和来源可靠性的原位说明。

## Implemented Result

- 共享虚线改为在 pointer move 时直接更新对应 overlay line，不再让整页随指针高频重渲染。
- 拖动期间保留唯一预览线；有效松手保持预览直到新修订回写，取消、丢失捕获和无效命令恢复原深度。
- 右侧“调整层结构”将“从中间拆分”改为“拆分当前层”。
- 有连续、完整且与当前外边界一致的 `mergeSources` 时，提供“恢复合并前结构（推荐）”，按来源深度、名称、工程土类和细分类重新展开。
- 恢复后的来源层统一进入待确认；缺少来源、来源重复、深度不连续或外边界已变化时，恢复选项禁用并解释原因，不做猜测。
- 所有足够厚的当前层均可输入指定深度拆分；输入受当前层范围和 0.05 m 最小间距约束。
- 恢复与指定拆分继续使用既有编辑会话，支持撤销、重做、保存失败保留和刷新恢复，原始 qc、fs、u2 不变。

## Engineering Boundaries

- “恢复合并前结构”恢复的是可证明的来源结构，不复活旧对象 ID，也不恢复无法证明的历史确认状态。
- 若合并后外边界已调整，原来源不再完整覆盖当前层，系统要求使用指定深度拆分。
- 本切片没有改变 JTS 分类、自动分层、大类合并算法、参数公式或正式采纳语义。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `174/174` passed。
- UI-isolated: `71/71` passed。
- Process104 原位拆分/刷新/拖动目标: `1/1` passed。
- Process093 共享边界回归: `1/1` passed；拖动中共享线与指针误差 `1 px`。
- Real-serial 分层大数据性能: `1/1` passed。
- Real-serial 营口真实首次 JTS 指南: `1/1` passed。
- 双视口 1440×900、1920×1080：横向溢出 `0`，右侧表单可见，console/page errors `0`。
- 完整八文件 real-serial 未记为通过：既有逐层确认大量土层的长流程超过外部命令时限；本切片直接相关的两个真实目标已独立通过。
- Knowledge gate: 9 个重要问题全部处置，1 个提示已记录。

## Evidence

- `process_logs/playwright-mcp/process104-boundary-split/specified-depth-choice-1440x900.png`
- `process_logs/playwright-mcp/process104-boundary-split/specified-depth-choice-1920x1080.png`
- `process_logs/playwright-mcp/process104-boundary-split/restore-merge-choice-1440x900.png`
- `process_logs/playwright-mcp/process104-boundary-split/restore-merge-choice-1920x1080.png`
- `process_logs/playwright-mcp/process104-boundary-split/browser-check.json`
- `process_logs/playwright-mcp/process104-boundary-split/evidence-manifest.json`
- `process_logs/verification/Process104-final.json`
- `process_logs/knowledge-reviews/Process104.json`

## Known Problems

- Covered: KPB-002, KPB-003, KPB-004, KPB-006, KPB-007, KPB-008, KPB-011, KPB-012, KPB-013, KPB-015。

## Closure Checklist

- [x] 拖动中共享虚线实时跟随，取消恢复，松手提交。
- [x] 当前层结构区提供恢复合并前结构与指定深度拆分。
- [x] 不可靠来源禁用并解释，恢复结果逐层待确认。
- [x] 撤销、重做、刷新和原始数据不变已验证。
- [x] Build、领域、UI、相关真实目标、双视口和知识门禁通过。
