# Process101 - 分层归并复核语义与极端规模硬化

Date: 2026-07-15

Status: `closed / implemented / verified / independently reviewed`

## Goal

把 Process100 的单一“需复核”状态拆成工程师可理解、可追溯的原因；在不改变相邻同大类归并规则、不修改原始测量的前提下，补齐旧记录兼容、参数门禁、极薄层定位和 200/500 层确定性与性能证据。

## Selected Design

- 三位评委分别从工程语义、交互清晰度、可维护性、可测试性和交付风险评分。
- 方案 B“类型化复核原因集合”以 `283/300` 最高分胜出；A 为 `209/300`，C 为 `224/300` 且因迁移与原子恢复风险被否决。
- 新记录以 `reviewReasons[]` 为唯一权威来源：`source-soil-confirmation`、`source-evidence`、`curve-difference`；`legacy-untyped` 只用于无法可靠恢复原因的旧记录。

## Implemented Result

- 来源土类、来源证据、曲线差异分别保存、稳定排序和去重；`requiresReview` 由原因集合派生，不再作为新写入的独立真相。
- 旧 `majorGroupComposition` 没有类型化原因时，所有旧布尔和汇总状态统一恢复为“历史复核原因未分型”，系统不会猜测为来源证据或曲线差异。
- 权威空数组明确表示原因已清除，即使异常旧布尔残留也不会重新开启参数门禁；五类单项、组合和 JSON 重载真值表均已冻结。
- 展开依据显示来源层的具体深度范围；超过两层时显示前两层和剩余数量，并提示结合 qc、fs、u2 复核。
- 当前结果层在选择和展开依据后自动滚入列表可见区；1440×900 不再出现“证据属于第二层但列表只看见第一层”的错位。
- 0.14 m 结果层继续按真实深度比例绘制，另加不参与比例换算的 4 px 定位符；共轴几何不变。
- 200/500 层测试同时记录耗时、结果层数、原因数和稳定 SHA-256；500 层两次分析约 `151.75 / 151.10 ms`，低于 `1500 ms` 预算。

## Engineering Conclusions And Boundaries

- “曲线差异提示（规则阈值）”只是原型审计提示，不是正式工程判据，也不阻止相邻同大类归并；归并后的复核责任仍由工程师承担。
- 不同大类、未确认大类和工程师锁定边界仍不会被自动跨越。
- 旧记录证据不足时宁可标记“历史未分型”，不会推断成更具体的工程原因。
- 任一未解决的类型化或旧版复核原因都关闭参数解译入口；只有工程师明确清除后才允许继续。
- 本切片不修改原始 qc、fs、u2，不引入正式工程阈值、后端、正式采纳或导出能力。

## Verification

- Build: passed；仅保留既有 bundle-size advisory。
- Domain-fast: `170/170` passed。
- UI-isolated: `70/70` passed。
- Real-serial: `29/29` passed；营口完整工作流 `10.2 min`。
- 营口目标证据：`4,282` 行，`67 → 19` 层，合并 `48` 处边界、保留 `18` 处，预览分析 `91 ms`。
- 双视口：1440×900、1920×1080；横向溢出 `0`，共轴上下误差 `0`，当前结果层和主操作可见，浏览器错误为空。
- 极薄层：60.62–60.76 m，真实 SVG 高度 `1.346 px`，独立定位符 `4 px`。
- 压力测试：200 层 `24.72 / 16.69 ms`；500 层 `151.75 / 151.10 ms`；两者均记录稳定 SHA-256。
- Knowledge gate: 6 个重要问题已处置，1 个提示已记录。

## Independent Review

- Visual Layout: PASS，P0/P1/P2 均为 0。
- Geotechnical Flow: PASS，P0/P1 为 0；P2 仅建议未来把异常人工构造的旧布尔状态统一到一个有效复核 selector。
- Copy / IA / Performance: PASS，P0/P1 为 0；P2 仅为高密度显示和措辞精修。

## Evidence

- `process_logs/playwright-mcp/process101-review-semantics/method-choice-1440x900.png`
- `process_logs/playwright-mcp/process101-review-semantics/method-choice-1920x1080.png`
- `process_logs/playwright-mcp/process101-review-semantics/review-reasons-1440x900.png`
- `process_logs/playwright-mcp/process101-review-semantics/review-reasons-1920x1080.png`
- `process_logs/playwright-mcp/process101-review-semantics/thin-layer-locator-1440x900.png`
- `process_logs/playwright-mcp/process101-review-semantics/thin-layer-locator-1920x1080.png`
- `process_logs/playwright-mcp/process101-review-semantics/browser-check.json`
- `process_logs/playwright-mcp/process101-review-semantics/stress-check.json`
- `process_logs/playwright-mcp/process101-review-semantics/evidence-manifest.json`
- `process_logs/verification/Process101-final.json`
- `process_logs/solution-reviews/Process101.json`
- `process_logs/reviews/Process101.json`
- `process_logs/knowledge-reviews/Process101.json`
- `process_logs/closure-drafts/Process101.json`

## Known Problems

- Covered: KPB-001, KPB-004, KPB-006, KPB-007, KPB-008, KPB-012, KPB-013, KPB-014, KPB-016。
- Not applicable: KPB-011；本切片消费已检查数据，不拥有上游数据修复，原始测量保持不变。

## Residual P2

- 后续可把门禁、待确认队列和 UI 统一到一个“有效复核状态”selector，消除仅在人工构造字段漂移时可能出现的显示差异。
- 高密度弹窗未来可增加列表最小两行高度；当前活动行自动定位已保证工程证据不会错认。
- “这不是正式工程判据”未来可简化为“仅作提示，不能作为工程判定依据”，不影响当前安全边界。

## Closure Checklist

- [x] 最高分方案及否决条件有可追溯记录。
- [x] 最终实现完成并通过 build、全量三层 Playwright 和真实营口流程。
- [x] 双视口、共轴、极薄层、溢出、浏览器错误和 200/500 层收据均已验证。
- [x] 三位独立评委复判 PASS，无开放 P0/P1。
- [x] 知识库处置和双向链接已更新。
- [x] 最终 evidence manifest 已绑定归档、实现、测试和验证命令。
- [x] 严格关闭 doctor 通过。
