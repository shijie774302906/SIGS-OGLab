# Process099 - 受约束的分层简化向导

Date: 2026-07-15

Status: `closed / implemented / verified / independently reviewed`

## Goal

让工程师从一个入口选择“按目标层数简化”或“按薄层厚度筛选”，用软目标快速整理密集分层，同时保留关键边界、完整工程理由和高级手动控制。

## Implemented Result

- 新增单一“整理分层”入口，第一步明确二选一：推荐的目标层数简化，或既有的手动薄层筛选。
- 目标层数为软目标；界面同时给出系统建议目标和根据受保护边界推导的自动方案下限，不承诺机械达到用户输入值。
- 自动方案只逐次合并相邻层，并在每一步重新汇总 qc、fs、u2 与最终土类证据；高一致性候选自动纳入，需复核候选默认保留。
- 砂土/黏性土严重冲突、锁定边界、重要层、数据不足和曲线冲突均受保护；无法达到目标时展示停止原因与可继续的高级手动入口。
- 预览将当前候选、深度范围、三条共轴曲线、判断理由和纳入/移出操作放在同一工作面；受保护边界默认折叠。
- 应用使用权威当前方案与测量证据重新计算并校验签名，不接受调用方伪造步骤；一次应用形成一个撤销单元。
- 合并继承较厚层土类并记录来源层、原土类、可用通道统计、置信度、理由和风险；更改土组时不再保留不相容的旧详细土类。
- 原始 qc、fs、u2 行和 JTS 行级证据保持不变；撤销、重做和刷新恢复保持方案与审计一致。

## Engineering Conclusions And Boundaries

- 软目标和自动方案下限是整理建议，不是正式工程层数承诺；严重冲突不会为了凑层数而被自动跨越。
- 自动判断采用确定性相邻合并代价和稳健通道统计；相同输入产生相同计划。
- 缺失 u2 不补零，也不伪造曲线证据；有效 qc/fs 仍可用于受约束判断，缺失通道会进入理由记录。
- 测点按半开区间分配，只有最终层包含终点，避免边界测点重复归属。
- 高级手动仍允许工程师跨越保护边界，但要求固定理由和二次确认；专业采纳责任仍由工程师承担。
- 本切片不修改上游数据检查、不引入后端、不改变正式采纳或生产持久化边界。

## Verification

- Final slice verifier: `62/62` specs selected and passed.
- Domain-fast: `165/165` passed, including 12 layer-simplification domain cases.
- UI-isolated: `70/70` passed.
- Real-serial: `29/29` passed; full Yingkou workflow passed with 4,282 source rows.
- Build passed; only the existing bundle-size advisory remains.
- Knowledge gate passed: 9 important matches covered/not-applicable and 1 advisory covered.
- Real Yingkou simplification analysis: 268 ms in the curated browser check.
- Double viewport: 1440x900 and 1920x1080; no horizontal overflow, shared-axis error 0, main action visible and browser/page error list empty.

## Independent Review

- Visual Layout: PASS; P0/P1 none.
- Geotechnical Flow: PASS after three review rounds; P0/P1/P2 none.
- Copy / IA / Performance: PASS; P0/P1 none.

## Evidence

- `process_logs/playwright-mcp/process099-layer-simplification/method-choice-1440x900.png`
- `process_logs/playwright-mcp/process099-layer-simplification/method-choice-1920x1080.png`
- `process_logs/playwright-mcp/process099-layer-simplification/target-config-1440x900.png`
- `process_logs/playwright-mcp/process099-layer-simplification/target-config-1920x1080.png`
- `process_logs/playwright-mcp/process099-layer-simplification/target-preview-1440x900.png`
- `process_logs/playwright-mcp/process099-layer-simplification/target-preview-1920x1080.png`
- `process_logs/playwright-mcp/process099-layer-simplification/browser-check.json`
- `process_logs/playwright-mcp/process099-layer-simplification/evidence-manifest.json`
- `process_logs/verification/Process099-targeted.json`
- `process_logs/knowledge-reviews/Process099.json`
- `process_logs/closure-drafts/Process099.json`

## Known Problems

- Covered: KPB-001, KPB-004, KPB-006, KPB-007, KPB-008, KPB-009, KPB-012, KPB-013, KPB-015.
- Not applicable: KPB-011, because this slice does not own upstream data repair and never mutates raw measurements.

## Closure Checklist

- [x] Final title, outcome, engineering rules and boundaries confirmed.
- [x] Full domain, UI and real-data verification passed on final code.
- [x] Three independent read-only reviews passed with no open P0/P1.
- [x] Curated evidence proves the user action, engineering evidence and recovery semantics.
- [x] Knowledge dispositions are explicit.
- [x] Closure dry-run passed without mutating formal records.
- [x] Final evidence manifest is current and audited.
- [x] Strict closure doctor passes.
