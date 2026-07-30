# Process100 - 按工程土类大类归并相邻层

Date: 2026-07-15

Status: `closed / implemented / verified / independently reviewed`

## Goal

用“按工程土类大类归并”替代错误的目标层数简化：只归并相邻且同属砂性土、混合土或黏性土的连续层，同时保留工程师指定边界、来源细类组成、曲线差异审计和人工复核责任。

## Implemented Result

- “整理分层”保留两个明确入口：按土类大类合并，以及按薄层厚度逐项筛选；已移除目标层数、建议目标和自动下限。
- 大类方法直接生成完整预览，展示整理前后层数、合并/保留边界、qc/fs/u2 共轴曲线和全部结果层；一次应用形成一个撤销单元。
- 只归并相邻且最终工程大类相同的连续层；不同大类、未确认大类和工程师勾选“按大类合并时保留此边界”的位置不会跨越。
- 结果名称使用“大类（组成：细类、细类）”；组成按深度顺序去重保存，但不写入正式细类字段，也不参与参数适用性。
- qc/fs/u2 差异不阻止同大类归并，但来源待确认或任一被移除边界存在通道差异时，结果层继续保持“需复核”，并提供逐深度、逐通道审计。
- 工程师覆盖 JTS 大类后，与最终大类不一致的旧建议细类不会进入组成说明。
- 应用前根据当前权威方案和测量证据重新计算签名；陈旧预览被原子拒绝，不产生部分归并。
- 应用、撤销、重做和刷新保持结果层、组成、复核状态与审计一致；原始 qc/fs/u2 和 JTS 行级证据不修改。

## Engineering Conclusions And Boundaries

- “允许归并”不等于“工程判断已接受”。归并只整理相邻同大类结构，待确认与曲线差异仍由工程师复核。
- 组成说明不是新的复合土类；正式工程分组仍为单一大类，代表细类只能由工程师在高级编辑中选择。
- qc/fs/u2 的相对中位数差异是当前原型审计提示，不是正式工程突变判据，也不用于阻止同大类归并。
- 上游数据问题仍由数据检查指南负责；本切片不修复、不删除或静默改写测量行。
- 不新增后端、正式采纳、生产持久化或导出能力。

## Verification

- Build passed; only the existing bundle-size advisory remains.
- Domain-fast: `165/165` passed, including `12/12` major-group cases.
- UI-isolated: `70/70` passed.
- Real-serial: `29/29` passed; the complete Yingkou lifecycle passed with 4,282 source rows.
- Final slice verifier: `50/62` impacted specs selected and passed (`18` domain specs, all `24` UI specs, all `8` real specs).
- Real Yingkou preview: `67 -> 19` layers, `48` merged boundaries, `18` retained boundaries, analysis `107 ms`.
- Double viewport: 1440x900 and 1920x1080; horizontal overflow `0`, shared-axis top/bottom error `0`, action visible, browser/page errors empty.
- Knowledge gate passed: 8 important matches disposed and 1 advisory recorded.

## Independent Review

- Visual Layout: PASS after final regression; P0/P1 none.
- Geotechnical Flow: PASS after review-state and incompatible-JTS-detail fixes; P0/P1 none.
- Copy / IA / Performance: PASS after old-target and duplicate-copy removal; P0/P1 none.

## Evidence

- `process_logs/playwright-mcp/process100-major-group-merge/method-choice-1440x900.png`
- `process_logs/playwright-mcp/process100-major-group-merge/method-choice-1920x1080.png`
- `process_logs/playwright-mcp/process100-major-group-merge/major-group-preview-1440x900.png`
- `process_logs/playwright-mcp/process100-major-group-merge/major-group-preview-1920x1080.png`
- `process_logs/playwright-mcp/process100-major-group-merge/browser-check.json`
- `process_logs/playwright-mcp/process100-major-group-merge/evidence-manifest.json`
- `process_logs/verification/Process100-targeted.json`
- `process_logs/knowledge-reviews/Process100.json`
- `process_logs/closure-drafts/Process100.json`

## Known Problems

- Covered: KPB-001, KPB-003, KPB-004, KPB-006, KPB-007, KPB-012, KPB-013, KPB-015.
- Not applicable: KPB-011, because the feature consumes checked stratification evidence and does not own upstream data repair.

## Residual P2

- Future work may separate ordinary source confirmation from curve-evidence review into distinct user-facing problem types.
- Future work may rename threshold-based “曲线突变” to the weaker “曲线差异提示（规则阈值）”.
- Extremely thin result layers may benefit from a non-distorting 3–4 px locator marker or local zoom.
- A deterministic 200/500-layer stress case would characterize scaling beyond the current real 67-layer hole.

## Closure Checklist

- [x] Final outcome and engineering boundaries confirmed.
- [x] Full domain, UI and real-data verification passed on final implementation.
- [x] Three independent read-only reviews passed with no open P0/P1.
- [x] Curated evidence proves the user action, engineering evidence and review semantics.
- [x] Knowledge dispositions are explicit and bidirectional links updated.
- [x] Closure dry-run passed without mutating formal records.
- [x] Final evidence manifest is current and audited.
- [x] Strict closure doctor passes.
